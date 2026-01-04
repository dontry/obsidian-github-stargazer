/**
 * README Fetching Configuration
 *
 * Configuration constants for parallel README fetching during sync operations.
 */

/**
 * Maximum number of concurrent README fetch requests
 *
 * Chosen to balance performance with GitHub API rate limit safety.
 * GitHub REST API allows 5,000 requests/hour for authenticated requests.
 */
export const README_CONCURRENCY_LIMIT = 5;

/**
 * Maximum README file size in bytes (5MB)
 *
 * READMEs exceeding this size will be skipped or truncated with a warning.
 * This prevents excessive memory usage and vault storage bloat.
 */
export const README_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * README fetch timeout in seconds (30s)
 *
 * Maximum time to wait for a single README fetch request to complete.
 * Helps prevent hanging sync operations on slow or unresponsive repositories.
 */
export const README_FETCH_TIMEOUT = 30; // seconds

/**
 * README file name format for vault storage
 *
 * Variables:
 * - {owner}: Repository owner/organization name
 * - {repo}: Repository name
 */
export const README_FILENAME_FORMAT = '{owner}-{repo}-README.md';

/**
 * GitHub README API endpoint template
 *
 * Variables:
 * - {owner}: Repository owner/organization name
 * - {repo}: Repository name
 */
export const GITHUB_README_API_URL = 'https://api.github.com/repos/{owner}/{repo}/readme';

/**
 * README fetch status values for tracking in checkpoint
 */
export enum ReadmeFetchStatus {
	/** README successfully fetched and stored */
	SUCCESS = 'success',
	/** README fetch failed (network error, access denied, etc.) */
	FAILED = 'failed',
	/** Repository has no README file */
	NOT_AVAILABLE = 'not_available',
}

/**
 * README conflict states for user-edited files
 */
export enum ReadmeConflictState {
	/** No conflict - only remote changed, or only local changed, or neither changed */
	NO_CONFLICT = 'no_conflict',
	/** Both local and remote README have changed - user resolution required */
	CONFLICT = 'conflict',
}
