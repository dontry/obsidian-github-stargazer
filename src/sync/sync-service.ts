import { Notice } from "obsidian";
import type { App } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { SyncStateStore } from "@/storage/sync-state-store";
import { GitHubGraphQLClient } from "@/sync/github-client";
import { RateLimiter } from "@/sync/rate-limiter";
import { SyncChangeDetector } from "@/sync/sync-change-detector";
import { SyncCheckpointHandler } from "@/sync/sync-checkpoint-handler";
import { SyncResumeHandler } from "@/sync/sync-resume";
import { SyncPageFetcher } from "@/sync/sync-page-fetcher";
import type { Repository, SyncCheckpoint } from "@/types";
import { checkDiskSpace } from "@/utils/disk-check";
import { ERROR_MESSAGES } from "@/utils/constants";
import { info, error } from "@/utils/logger";

/**
 * Sync service for managing GitHub starred repositories synchronization
 *
 * Orchestrates the full sync workflow including initial sync, incremental sync,
 * rate limiting, error handling, and progress tracking.
 */
export class SyncService {
	private githubClient: GitHubGraphQLClient;
	private rateLimiter: RateLimiter;
	private repositoryStore: RepositoryStore;
	private syncStateStore: SyncStateStore;
	private checkpointHandler: SyncCheckpointHandler;
	private resumeHandler: SyncResumeHandler;
	private pageFetcher: SyncPageFetcher;
	private changeDetector: SyncChangeDetector;
	private app: App;

	constructor(
		app: App,
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
	) {
		this.app = app;
		this.githubClient = new GitHubGraphQLClient(githubToken);
		this.rateLimiter = new RateLimiter();
		this.repositoryStore = repositoryStore;
		this.syncStateStore = syncStateStore;
		this.checkpointHandler = new SyncCheckpointHandler(
			app,
			repositoryStore,
		);
		this.pageFetcher = new SyncPageFetcher(
			this.githubClient,
			this.rateLimiter,
			syncStateStore,
		);
		this.changeDetector = new SyncChangeDetector();
		this.resumeHandler = new SyncResumeHandler(
			app,
			this.githubClient,
			this.rateLimiter,
			this.checkpointHandler,
			syncStateStore,
		);
	}

	/**
	 * Perform initial sync - fetch all starred repositories
	 * Enhanced with checkpoint support (T023, T026, T027, T028, T029, T030)
	 */
	async performInitialSync(): Promise<Repository[]> {
		let currentCheckpoint: SyncCheckpoint | null = null;

		try {
			// Check disk space before sync
			const hasDiskSpace = await checkDiskSpace(this.app);
			if (!hasDiskSpace) {
				throw new Error(ERROR_MESSAGES.INSUFFICIENT_DISK_SPACE);
			}

			await this.syncStateStore.markSyncStarted();
			info("Sync started"); // Lifecycle logging

			new Notice("Starting GitHub starred repositories sync...");

			// Fetch total count at start
			const totalCount = await this.githubClient.fetchTotalCount();
			info("Fetched total starred repositories count", {
				totalCount,
			});

			// Create initial checkpoint
			currentCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount,
				fetchedCount: 0,
				timestamp: new Date().toISOString(),
				status: "in_progress",
				sessionId: crypto.randomUUID(),
			};
			await this.checkpointHandler.syncCheckpoint(currentCheckpoint);

			// Fetch all pages of repositories
			const repositories = await this.pageFetcher.fetchAllPages(
				null,
				totalCount,
				async (pageRepos, cursor) => {
					// Convert repositories to final storage incrementally
					await this.checkpointHandler.convertIncremental(pageRepos);

					// Update checkpoint after each page
					return await this.checkpointHandler.updateCheckpoint(
						currentCheckpoint!,
						pageRepos,
						cursor,
					);
				},
				false, // Not resuming
			);

			// Delete checkpoint on sync completion
			await this.checkpointHandler.deleteCheckpoint();
			info("Checkpoint deleted - sync complete");

			// Mark sync as completed
			await this.syncStateStore.markSyncCompleted(repositories.length);
			info("Sync completed", {
				totalRepositories: repositories.length,
			});

			new Notice(`Successfully synced ${repositories.length} repositories!`);
			return repositories;
		} catch (err) {
			// Error logging without sensitive data
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error";
			error("Sync failed", {
				error: errorMessage,
				fetchedCount: currentCheckpoint?.fetchedCount || 0,
			}); // No tokens, no full payloads

			await this.syncStateStore.markSyncFailed(errorMessage);
			new Notice(`Sync failed: ${errorMessage}`);
			throw err;
		}
	}

	/**
	 * Perform incremental sync - only sync updated repositories
	 */
	async performIncrementalSync(): Promise<{
		added: Repository[];
		updated: Repository[];
		removed: string[];
	}> {
		try {
			await this.syncStateStore.markSyncStarted();
			new Notice("Starting incremental sync...");

			// Load existing repositories
			const existingData = await this.repositoryStore.loadRepositories();
			const existingRepos = new Map(
				existingData.repositories.map((r) => [r.id, r]),
			);

			// Fetch current starred repositories
			const currentRepos = await this.performInitialSync();

			// Detect changes
			const changes = this.changeDetector.detectChanges(
				existingRepos,
				currentRepos,
			);

			// Process new and updated repositories
			await this.repositoryStore.addRepositories([
				...changes.added,
				...changes.updated,
			]);

			// Mark removed repositories as unstarred
			for (const removedId of changes.removed) {
				await this.repositoryStore.markAsUnstarred(removedId);
			}

			const message = `Incremental sync: +${changes.added.length} ~${changes.updated.length} -${changes.removed.length}`;
			new Notice(message);

			return changes;
		} catch (err) {
			const errorMessage =
				err instanceof Error ? err.message : "Unknown error";
			await this.syncStateStore.markSyncFailed(errorMessage);
			new Notice(`Incremental sync failed: ${errorMessage}`);
			throw err;
		}
	}

	/**
	 * Sync with resume capability
	 * Checks for existing checkpoint and offers resume option
	 */
	async syncWithResume(): Promise<Repository[]> {
		// Load existing checkpoint
		const checkpoint =
			await this.checkpointHandler.loadCheckpointIfExists();

		if (checkpoint) {
			// Show confirmation modal
			const { resume } =
				await this.resumeHandler.showResumeConfirmation(checkpoint);

			if (resume) {
				// Resume from checkpoint
				return await this.resumeHandler.performResumeSync(
					checkpoint,
				);
			} else {
				// User chose fresh sync
				return await this.syncFresh();
			}
		}

		// No checkpoint, perform normal sync
		return await this.performInitialSync();
	}

	/**
	 * Start fresh sync, ignoring checkpoint
	 * Deletes checkpoint and starts new sync
	 */
	private async syncFresh(): Promise<Repository[]> {
		try {
			// Delete existing checkpoint
			await this.checkpointHandler.deleteCheckpoint();
			info("Checkpoint deleted - starting fresh sync");

			// Perform fresh initial sync
			return await this.performInitialSync();
		} catch (err) {
			error("Failed to start fresh sync", err);
			throw err;
		}
	}
}
