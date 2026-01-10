import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { SyncStateStore } from "@/storage/sync-state-store";
import { VaultFileManager } from "@/storage/vault-file-manager";
import { GitHubGraphQLClient } from "@/sync/github-client";
import { MetadataGenerator } from "@/sync/metadata-generator";
import { RateLimiter } from "@/sync/rate-limiter";
import { ReadmeFetcher } from "@/sync/readme-fetcher";
import { SyncChangeDetector } from "@/sync/sync-change-detector";
import { SyncCheckpointHandler } from "@/sync/sync-checkpoint-handler";
import { SyncPageFetcher } from "@/sync/sync-page-fetcher";
import { SyncResumeHandler } from "@/sync/sync-resume";
import type { Repository, SyncCheckpoint } from "@/types";
import { ERROR_MESSAGES } from "@/utils/constants";
import { checkDiskSpace } from "@/utils/disk-check";
import {
	createOrUpdateMetadataFile,
	deleteRepositoryFiles,
	ensureOwnerDirectoryExists,
} from "@/utils/file-manager";
import { error, info, warn } from "@/utils/logger";

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
	private readmeFetcher: ReadmeFetcher;
	private vaultManager: VaultFileManager;
	private metadataGenerator: MetadataGenerator;
	private app: App;

	constructor(
		app: App,
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
		pageSize?: number,
	) {
		this.app = app;
		this.githubClient = new GitHubGraphQLClient(githubToken);
		this.rateLimiter = new RateLimiter();
		this.repositoryStore = repositoryStore;
		this.syncStateStore = syncStateStore;
		this.checkpointHandler = new SyncCheckpointHandler(app, repositoryStore);
		this.pageFetcher = new SyncPageFetcher(
			this.githubClient,
			this.rateLimiter,
			syncStateStore,
			pageSize,
		);
		this.changeDetector = new SyncChangeDetector();
		this.vaultManager = new VaultFileManager(app);
		this.readmeFetcher = new ReadmeFetcher(
			this.githubClient,
			this.vaultManager,
			new Map(),
		);
		this.metadataGenerator = new MetadataGenerator();
		this.resumeHandler = new SyncResumeHandler(
			app,
			this.githubClient,
			this.rateLimiter,
			this.checkpointHandler,
			syncStateStore,
			pageSize,
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

			// Initialize README fetcher with metadata from checkpoint (if resuming)
			const readmeMetadata = currentCheckpoint.readmeMetadata
				? new Map(currentCheckpoint.readmeMetadata)
				: new Map();
			this.readmeFetcher = new ReadmeFetcher(
				this.githubClient,
				this.vaultManager,
				readmeMetadata,
			);

			// Fetch all pages of repositories
			const repositories = await this.pageFetcher.fetchAllPages(
				null,
				totalCount,
				async (pageRepos, cursor) => {
					// Convert repositories to final storage incrementally
					await this.checkpointHandler.convertIncremental(pageRepos);
					if(!currentCheckpoint) {
						throw new Error("Current checkpoint is null");
					}

					// Update checkpoint after each page
					return await this.checkpointHandler.updateCheckpoint(
						currentCheckpoint,
						pageRepos,
						cursor,
					);
				},
				false, // Not resuming
			);

			// Fetch READMEs for all repositories in parallel
			info("Fetching READMEs for repositories in parallel", {
				count: repositories.length,
			});
			const readmeResults = await this.readmeFetcher.fetchReadmesInParallel(
				repositories,
				{
					onProgress: (repository, status) => {
						// Log progress for each repository
						if (status.skipped) {
							if (status.skipReason === "sha_unchanged") {
								info("README unchanged, skipping fetch", {
									repository,
								});
							} else if (status.skipReason === "not_available") {
								info("Repository has no README", {
									repository,
								});
							}
						} else if (status.success) {
							info("README fetched successfully", {
								repository,
							});
						} else {
							warn("README fetch failed", {
								repository,
								error: status.error?.message,
							});
						}
					},
				},
			);

			// Calculate statistics from results
			let successCount = 0;
			let skippedCount = 0;
			let failedCount = 0;
			let notAvailableCount = 0;

			for (const result of readmeResults) {
				if (result.skipped) {
					if (result.skipReason === "sha_unchanged") {
						skippedCount++;
					} else if (result.skipReason === "not_available") {
						notAvailableCount++;
					}
				} else if (result.success) {
					successCount++;
				} else {
					failedCount++;
				}
			}

			// Log summary statistics
			info("Parallel README fetching completed", {
				total: repositories.length,
				success: successCount,
				skipped: skippedCount,
				notAvailable: notAvailableCount,
				failed: failedCount,
			});

			// Show notice to user
			const noticeMessage = `READMEs: ${successCount} new/updated, ${skippedCount} unchanged, ${notAvailableCount} not available`;
			if (failedCount > 0) {
				new Notice(`${noticeMessage}, ${failedCount} failed`);
			} else {
				new Notice(noticeMessage);
			}

			// Update checkpoint with README metadata before completion
			if (currentCheckpoint) {
				currentCheckpoint.readmeMetadata = this.readmeFetcher.getMetadata();
				await this.checkpointHandler.syncCheckpoint(currentCheckpoint);
			}

			// Generate metadata files for all repositories
			info("Generating metadata files for repositories", {
				count: repositories.length,
			});
			await this.generateMetadataForRepositories(repositories);

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
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
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

			// Delete vault files for removed repositories and mark as unstarred
			for (const removedId of changes.removed) {
				const removedRepo = existingRepos.get(removedId);
				if (removedRepo) {
					// Delete the actual markdown files from the vault
					const deleteResults = await deleteRepositoryFiles(this.app, removedRepo);
					info(`Deleted vault files for unstarred repository: ${removedRepo.nameWithOwner}`, {
						results: deleteResults,
					});
					// Mark as unstarred in the store
					await this.repositoryStore.markAsUnstarred(removedId);
				}
			}

			// Generate metadata files for new and updated repositories
			const reposToUpdate = [...changes.added, ...changes.updated];
			if (reposToUpdate.length > 0) {
				info("Generating metadata files for changed repositories", {
					count: reposToUpdate.length,
				});
				await this.generateMetadataForRepositories(reposToUpdate);
			}

			const message = `Incremental sync: +${changes.added.length} ~${changes.updated.length} -${changes.removed.length}`;
			new Notice(message);

			return changes;
		} catch (err) {
			const errorMessage = err instanceof Error ? err.message : "Unknown error";
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
		const checkpoint = await this.checkpointHandler.loadCheckpointIfExists();

		if (checkpoint) {
			// Show confirmation modal
			const { resume } =
				await this.resumeHandler.showResumeConfirmation(checkpoint);

			if (resume) {
				// Resume from checkpoint
				return await this.resumeHandler.performResumeSync(checkpoint);
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

	/**
	 * Generate metadata files for all repositories
	 * @feature 006-repo-metadata-frontmatter
	 *
	 * Creates or updates metadata files for each repository with YAML frontmatter.
	 * Metadata files are created in the structure: owner/repo/owner-repo-metadata.md
	 * Errors are handled gracefully - sync continues even if individual metadata files fail.
	 *
	 * @param repositories - List of repositories to generate metadata for
	 */
	private async generateMetadataForRepositories(
		repositories: Repository[],
	): Promise<void> {
		let createdCount = 0;
		let updatedCount = 0;
		let skippedCount = 0;
		let failedCount = 0;

		for (const repo of repositories) {
			const [owner, repoName] = repo.nameWithOwner.split("/");

			if (!owner || !repoName) {
				warn("Invalid repository name format", {
					nameWithOwner: repo.nameWithOwner,
				});
				continue;
			}

			try {
				// Ensure owner directory exists
				await ensureOwnerDirectoryExists(this.app, repo.nameWithOwner);

				// Generate frontmatter
				const frontmatter = this.metadataGenerator.generateFrontmatter(repo);

				// Generate file path
				const filePath = this.metadataGenerator.generateMetadataFilePath(
					owner,
					repoName,
				);

				// Create or update metadata file
				const result = await createOrUpdateMetadataFile(
					this.app,
					filePath,
					frontmatter,
				);

				// Track statistics
				if (result.success) {
					if (result.action === "created") {
						createdCount++;
						info("Metadata file created", {
							repository: repo.nameWithOwner,
							filePath,
						});
					} else if (result.action === "updated") {
						updatedCount++;
						info("Metadata file updated", {
							repository: repo.nameWithOwner,
							filePath,
						});
					} else if (result.action === "skipped") {
						skippedCount++;
						info("Metadata file unchanged, skipping update", {
							repository: repo.nameWithOwner,
							filePath,
						});
					}
				} else {
					failedCount++;
					warn("Failed to create/update metadata file", {
						repository: repo.nameWithOwner,
						filePath,
						error: result.error?.message,
					});
				}
			} catch (err) {
				// Individual metadata file errors should not fail the entire sync
				warn("Failed to generate metadata for repository", {
					repository: repo.nameWithOwner,
					error: err instanceof Error ? err.message : "Unknown error",
				});
				failedCount++;
			}
		}

		// Log summary statistics
		info("Metadata file generation completed", {
			total: repositories.length,
			created: createdCount,
			updated: updatedCount,
			skipped: skippedCount,
			failed: failedCount,
		});

		// Show notice to user
		const noticeMessage = `Metadata: ${createdCount} created, ${updatedCount} updated, ${skippedCount} unchanged`;
		if (failedCount > 0) {
			new Notice(`${noticeMessage}, ${failedCount} failed`);
		} else {
			new Notice(noticeMessage);
		}
	}

	/**
	 * Fetch READMEs for all repositories
	 *
	 * This method iterates through repositories and fetches READMEs if they have changed.
	 * Errors are handled gracefully - sync continues even if individual README fetches fail.
	 *
	 * @param repositories - List of repositories to fetch READMEs for
	 */
	private async fetchReadmesForRepositories(
		repositories: Repository[],
	): Promise<void> {
		let successCount = 0;
		let skippedCount = 0;
		let failedCount = 0;
		let notAvailableCount = 0;

		for (const repo of repositories) {
			// Parse owner and repo from nameWithOwner
			const [owner, repoName] = repo.nameWithOwner.split("/");

			if (!owner || !repoName) {
				warn("Invalid repository name format", {
					nameWithOwner: repo.nameWithOwner,
				});
				continue;
			}

			try {
				const result = await this.readmeFetcher.fetchReadmeIfChanged(
					owner,
					repoName,
					{
						onProgress: (repository, status) => {
							// Log progress for each repository
							if (status.skipped) {
								if (status.skipReason === "sha_unchanged") {
									info("README unchanged, skipping fetch", {
										repository,
									});
								} else if (status.skipReason === "not_available") {
									info("Repository has no README", {
										repository,
									});
								}
							} else if (status.success) {
								info("README fetched successfully", {
									repository,
								});
							} else {
								warn("README fetch failed", {
									repository,
									error: status.error?.message,
								});
							}
						},
					},
				);

				// Track statistics
				if (result?.skipped) {
					if (result.skipReason === "sha_unchanged") {
						skippedCount++;
					} else if (result.skipReason === "not_available") {
						notAvailableCount++;
					}
				} else if (result?.success) {
					successCount++;
				} else {
					failedCount++;
				}
			} catch (err) {
				// Individual README fetch errors should not fail the entire sync
				warn("Failed to fetch README for repository", {
					repository: repo.nameWithOwner,
					error: err instanceof Error ? err.message : "Unknown error",
				});
				failedCount++;
			}
		}

		// Log summary statistics
		info("README fetching completed", {
			total: repositories.length,
			success: successCount,
			skipped: skippedCount,
			notAvailable: notAvailableCount,
			failed: failedCount,
		});

		// Show notice to user
		const noticeMessage = `READMEs: ${successCount} new/updated, ${skippedCount} unchanged, ${notAvailableCount} not available`;
		if (failedCount > 0) {
			new Notice(`${noticeMessage}, ${failedCount} failed`);
		} else {
			new Notice(noticeMessage);
		}
	}
}
