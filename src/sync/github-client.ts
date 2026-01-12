import { type RequestUrlResponse, requestUrl } from "obsidian";
import {
	GITHUB_README_API_URL,
	README_FETCH_TIMEOUT,
} from "@/config/readme-config";
import {
	GET_STARRED_REPOSITORIES_QUERY,
	type GetStarredRepositoriesResponse,
	type GitHubGraphQLResult,
	type UnstarRepositoryResponse,
} from "@/sync/graphql-queries";
import {
	AccessDeniedError,
	RateLimitError,
	ReadmeEncodingError,
	ReadmeNetworkError,
	ReadmeNotFoundError,
	ReadmeTimeoutError,
	ReadmeTooLargeError,
} from "@/types/errors";
import type { GitHubReadmeResponse } from "@/types/readme";
import { GITHUB_GRAPHQL_API_URL } from "@/utils/constants";
import { extractShaFromResponse, validateShaFormat } from "@/utils/sha";
import { validateReadmeSize } from "@/utils/validation";

/**
 * Retry configuration for transient errors
 *
 * MAX_RETRIES = 3: Balance between reliability and performance
 * - Too many retries waste user time and API quota
 * - Too few retries fail on temporary network hiccups
 * - 3 retries is a common industry standard (AWS, Azure, GCP)
 *
 * RETRY_DELAYS_MS: Exponential backoff sequence [1s, 2s, 4s]
 * - Each retry waits twice as long as the previous
 * - Total max wait time: 7 seconds (1s + 2s + 4s)
 * - Exponential backoff reduces server load during outages
 * - Gives temporary issues time to resolve (e.g., load balancer recovery)
 */
const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000]; // 1s, 2s, 4s exponential backoff

/**
 * GitHub GraphQL API client
 * Handles authentication, API requests, and retry logic
 */
export class GitHubGraphQLClient {
	private token: string;

	constructor(token: string) {
		this.token = token;
	}

	/**
	 * Fetch total count of starred repositories
	 * Used to initialize checkpoint with totalCount
	 */
	async fetchTotalCount(): Promise<number> {
		const query = `
			query GetTotalStarredCount {
				viewer {
					starredRepositories {
						totalCount
					}
				}
			}
		`;

		const response = await this.fetchWithRetry(async () => {
			return await requestUrl({
				url: GITHUB_GRAPHQL_API_URL,
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ query }),
			});
		});

		const data = response.json as unknown as {
			data?: { viewer?: { starredRepositories?: { totalCount: number } } };
		};

		if (!data?.data?.viewer?.starredRepositories?.totalCount) {
			throw new Error("Failed to fetch total starred repositories count");
		}

		return data.data.viewer.starredRepositories.totalCount;
	}

	/**
	 * Internal retry wrapper with exponential backoff
	 *
	 * RETRY STRATEGY:
	 * 1. Execute the request function
	 * 2. On error, classify as FATAL or TRANSIENT
	 * 3. If FATAL (401, 403): fail immediately - retrying won't help
	 * 4. If TRANSIENT and retries remain: wait with exponential backoff, then retry
	 * 5. If retries exhausted: throw the original error
	 *
	 * FATAL ERRORS (no retry):
	 * - 401 Unauthorized: Invalid/missing token → user must fix credentials
	 * - 403 Forbidden: Rate limit/permissions → retrying wastes quota
	 *
	 * TRANSIENT ERRORS (retry with backoff):
	 * - ETIMEDOUT: Network timeout → temporary connectivity issue
	 * - ECONNRESET: Connection dropped → server restarted/network blip
	 * - ENOTFOUND: DNS failure → temporary DNS issue
	 * - 5xx server errors (500, 502, 503): Server-side problems → may recover
	 * - TypeError: Network error (CORS, offline) → temporary browser issue
	 *
	 * EXPONENTIAL BACKOFF:
	 * - Retry 1: wait 1 second (quick recovery from minor hiccups)
	 * - Retry 2: wait 2 seconds (give server more time to recover)
	 * - Retry 3: wait 4 seconds (final attempt for major outages)
	 * - Total max wait: 7 seconds across 3 retries
	 *
	 * @param fn - Async function to execute (typically an API request)
	 * @param retryCount - Current retry attempt (0-3, default: 0)
	 * @returns Result of the function
	 * @throws Error if all retries exhausted or fatal error occurs
	 */
	private async fetchWithRetry<T>(
		fn: () => Promise<T>,
		retryCount = 0,
	): Promise<T> {
		try {
			return await fn();
		} catch (error) {
			const err = error as Error;

			// FATAL ERROR CHECK: Errors that will never succeed with retry
			// 401 = Authentication failed (wrong/expired token) → user action required
			// 403 = Forbidden (rate limit/permissions) → retrying wastes API quota
			const isAuthError =
				err.message.includes("401") ||
				err.message.includes("Authentication failed");
			const isForbiddenError =
				err.message.includes("403") || err.message.includes("Forbidden");

			if (isAuthError || isForbiddenError) {
				// Fatal errors - fail immediately without retry
				// Retrying 401/403 is pointless and may trigger rate limit escalation
				throw err;
			}

			// TRANSIENT ERROR CHECK: Errors that might succeed on retry
			// ETIMEDOUT = Network timeout → temporary connectivity issue
			// ECONNRESET = Connection reset → server restarted/network blip
			// ENOTFOUND = DNS failure → temporary DNS resolution issue
			// 5xx = Server error (500, 502, 503) → server-side problem that may recover
			// TypeError = Network error (CORS, offline) → temporary browser/network issue
			const isTransientError =
				err.message.includes("ETIMEDOUT") ||
				err.message.includes("ECONNRESET") ||
				err.message.includes("ENOTFOUND") ||
				err.message.includes("5") || // 5xx server errors
				err.name === "TypeError"; // Network errors

			if (isTransientError && retryCount < MAX_RETRIES) {
				// EXPONENTIAL BACKOFF: Wait with increasing delay before retry
				// This reduces server load and gives issues time to resolve
				const delay = RETRY_DELAYS_MS[retryCount]; // 1000ms → 2000ms → 4000ms
				await new Promise((resolve) => setTimeout(resolve, delay));

				// Recursive retry with incremented counter
				return this.fetchWithRetry(fn, retryCount + 1);
			}

			// All retries exhausted or non-retryable error (4xx, etc.)
			// Throw original error to caller for proper error handling
			throw err;
		}
	}

	/**
	 * Fetch starred repositories from GitHub with retry logic
	 */
	async fetchStarredRepositories(
		cursor: string | null,
		pageSize: number,
	): Promise<GitHubGraphQLResult<GetStarredRepositoriesResponse>> {
		return this.fetchWithRetry(async () => {
			const response = await requestUrl({
				url: GITHUB_GRAPHQL_API_URL,
				method: "POST",
				headers: {
					Authorization: `Bearer ${this.token}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					query: GET_STARRED_REPOSITORIES_QUERY,
					variables: { cursor, pageSize },
				}),
			});

			if (response.status !== 200 && response.status !== 201) {
				if (response.status === 401) {
					throw new Error(
						"Authentication failed. Please check your GitHub token.",
					);
				}
				if (response.status === 403) {
					throw new Error(
						"Rate limit exceeded. Please wait before syncing again.",
					);
				}
				throw new Error(
					`GitHub API request failed: ${response.status} ${response.text}`,
				);
			}

			const data =
				response.json as GitHubGraphQLResult<GetStarredRepositoriesResponse>;

			if (data.errors?.length) {
				throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
			}

			return data;
		});
	}

	/**
	 * Unstar a repository
	 */
	async unstarRepository(repositoryId: string): Promise<void> {
		const mutation = `
			mutation UnstarRepository($repositoryId: ID!) {
				removeStar(input: {starrableId: $repositoryId}) {
					clientMutationId
				}
			}
		`;

		const response = await requestUrl({
			url: GITHUB_GRAPHQL_API_URL,
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.token}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				query: mutation,
				variables: { repositoryId },
			}),
		});

		if (response.status !== 200) {
			throw new Error(`Failed to unstar repository: ${response.status}`);
		}

		const data = response.json as GitHubGraphQLResult<UnstarRepositoryResponse>;

		if (data.errors?.length) {
			throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
		}
	}

	/**
	 * Fetch README from GitHub REST API
	 *
	 * GET api.github.com/repos/{owner}/{repo}/readme
	 * Returns decoded README content with SHA for change detection.
	 *
	 * Handles:
	 * - Base64 decoding of README content
	 * - SHA extraction for change detection
	 * - Error classification (404, 403, rate limit, etc.)
	 * - Size validation (max 5MB)
	 * - Encoding error handling
	 *
	 * @param owner - Repository owner/organization
	 * @param repo - Repository name
	 * @returns README content and SHA
	 * @throws {ReadmeNotFoundError} if repository has no README (404)
	 * @throws {RateLimitError} if rate limit exceeded (403 with retry-after)
	 * @throws {AccessDeniedError} if access denied (403/401)
	 * @throws {ReadmeTooLargeError} if README exceeds size limit
	 * @throws {ReadmeEncodingError} if content cannot be decoded
	 * @throws {ReadmeTimeoutError} if request times out
	 * @throws {ReadmeNetworkError} for other network errors
	 */
	async fetchReadme(
		owner: string,
		repo: string,
	): Promise<{
		content: string;
		sha: string;
		originalFileName: string;
		size: number;
	}> {
		const repository = `${owner}/${repo}`;
		const url = GITHUB_README_API_URL.replace("{owner}", owner).replace(
			"{repo}",
			repo,
		);

		try {
			// Fetch README from GitHub REST API with timeout
			const response = await Promise.race<RequestUrlResponse>([
				requestUrl({
					url,
					method: "GET",
					headers: {
						Authorization: `Bearer ${this.token}`,
						Accept: "application/vnd.github.v3+json",
					},
				}),
				new Promise<RequestUrlResponse>((_, reject) =>
					setTimeout(
						() => reject(new Error("Timeout")),
						README_FETCH_TIMEOUT * 1000,
					),
				),
			]);

			// Handle 404 - Repository has no README
			if (response.status === 404) {
				throw new ReadmeNotFoundError(repository);
			}

			// Handle 403 - Rate limit or access denied
			if (response.status === 403) {
				const retryAfter = response.headers["retry-after"];
				if (retryAfter) {
					throw new RateLimitError(repository, parseInt(retryAfter, 10));
				}
				throw new AccessDeniedError(repository, 403);
			}

			// Handle 401 - Unauthorized
			if (response.status === 401) {
				throw new AccessDeniedError(repository, 401);
			}

			// Handle other errors
			if (response.status !== 200) {
				throw new Error(
					`GitHub README API error: ${response.status} ${response.text}`,
				);
			}

			// Parse response
			const data = response.json as GitHubReadmeResponse;

			// Validate and extract SHA
			const sha = extractShaFromResponse(data);
			validateShaFormat(sha);

			// Validate size
			validateReadmeSize(data.size, repository);

			// Decode base64 content
			let content: string;
			try {
				// GitHub returns base64 with URL-safe characters
				// Need to convert to standard base64
				const base64Content = data.content
					.replace(/-/g, "+")
					.replace(/_/g, "/");
				const decoded = atob(base64Content);

				// Convert bytes to UTF-8 string
				const bytes = new Uint8Array(decoded.length);
				for (let i = 0; i < decoded.length; i++) {
					bytes[i] = decoded.charCodeAt(i);
				}
				content = new TextDecoder("utf-8").decode(bytes);
			} catch {
				throw new ReadmeEncodingError(repository, data.encoding);
			}

			// Validate content
			if (!content || content.length === 0) {
				throw new ReadmeEncodingError(repository, data.encoding);
			}

			return {
				content,
				sha,
				originalFileName: data.name,
				size: data.size,
			};
		} catch (error) {
			// Re-throw our custom errors as-is
			if (
				error instanceof ReadmeNotFoundError ||
				error instanceof RateLimitError ||
				error instanceof AccessDeniedError ||
				error instanceof ReadmeTooLargeError ||
				error instanceof ReadmeEncodingError
			) {
				throw error;
			}

			// Handle timeout
			if (error instanceof Error && error.message === "Timeout") {
				throw new ReadmeTimeoutError(repository, README_FETCH_TIMEOUT);
			}

			// Wrap other errors in ReadmeNetworkError
			throw new ReadmeNetworkError(repository, error);
		}
	}
}
