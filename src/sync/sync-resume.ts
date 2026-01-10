import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { SyncStateStore } from "@/storage/sync-state-store";
import type { GitHubGraphQLClient } from "@/sync/github-client";
import type { GetStarredRepositoriesResponse } from "@/sync/graphql-queries";
import type { RateLimiter } from "@/sync/rate-limiter";
import type { SyncCheckpointHandler } from "@/sync/sync-checkpoint-handler";
import type { Repository, SyncCheckpoint } from "@/types";
import { ResumeConfirmationModal } from "@/ui/checkpoint-modal";
import { DEFAULT_PAGE_SIZE } from "@/utils/constants";
import { error, info } from "@/utils/logger";

/**
 * Resume sync workflow from checkpoint
 *
 * Handles the resume sync process including user confirmation
 * and fetching remaining repositories.
 */
export class SyncResumeHandler {
	private githubClient: GitHubGraphQLClient;
	private rateLimiter: RateLimiter;
	private checkpointHandler: SyncCheckpointHandler;
	private syncStateStore: SyncStateStore;
	private app: App;
	private pageSize: number;

	constructor(
		app: App,
		githubClient: GitHubGraphQLClient,
		rateLimiter: RateLimiter,
		checkpointHandler: SyncCheckpointHandler,
		syncStateStore: SyncStateStore,
		pageSize?: number,
	) {
		this.app = app;
		this.githubClient = githubClient;
		this.rateLimiter = rateLimiter;
		this.checkpointHandler = checkpointHandler;
		this.syncStateStore = syncStateStore;
		this.pageSize = pageSize ?? DEFAULT_PAGE_SIZE;
	}

	/**
	 * Show resume confirmation modal
	 * Displays modal and waits for user choice
	 */
	async showResumeConfirmation(
		checkpoint: SyncCheckpoint,
	): Promise<{ resume: boolean }> {
		return new Promise((resolve) => {
			const modal = new ResumeConfirmationModal(
				this.app,
				checkpoint,
				() => {
					// Log sync resumed
					info("Sync resumed from checkpoint", {
						fetchedCount: checkpoint.fetchedCount,
						totalCount: checkpoint.totalCount,
					});
					resolve({ resume: true });
				},
				() => {
					resolve({ resume: false });
				},
			);

			modal.open();
		});
	}

	/**
	 * Perform sync resuming from checkpoint
	 */
	async performResumeSync(checkpoint: SyncCheckpoint): Promise<Repository[]> {
		const repositories: Repository[] = [];
		let cursor = checkpoint.cursor;
		let pageCount = Math.floor(checkpoint.fetchedCount / this.pageSize);

		try {
			await this.syncStateStore.markSyncStarted();
			info("Sync resumed from checkpoint");

			// Convert existing checkpoint repos to storage
			await this.checkpointHandler.convertIncremental(checkpoint.repositories);

			// Fetch remaining pages starting from checkpoint cursor
			if (cursor) {
				do {
					// Check rate limit before making request
					if (this.rateLimiter.shouldThrottle()) {
						const waitTime = this.rateLimiter.getTimeUntilReset();
						new Notice(
							`Rate limit approaching. Waiting ${Math.ceil(waitTime / 1000)} seconds...`,
						);
						await this.sleep(waitTime);
					}

					// Fetch page
					const response = await this.githubClient.fetchStarredRepositories(
						cursor,
						this.pageSize,
					);

					// Update rate limit info from response extensions
					if (response.extensions?.rateLimit) {
						const rateLimit = response.extensions.rateLimit;
						this.rateLimiter.trackQuery(
							rateLimit.cost,
							rateLimit.remaining,
							rateLimit.resetAt ? new Date(rateLimit.resetAt) : undefined,
						);
					}

					// Transform and collect repositories
					const pageRepositories = this.transformGitHubResponse(response.data);
					repositories.push(...pageRepositories);

					// Update checkpoint after each page
					const pageInfo = response.data.viewer.starredRepositories.pageInfo;
					cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;

					const updatedCheckpoint: SyncCheckpoint = {
						...checkpoint,
						repositories: [...checkpoint.repositories, ...repositories],
						cursor,
						fetchedCount: checkpoint.fetchedCount + repositories.length,
						timestamp: new Date().toISOString(),
					};
					await this.checkpointHandler.syncCheckpoint(updatedCheckpoint);

					// Convert repositories to final storage incrementally
					await this.checkpointHandler.convertIncremental(pageRepositories);

					// Update progress
					pageCount++;
					await this.syncStateStore.updateProgress({
						currentStep: `Fetched page ${pageCount} (resuming)`,
						repositoriesProcessed:
							checkpoint.fetchedCount + repositories.length,
						totalRepositories: checkpoint.totalCount,
						// Resuming from checkpoint
						isResuming: true,
						fetchedCount: checkpoint.fetchedCount + repositories.length,
						convertedCount: checkpoint.fetchedCount + repositories.length,
					});

					// Small delay between pages to be respectful
					await this.sleep(100);
				} while (cursor);
			}

			// Delete checkpoint on sync completion
			await this.checkpointHandler.deleteCheckpoint();
			info("Checkpoint deleted - sync complete");

			// Mark sync as completed
			await this.syncStateStore.markSyncCompleted(
				checkpoint.fetchedCount + repositories.length,
			);
			info("Sync completed", {
				totalRepositories: checkpoint.fetchedCount + repositories.length,
			});

			new Notice(
				`Successfully synced ${checkpoint.fetchedCount + repositories.length} repositories!`,
			);
			return [...checkpoint.repositories, ...repositories];
		} catch (err) {
			// Invalid cursor error handling
			const errorMessage = err instanceof Error ? err.message : "Unknown error";

			// Check if error is related to invalid cursor
			if (
				errorMessage.includes("cursor") ||
				errorMessage.includes("invalid cursor") ||
				errorMessage.includes("GraphQL")
			) {
				error("Invalid cursor error", err);
				new Notice(
					"⚠️ Failed to resume from checkpoint (invalid cursor). Starting fresh sync...",
				);
				// Delete corrupted checkpoint
				await this.checkpointHandler.deleteCheckpoint();
				throw err; // Caller should handle starting fresh sync
			}

			error("Sync failed", {
				error: errorMessage,
				fetchedCount: checkpoint.fetchedCount + repositories.length,
			});

			await this.syncStateStore.markSyncFailed(errorMessage);
			new Notice(`Sync failed: ${errorMessage}`);
			throw err;
		}
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Transform GitHub GraphQL response to Repository format
	 * (Duplicated from sync-service to avoid circular dependency)
	 */
	private transformGitHubResponse(
		response: GetStarredRepositoriesResponse,
	): Repository[] {
		return response.viewer.starredRepositories.edges.map((edge) => {
			const node = edge.node;
			return {
				id: node.id,
				name: node.name,
				nameWithOwner: node.nameWithOwner,
				description: node.description,
				url: node.url,
				starCount: node.stargazerCount,
				primaryLanguage: node.primaryLanguage?.name || null,
				owner: node.owner.login,
				createdAt: node.createdAt,
				updatedAt: node.updatedAt,
				starredAt: edge.starredAt,
				readmeSha: node.readme?.oid || null,
				topics: node.repositoryTopics.nodes.map((topicNode) => topicNode.topic.name),
				linkedResources: [],
			};
		});
	}
}
