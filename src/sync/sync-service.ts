import { Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { SyncStateStore } from "@/storage/sync-state-store";
import { GitHubGraphQLClient } from "@/sync/github-client";
import { RateLimiter } from "@/sync/rate-limiter";
import type { Repository } from "@/types";
import { DEFAULT_PAGE_SIZE, ERROR_MESSAGES } from "@/utils/constants";

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

	constructor(
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
	) {
		this.githubClient = new GitHubGraphQLClient(githubToken);
		this.rateLimiter = new RateLimiter();
		this.repositoryStore = repositoryStore;
		this.syncStateStore = syncStateStore;
	}

	/**
	 * Perform initial sync - fetch all starred repositories
	 */
	async performInitialSync(): Promise<Repository[]> {
		const repositories: Repository[] = [];
		let cursor: string | null = null;
		let pageCount = 0;

		try {
			await this.syncStateStore.markSyncStarted();
			new Notice("Starting GitHub starred repositories sync...");

			// Fetch all pages of repositories
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
					DEFAULT_PAGE_SIZE,
				);

				// Update rate limit info from response headers if available
				// (Note: GraphQL rate limit info comes from response extensions)
				if (response.extensions?.rateLimit) {
					const rateLimit = response.extensions.rateLimit;
					this.rateLimiter.trackQuery(
						rateLimit.cost,
						rateLimit.remaining,
						rateLimit.resetAt ? new Date(rateLimit.resetAt) : undefined,
					);
				}

				// Transform and collect repositories
				const pageRepositories = this.transformGitHubResponse(response);
				repositories.push(...pageRepositories);

				// Update progress
				pageCount++;
				await this.syncStateStore.updateProgress({
					currentStep: `Fetched page ${pageCount}`,
					repositoriesProcessed: repositories.length,
					totalRepositories: repositories.length, // Will update when we know total
				});

				// Get next cursor
				const pageInfo = response.viewer.starredRepositories.pageInfo;
				cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;

				// Small delay between pages to be respectful
				await this.sleep(100);
			} while (cursor);

			// Save repositories
			await this.repositoryStore.addRepositories(repositories);

			// Mark sync as completed
			await this.syncStateStore.markSyncCompleted(repositories.length);

			new Notice(`Successfully synced ${repositories.length} repositories!`);
			return repositories;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			await this.syncStateStore.markSyncFailed(errorMessage);
			new Notice(`Sync failed: ${errorMessage}`);
			throw error;
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
			const changes = this.detectChanges(existingRepos, currentRepos);

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
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : "Unknown error";
			await this.syncStateStore.markSyncFailed(errorMessage);
			new Notice(`Incremental sync failed: ${errorMessage}`);
			throw error;
		}
	}

	/**
	 * Detect changes between existing and current repositories
	 */
	private detectChanges(
		existing: Map<string, Repository>,
		current: Repository[],
	): {
		added: Repository[];
		updated: Repository[];
		removed: string[];
	} {
		const added: Repository[] = [];
		const updated: Repository[] = [];
		const currentIds = new Set<string>();
		const existingIds = new Set(existing.keys());

		for (const repo of current) {
			currentIds.add(repo.id);

			const existingRepo = existing.get(repo.id);

			if (!existingRepo) {
				// New repository
				added.push(repo);
			} else if (this.hasRepositoryChanged(existingRepo, repo)) {
				// Updated repository
				updated.push(repo);
			}
		}

		// Find removed repositories
		const removed: string[] = [];
		for (const id of existingIds) {
			if (!currentIds.has(id)) {
				removed.push(id);
			}
		}

		return { added, updated, removed };
	}

	/**
	 * Compare updated dates to detect repository changes
	 */
	private compareUpdatedDates(
		existing: Repository,
		current: Repository,
	): boolean {
		return existing.updatedAt !== current.updatedAt;
	}

	/**
	 * Detect new repositories
	 */
	private detectNewRepos(
		existing: Map<string, Repository>,
		current: Repository[],
	): Repository[] {
		return current.filter((repo) => !existing.has(repo.id));
	}

	/**
	 * Detect deleted repositories
	 */
	private detectDeletedRepos(
		existing: Map<string, Repository>,
		current: Repository[],
	): string[] {
		const currentIds = new Set(current.map((r) => r.id));
		return Array.from(existing.keys()).filter((id) => !currentIds.has(id));
	}

	/**
	 * Check if repository has changed
	 */
	private hasRepositoryChanged(
		existing: Repository,
		current: Repository,
	): boolean {
		return (
			existing.updatedAt !== current.updatedAt ||
			existing.starCount !== current.starCount ||
			existing.description !== current.description ||
			existing.primaryLanguage !== current.primaryLanguage ||
			existing.readme !== current.readme
		);
	}

	/**
	 * Transform GitHub GraphQL response to Repository format
	 */
	private transformGitHubResponse(response: any): Repository[] {
		if (!response?.viewer?.starredRepositories?.edges) {
			return [];
		}

		return response.viewer.starredRepositories.edges.map((edge: any) => {
			const node = edge.node;
			return {
				id: node.id,
				name: node.name,
				nameWithOwner: node.nameWithOwner,
				description: node.description || "",
				url: node.url,
				starCount: node.stargazerCount,
				primaryLanguage: node.primaryLanguage?.name || null,
				owner: node.owner.login,
				createdAt: node.createdAt,
				updatedAt: node.updatedAt,
				starredAt: edge.starredAt,
				readme: node.readme?.text || null,
				tags: [],
				linkedResources: [],
			};
		});
	}

	/**
	 * Handle rate limiting with exponential backoff
	 */
	private async handleRateLimit(retryCount: number = 0): Promise<void> {
		const MAX_RETRIES = 5;
		const BASE_DELAY = 1000; // 1 second

		if (retryCount >= MAX_RETRIES) {
			throw new Error(ERROR_MESSAGES.RATE_LIMIT_EXCEEDED);
		}

		const delay = BASE_DELAY * 2 ** retryCount;
		new Notice(`Rate limited. Retrying in ${delay / 1000} seconds...`);
		await this.sleep(delay);
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
}
