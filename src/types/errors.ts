/**
 * README Fetching Error Types
 *
 * Custom error types for GitHub README API operations.
 * These errors provide specific handling for different failure scenarios.
 */

/**
 * Base error class for README fetching operations
 */
export class ReadmeFetchError extends Error {
	constructor(message: string, public readonly repository: string) {
		super(message);
		this.name = 'ReadmeFetchError';
	}
}

/**
 * Error thrown when a repository has no README file
 *
 * HTTP Status: 404 Not Found
 * This is not necessarily an error condition - many repositories don't have READMEs.
 */
export class ReadmeNotFoundError extends ReadmeFetchError {
	constructor(repository: string) {
		super(`Repository '${repository}' has no README file`, repository);
		this.name = 'ReadmeNotFoundError';
	}
}

/**
 * Error thrown when GitHub API rate limit is exceeded
 *
 * HTTP Status: 403 Forbidden
 * Indicates that the rate limit for the authenticated user has been exceeded.
 * The sync operation should wait and retry after the rate limit resets.
 */
export class RateLimitError extends ReadmeFetchError {
	constructor(
		repository: string,
		public readonly retryAfter: number, // seconds until retry
	) {
		super(
			`GitHub API rate limit exceeded while fetching README for '${repository}'. Retry after ${retryAfter} seconds.`,
			repository,
		);
		this.name = 'RateLimitError';
	}
}

/**
 * Error thrown when access to a repository is denied
 *
 * HTTP Status: 403 Forbidden (not rate limit) or 401 Unauthorized
 * Indicates the user no longer has access to the repository (e.g., private repo access revoked).
 */
export class AccessDeniedError extends ReadmeFetchError {
	constructor(repository: string, public readonly statusCode: number) {
		super(
			`Access denied to repository '${repository}' (status ${statusCode})`,
			repository,
		);
		this.name = 'AccessDeniedError';
	}
}

/**
 * Error thrown when README content exceeds size limit
 *
 * The README file is too large to store (exceeds README_MAX_FILE_SIZE).
 */
export class ReadmeTooLargeError extends ReadmeFetchError {
	constructor(
		repository: string,
		public readonly size: number, // actual size in bytes
		public readonly maxSize: number, // maximum allowed size
	) {
		super(
			`README for '${repository}' is too large (${size} bytes, max ${maxSize} bytes)`,
			repository,
		);
		this.name = 'ReadmeTooLargeError';
	}
}

/**
 * Error thrown when README content cannot be decoded
 *
 * The base64 content from GitHub API could not be decoded as valid text.
 */
export class ReadmeEncodingError extends ReadmeFetchError {
	constructor(repository: string, public readonly encoding: string) {
		super(
			`Failed to decode README for '${repository}' with encoding '${encoding}'`,
			repository,
		);
		this.name = 'ReadmeEncodingError';
	}
}

/**
 * Error thrown when network request times out
 *
 * The README fetch request exceeded the timeout threshold.
 */
export class ReadmeTimeoutError extends ReadmeFetchError {
	constructor(
		repository: string,
		public readonly timeout: number, // timeout in seconds
	) {
		super(
			`README fetch for '${repository}' timed out after ${timeout} seconds`,
			repository,
		);
		this.name = 'ReadmeTimeoutError';
	}
}

/**
 * Error thrown when a generic network error occurs
 *
 * Covers various network-related failures (DNS, connection refused, etc.).
 */
export class ReadmeNetworkError extends ReadmeFetchError {
	constructor(
		repository: string,
		public readonly originalError: unknown,
	) {
		super(
			`Network error while fetching README for '${repository}': ${originalError instanceof Error ? originalError.message : String(originalError)}`,
			repository,
		);
		this.name = 'ReadmeNetworkError';
	}
}
