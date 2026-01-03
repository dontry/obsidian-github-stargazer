/**
 * Constants and configuration values for GitHub Stargazer plugin
 * @module constants
 */

/** GitHub GraphQL API endpoint */
export const GITHUB_GRAPHQL_API_URL = 'https://api.github.com/graphql';

/** GitHub REST API base URL */
export const GITHUB_REST_API_URL = 'https://api.github.com';

/** Default number of repositories to fetch per page */
export const DEFAULT_PAGE_SIZE = 100;

/** Maximum number of repositories to fetch in one sync operation */
export const MAX_REPOSITORIES_PER_SYNC = 1000;

/** Maximum number of concurrent un-star operations */
export const MAX_CONCURRENT_UNSTARS = 10;

/** Minimum auto-sync interval in minutes (30 minutes) */
export const MIN_AUTO_SYNC_INTERVAL_MINUTES = 30;

/** Default auto-sync interval in minutes */
export const DEFAULT_AUTO_SYNC_INTERVAL_MINUTES = 60;

/** Default maximum repository cache size */
export const DEFAULT_MAX_CACHE_SIZE = 1000;

/** Rate limit threshold for throttling (20% of 5000 points) */
export const RATE_LIMIT_THRESHOLD = 1000;

/** Maximum exponential backoff delay in milliseconds */
export const MAX_BACKOFF_DELAY_MS = 30000;

/** Initial exponential backoff delay in milliseconds */
export const INITIAL_BACKOFF_DELAY_MS = 1000;

/** Search input debounce delay in milliseconds */
export const SEARCH_DEBOUNCE_DELAY_MS = 300;

/** Minimum tap target size for mobile in pixels */
export const MIN_MOBILE_TAP_TARGET_PX = 44;

/** Repositories data file name */
export const REPOSITORIES_DATA_FILE = 'repositories.json';

/** Tags data file name */
export const TAGS_DATA_FILE = 'tags.json';

/** Settings data file name */
export const SETTINGS_DATA_FILE = 'settings.json';

/** Sync state data file name */
export const SYNC_STATE_DATA_FILE = 'sync-state.json';

/** Notes directory name */
export const NOTES_DIR = 'github-stargazer-notes';

/** GitHub personal access token prefix */
export const GITHUB_TOKEN_PREFIX = 'ghp_';

/** Minimum GitHub token length */
export const GITHUB_TOKEN_MIN_LENGTH = 40;

/** Error message templates */
export const ERROR_MESSAGES = {
	AUTH_FAILED: 'Authentication failed. Please check your GitHub token in settings.',
	RATE_LIMIT_EXCEEDED: `Rate limit exceeded. Please wait before syncing again.`,
	NETWORK_ERROR: 'Network error. Please check your connection and try again.',
	NO_REPOSITORIES: 'No starred repositories found.',
	SYNC_IN_PROGRESS: 'Sync is already in progress.',
	INVALID_TOKEN: 'Invalid GitHub token format. Token must start with "ghp_" and be at least 40 characters.',
	INVALID_URL: 'Invalid URL. Please enter a valid HTTP or HTTPS URL.',
	INSUFFICIENT_DISK_SPACE: 'Insufficient disk space. Please free up at least 10MB and try again.',
} as const;

/** Success message templates */
export const SUCCESS_MESSAGES = {
	SYNC_COMPLETE: (count: number, duration: number) =>
		`Synced ${count} repositories in ${duration} seconds.`,
	REPOSITORIES_UNSTARRED: (count: number) =>
		`Successfully un-starred ${count} repositories.`,
	TAG_CREATED: (name: string) => `Tag "${name}" created.`,
	TAG_DELETED: (name: string) => `Tag "${name}" deleted.`,
	NOTE_SAVED: 'Note saved successfully.',
} as const;

/** Command IDs */
export const COMMAND_IDS = {
	SYNC: 'github-stargazer-sync',
	OPEN_VIEW: 'github-stargazer-open-view',
	BATCH_UNSTAR: 'github-stargazer-batch-unstar',
} as const;

/** Command names (user-facing) */
export const COMMAND_NAMES = {
	SYNC: 'Sync starred repositories',
	OPEN_VIEW: 'Open repository view',
	BATCH_UNSTAR: 'Batch un-star repositories',
} as const;

/** Default tag colors */
export const DEFAULT_TAG_COLORS = [
	'#3498db', // Blue
	'#e74c3c', // Red
	'#2ecc71', // Green
	'#f39c12', // Orange
	'#9b59b6', // Purple
	'#1abc9c', // Teal
	'#34495e', // Dark Blue/Grey
	'#e67e22', // Carrot
] as const;
