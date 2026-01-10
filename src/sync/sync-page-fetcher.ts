import { Notice } from "obsidian";
import type { SyncStateStore } from "@/storage/sync-state-store";
import type { GitHubGraphQLClient } from "@/sync/github-client";
import type { GetStarredRepositoriesResponse } from "@/sync/graphql-queries";
import type { RateLimiter } from "@/sync/rate-limiter";
import type { Repository, SyncCheckpoint } from "@/types";
import { info } from "@/utils/logger";

/**
 * Page fetcher for repository synchronization
 *
 * Handles the core logic of fetching paginated results from GitHub
 * including rate limiting, checkpointing, and progress tracking.
 */
export class SyncPageFetcher {
	private githubClient: GitHubGraphQLClient;
	private rateLimiter: RateLimiter;
	private syncStateStore: SyncStateStore;
	private pageSize: number;

	constructor(
		githubClient: GitHubGraphQLClient,
		rateLimiter: RateLimiter,
		syncStateStore: SyncStateStore,
		pageSize?: number,
	) {
		this.githubClient = githubClient;
		this.rateLimiter = rateLimiter;
		this.syncStateStore = syncStateStore;
		this.pageSize = pageSize ?? 10;
	}

	/**
	 * Fetch all pages of repositories starting from a cursor
	 *
	 * @param initialCursor - Starting cursor (null for first page)
	 * @param totalCount - Total number of repositories to fetch
	 * @param updateCheckpoint - Callback to update checkpoint after each page
	 * @param isResuming - Whether this is a resume operation
	 * @returns Array of fetched repositories
	 */
	async fetchAllPages(
		initialCursor: string | null,
		totalCount: number,
		updateCheckpoint: (
			repos: Repository[],
			cursor: string | null,
		) => Promise<SyncCheckpoint>,
		isResuming: boolean = false,
	): Promise<Repository[]> {
		const repositories: Repository[] = [];
		let cursor = initialCursor;
		let pageCount = 0;

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

			// Lifecycle logging - page fetched
			info("Page fetched", {
				pageNumber: pageCount + 1,
				repositoryCount: pageRepositories.length,
			});

			// Update checkpoint after each page
			const pageInfo = response.data.viewer.starredRepositories.pageInfo;
			cursor = pageInfo.hasNextPage ? pageInfo.endCursor : null;

			await updateCheckpoint(pageRepositories, cursor);

			// Update progress
			pageCount++;
			await this.syncStateStore.updateProgress({
				currentStep: isResuming
					? `Fetched page ${pageCount} (resuming)`
					: `Fetched page ${pageCount}`,
				repositoriesProcessed: repositories.length,
				totalRepositories: totalCount,
				isResuming,
				fetchedCount: repositories.length,
				convertedCount: repositories.length,
			});

			// Small delay between pages to be respectful
			await this.sleep(100);
		} while (cursor);

		return repositories;
	}

	/**
	 * Sleep for a specified duration
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Transform GitHub GraphQL response to Repository format
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
				readmeSha: node.readme?.oid ?? null,
				topics: node.repositoryTopics.nodes.map((topicNode) => topicNode.topic.name),
				linkedResources: [],
			};
		});
	}
}
