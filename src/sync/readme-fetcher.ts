/**
 * README Fetcher - Core Logic for Conditional README Fetching
 *
 * Main orchestrator for README fetching during sync operations:
 * - SHA-based change detection (skip if unchanged)
 * - Conditional fetching (only fetch when needed)
 * - Metadata tracking in checkpoint
 * - Error handling with classification
 * - Integration with vault file manager
 *
 * This is the core of User Story 1: Conditional README Fetching
 */

import {
	README_CONCURRENCY_LIMIT,
	ReadmeConflictState,
	ReadmeFetchStatus,
} from "@/config/readme-config";
import type { VaultFileManager } from "@/storage/vault-file-manager";
import { ReadmeNotFoundError, ReadmeTooLargeError } from "@/types/errors";
import type {
	ReadmeConflictDetection,
	ReadmeFetchResult,
	ReadmeMetadata,
} from "@/types/readme";
import { generateReadmeFilePath } from "@/utils/path-utils";
import { hasReadmeChanged } from "@/utils/sha";
import type { GitHubGraphQLClient } from "./github-client";

/**
 * README Fetcher Options
 */
export interface ReadmeFetcherOptions {
	/** Whether to fetch READMEs even if SHA unchanged (force refresh) */
	forceRefresh?: boolean;
	/** Callback for progress updates */
	onProgress?: (repository: string, status: ReadmeFetchResult) => void;
}

type FetchRequest = {
	owner: string;
	repo: string;
	options: ReadmeFetcherOptions;
	resolve: (result: ReadmeFetchResult) => void;
	reject: (error: Error) => void;
};

/**
 * README Fetcher
 *
 * Orchestrates README fetching with SHA-based change detection.
 *
 * Workflow:
 * 1. Check if README exists in checkpoint metadata
 * 2. Compare stored SHA with current SHA (from GitHub API)
 * 3. If SHA changed or not found: Fetch README content
 * 4. Store README in vault (if not conflict)
 * 5. Update metadata in checkpoint
 * 6. Return fetch result
 */
export class ReadmeFetcher {
	private githubClient: GitHubGraphQLClient;
	private vaultManager: VaultFileManager;
	private metadata: Map<string, ReadmeMetadata>;

	constructor(
		githubClient: GitHubGraphQLClient,
		vaultManager: VaultFileManager,
		initialMetadata?: Map<string, ReadmeMetadata>,
	) {
		this.githubClient = githubClient;
		this.vaultManager = vaultManager;
		this.metadata = initialMetadata || new Map<string, ReadmeMetadata>();
	}

	/** Maximum number of concurrent README fetch requests */
	private static readonly MAX_CONCURRENT_REQUESTS = README_CONCURRENCY_LIMIT;

	/** Currently active fetch count */
	private activeFetchCount = 0;

	/** Queue of pending fetch requests */
	private fetchQueue: FetchRequest[] = [];

	/**
	 * Fetch README for a repository if it has changed
	 *
	 * This is the main entry point for README fetching during sync.
	 *
	 * @param owner - Repository owner/organization
	 * @param repo - Repository name
	 * @param options - Fetch options (forceRefresh, progress callback)
	 * @returns Fetch result with metadata and status
	 */
	async fetchReadmeIfChanged(
		owner?: string,
		repo?: string,
		options: ReadmeFetcherOptions = {},
	): Promise<ReadmeFetchResult> {
		if (!owner || !repo) {
			throw new Error("owner or repoName is undefined");
		}
		// Use concurrency pool to limit parallel requests
		return this.createRequestPool(owner, repo, options);
	}

	/**
	 * Fetch READMEs for multiple repositories in parallel with concurrency control
	 *
	 * This method orchestrates parallel fetching of READMEs for multiple repositories.
	 * Uses the concurrency pool to limit parallel requests to 5 concurrent at a time.
	 *
	 * Key features:
	 * - Fetches multiple repos concurrently (max 5 at a time)
	 * - Respects SHA-based change detection (skips unchanged)
	 * - Collects all results including successes and failures
	 * - Updates checkpoint metadata incrementally
	 * - Continues on individual failures (graceful degradation)
	 *
	 * @param repositories - Array of repositories to fetch READMEs for
	 * @param options - Fetch options (forceRefresh, progress callback)
	 * @returns Array of fetch results for all repositories
	 */
	async fetchReadmesInParallel(
		repositories: Array<{ nameWithOwner: string }>,
		options: ReadmeFetcherOptions = {},
	): Promise<ReadmeFetchResult[]> {
		const results: ReadmeFetchResult[] = [];

		// Create fetch promises for all repositories
		const fetchPromises = repositories.map(async (repo) => {
			const [owner, repoName] = repo.nameWithOwner.split("/");

			if (!owner || !repoName) {
				// Invalid repo name format - return error result
				return {
					repository: repo.nameWithOwner,
					success: false,
					skipped: false,
					error: new Error(`Invalid repository name: ${repo.nameWithOwner}`),
				};
			}

			try {
				// Use concurrency pool to fetch
				const result = await this.fetchReadmeIfChanged(
					owner,
					repoName,
					options,
				);
				return result;
			} catch (error) {
				// Individual fetch failed - return error result
				return {
					repository: repo.nameWithOwner,
					success: false,
					skipped: false,
					error: error instanceof Error ? error : new Error(String(error)),
				};
			}
		});

		// Wait for all fetches to complete (or fail)
		const settledResults = await Promise.allSettled(fetchPromises);

		// Collect results from both fulfilled and rejected promises
		for (const settled of settledResults) {
			if (settled.status === "fulfilled") {
				results.push(settled.value);
			} else {
				// Promise was rejected - create error result
				results.push({
					repository: "unknown",
					success: false,
					skipped: false,
					error:
						settled.reason instanceof Error
							? settled.reason
							: new Error(String(settled.reason)),
				});
			}
		}

		return results;
	}

	/**
	 * Internal fetch implementation without pool management
	 *
	 * This contains the actual fetching logic, separated from pool management.
	 *
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param options - Fetch options
	 * @returns Fetch result
	 */
	private async fetchReadmeInternal(
		owner: string,
		repo: string,
		options: ReadmeFetcherOptions,
	): Promise<ReadmeFetchResult> {
		const repository = `${owner}/${repo}`;
		const vaultFilePath = generateReadmeFilePath(owner, repo);

		try {
			// Step 1: Check if we have metadata for this repository
			const storedMetadata = this.metadata.get(repository);

			// Step 2: Fetch README from GitHub API (this gets current SHA)
			// We need to fetch to get the SHA, even if we might skip content download
			const readmeData = await this.githubClient.fetchReadme(owner, repo);
			const currentSha = readmeData.sha;

			// Step 3: SHA comparison - check if README has changed
			const storedSha = storedMetadata?.sha || null;
			const hasChanged = hasReadmeChanged(storedSha, currentSha);

			// Check if we should skip fetching
			const shouldSkip = !hasChanged && !options.forceRefresh;

			if (shouldSkip) {
				// README unchanged - skip fetch
				const result: ReadmeFetchResult = {
					repository,
					success: true,
					skipped: true,
					skipReason: "sha_unchanged",
					metadata: storedMetadata || {
						sha: currentSha,
						vaultFilePath,
						fetchStatus: ReadmeFetchStatus.SUCCESS,
						lastFetchedAt: new Date().toISOString(),
						localModified: false,
						size: readmeData.size,
						originalFileName: readmeData.originalFileName,
					},
				};

				if (options.onProgress) {
					options.onProgress(repository, result);
				}

				return result;
			}

			// Step 4: README has changed - check for conflicts
			const conflictDetection = await this.detectConflict(
				vaultFilePath,
				storedMetadata?.sha || null,
				currentSha,
			);

			// Step 5: Store README in vault (if no conflict or conflict resolved)
			let localModified = false;
			if (conflictDetection.hasConflict) {
				// Don't overwrite user-edited files
				localModified = true;
			} else {
				// No conflict - write README to vault
				const written = await this.vaultManager.createOrUpdateReadmeFile(
					vaultFilePath,
					readmeData.content,
					false, // Not modified by user
				);

				if (!written) {
					// File was not written due to local modification
					localModified = true;
				}
			}

			// Step 6: Create/update metadata
			const newMetadata: ReadmeMetadata = {
				sha: currentSha,
				vaultFilePath,
				fetchStatus: ReadmeFetchStatus.SUCCESS,
				lastFetchedAt: new Date().toISOString(),
				localModified,
				size: readmeData.size,
				originalFileName: readmeData.originalFileName,
			};

			// Update metadata map
			this.metadata.set(repository, newMetadata);

			const result: ReadmeFetchResult = {
				repository,
				success: true,
				skipped: false,
				metadata: newMetadata,
			};

			if (options.onProgress) {
				options.onProgress(repository, result);
			}

			return result;
		} catch (error) {
			// Handle errors with classification
			return this.handleFetchError(
				error,
				repository,
				vaultFilePath,
				owner,
				repo,
				options,
			);
		}
	}

	/**
	 * Detect conflicts between local and remote README changes
	 *
	 * @param vaultFilePath - Path to the README file in vault
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param storedSha - SHA from last sync
	 * @param remoteSha - Current SHA from GitHub
	 * @returns Conflict detection result
	 */
	private async detectConflict(
		vaultFilePath: string,
		storedSha: string | null,
		remoteSha: string | null,
	): Promise<ReadmeConflictDetection> {
		// Check if file exists and has been locally modified
		const fileExists = await this.vaultManager.fileExists(vaultFilePath);

		if (!fileExists) {
			// No local file - no conflict possible
			return {
				hasConflict: false,
				state: ReadmeConflictState.NO_CONFLICT,
				reason: "No local file exists",
				localModified: false,
				remoteModified: storedSha !== remoteSha,
				localSha: storedSha ?? undefined,
				remoteSha: remoteSha ?? undefined,
			};
		}

		// Check for local modification
		const localModified = await this.vaultManager.detectLocalModification(
			vaultFilePath,
			storedSha,
		);

		// Use vault manager's conflict detection
		return await this.vaultManager.detectConflict(
			vaultFilePath,
			localModified,
			storedSha,
			remoteSha,
		);
	}

	/**
	 * Handle fetch errors with classification and metadata storage
	 *
	 * Errors are classified by type and stored in metadata for retry logic.
	 *
	 * Error Types:
	 * - ReadmeNotFoundError (404): Repository has no README → NOT_AVAILABLE status
	 * - ReadmeTooLargeError: README exceeds 5MB limit → skip with warning
	 * - RateLimitError: API rate limit exceeded → FAILED status with retryAfter
	 * - AccessDeniedError: Authentication/permission error → FAILED status
	 * - Other errors: FAILED status with error message
	 *
	 * @param error - Error from fetch attempt
	 * @param repository - Repository identifier (owner/repo)
	 * @param vaultFilePath - Path to README file in vault
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param options - Fetch options
	 * @returns Fetch result with error information
	 */
	private handleFetchError(
		error: unknown,
		repository: string,
		vaultFilePath: string,
		owner: string,
		repo: string,
		options: ReadmeFetcherOptions,
	): ReadmeFetchResult {
		// Classify error type
		if (error instanceof ReadmeNotFoundError) {
			// Repository has no README - this is expected, not an error
			const metadata: ReadmeMetadata = {
				sha: "",
				vaultFilePath,
				fetchStatus: ReadmeFetchStatus.NOT_AVAILABLE,
				lastFetchedAt: new Date().toISOString(),
				localModified: false,
			};

			this.metadata.set(repository, metadata);

			const result: ReadmeFetchResult = {
				repository,
				success: true,
				skipped: true,
				skipReason: "not_available",
				metadata,
			};

			if (options.onProgress) {
				options.onProgress(repository, result);
			}

			return result;
		}

		if (error instanceof ReadmeTooLargeError) {
			// README too large - skip with warning
			const metadata: ReadmeMetadata = {
				sha: "",
				vaultFilePath,
				fetchStatus: ReadmeFetchStatus.FAILED,
				lastFetchedAt: new Date().toISOString(),
				localModified: false,
				errorMessage: `README too large (${error.size} bytes, limit is ${error.maxSize} bytes)`,
			};

			this.metadata.set(repository, metadata);

			const result: ReadmeFetchResult = {
				repository,
				success: false,
				skipped: true,
				skipReason: "too_large",
				metadata,
				error,
			};

			if (options.onProgress) {
				options.onProgress(repository, result);
			}

			return result;
		}

		// All other errors (rate limit, access denied, network, etc.)
		const isRateLimitError =
			error instanceof Error && error.message.includes("rate limit");

		const errorMessage =
			error instanceof Error ? error.message : "Unknown error";

		const metadata: ReadmeMetadata = {
			sha: "",
			vaultFilePath,
			fetchStatus: ReadmeFetchStatus.FAILED,
			lastFetchedAt: new Date().toISOString(),
			localModified: false,
			errorMessage: isRateLimitError
				? "Rate limit exceeded. Please wait before syncing again."
				: errorMessage,
		};

		this.metadata.set(repository, metadata);

		const result: ReadmeFetchResult = {
			repository,
			success: false,
			skipped: false,
			metadata,
			error: error instanceof Error ? error : new Error(errorMessage),
		};

		if (options.onProgress) {
			options.onProgress(repository, result);
		}

		return result;
	}

	/**
	 * Get all README metadata
	 *
	 * @returns Map of repository → README metadata
	 */
	getMetadata(): Map<string, ReadmeMetadata> {
		return this.metadata;
	}

	/**
	 * Get metadata for a specific repository
	 *
	 * @param repository - Repository identifier (owner/repo)
	 * @returns Metadata or undefined if not found
	 */
	getRepositoryMetadata(repository: string): ReadmeMetadata | undefined {
		return this.metadata.get(repository);
	}

	/**
	 * Update metadata from external source (e.g., loaded from checkpoint)
	 *
	 * @param metadata - Metadata map to merge with existing metadata
	 */
	updateMetadata(metadata: Map<string, ReadmeMetadata>): void {
		// Merge new metadata with existing
		for (const [repository, data] of metadata.entries()) {
			this.metadata.set(repository, data);
		}
	}

	/**
	 * Clear all metadata (e.g., for fresh sync)
	 */
	clearMetadata(): void {
		this.metadata.clear();
	}

	/**
	 * Get statistics about README fetching
	 *
	 * @returns Statistics object
	 */
	getStats(): {
		total: number;
		success: number;
		failed: number;
		notAvailable: number;
		skipped: number;
	} {
		let success = 0;
		let failed = 0;
		let notAvailable = 0;

		for (const metadata of this.metadata.values()) {
			if (metadata.fetchStatus === ReadmeFetchStatus.SUCCESS) {
				success++;
			} else if (metadata.fetchStatus === ReadmeFetchStatus.FAILED) {
				failed++;
			} else if (metadata.fetchStatus === ReadmeFetchStatus.NOT_AVAILABLE) {
				notAvailable++;
			}
		}

		return {
			total: this.metadata.size,
			success,
			failed,
			notAvailable,
			skipped: 0, // Tracked separately during sync
		};
	}

	/**
	 * Create a concurrency pool for managing parallel README fetch requests
	 *
	 * Limits concurrent requests to MAX_CONCURRENT_REQUESTS (5) to prevent:
	 * - Overwhelming the GitHub API
	 * - Hitting rate limits too quickly
	 * - Excessive memory usage
	 *
	 * Queues excess requests and processes them as slots become available.
	 *
	 * @param owner - Repository owner
	 * @param repo - Repository name
	 * @param options - Fetch options
	 * @returns Promise that resolves with fetch result
	 */
	private async createRequestPool(
		owner: string,
		repo: string,
		options: ReadmeFetcherOptions,
	): Promise<ReadmeFetchResult> {
		return new Promise((resolve, reject) => {
			// Add request to queue
			this.fetchQueue.push({ owner, repo, options, resolve, reject });

			// Try to process the queue
			this.processQueue().catch(console.error);
		});
	}

	/**
	 * Process the fetch queue with concurrency control
	 *
	 * Starts up to MAX_CONCURRENT_REQUESTS (5) concurrent fetches.
	 * As each fetch completes, it starts the next queued request.
	 */
	private async processQueue(): Promise<void> {
		// Start new requests while slots are available
		while (
			this.fetchQueue.length > 0 &&
			this.activeFetchCount < ReadmeFetcher.MAX_CONCURRENT_REQUESTS
		) {
			const request = this.fetchQueue.shift();
			if (!request) break;

			// Increment active count
			this.activeFetchCount++;

			// Execute fetch and decrement count when done
			await this.executeFetch(request).finally(() => {
				this.activeFetchCount--;
				// Process next item in queue
				this.processQueue().catch(console.error);
			});
		}
	}

	/**
	 * Execute a single fetch request
	 *
	 * @param request - Queued request to execute
	 * @returns Promise that resolves with fetch result
	 */
	private async executeFetch(request: FetchRequest): Promise<void> {
		const { owner, repo, options, resolve, reject } = request;

		try {
			// Call the actual fetch implementation
			const result = await this.fetchReadmeInternal(owner, repo, options);
			resolve(result);
		} catch (error) {
			reject(error as Error);
		}
	}
}
