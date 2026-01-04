/**
 * Core TypeScript interfaces for GitHub Stargazer plugin
 * @module types
 */

/**
 * A GitHub repository that the user has starred
 */
export interface Repository {
	/** GitHub node ID (global unique identifier) */
	id: string;
	/** Repository name */
	name: string;
	/** Full name with owner (e.g., "facebook/react") */
	nameWithOwner: string;
	/** Repository description (optional) */
	description: string | null;
	/** GitHub repository URL */
	url: string;
	/** Total number of stars */
	starCount: number;
	/** Main programming language (optional) */
	primaryLanguage: string | null;
	/** Repository owner login */
	owner: string;
	/** Repository creation timestamp (ISO8601) */
	createdAt: string;
	/** Last update timestamp (ISO8601) */
	updatedAt: string;
	/** When user starred this repo (ISO8601) */
	starredAt: string;
	/** Array of tag names applied to this repo */
	tags: string[];
	/** External documentation links */
	linkedResources: LinkedResource[];
	/** Whether the repo has been un-starred but kept locally */
	isUnstarred?: boolean;
	/** SHA hash of the README content from GitHub API (for change detection) */
	readmeSha: string | null;
	/** Path to the README markdown file in the vault root (e.g., "facebook-react-README.md") */
	readmeVaultFilePath?: string; 
	/** Whether the user has manually edited the README file in the vault */
	localReadmeModified?: boolean;
}

/**
 * A user-created label for categorizing repositories
 */
export interface Tag {
	/** Unique tag identifier (UUID) */
	id: string;
	/** Tag name */
	name: string;
	/** Hex color code for UI display (optional) */
	color: string | null;
	/** Tag creation timestamp (ISO8601) */
	createdAt: string;
	/** Tag description (optional) */
	description: string | null;
}

/**
 * User-written content associated with a specific repository
 */
export interface RepositoryNote {
	/** GitHub node ID of associated repository */
	repositoryId: string;
	/** Note content in markdown format */
	content: string;
	/** Note creation timestamp (ISO8601) */
	createdAt: string;
	/** Last update timestamp (ISO8601) */
	updatedAt: string;
}

/**
 * A URL pointing to external documentation or resources
 */
export interface LinkedResource {
	/** URL of the external resource */
	url: string;
	/** User-provided title for the resource */
	title: string;
	/** When the resource was linked (ISO8601) */
	addedAt: string;
}

/**
 * Plugin-wide settings and preferences
 */
export interface PluginSettings {
	/** GitHub personal access token */
	githubToken: string;
	/** Whether to automatically sync on plugin load */
	autoSyncEnabled: boolean;
	/** Minutes between auto-sync (if enabled) */
	autoSyncIntervalMinutes?: number;
	/** Last successful sync timestamp (ISO8601, optional) */
	lastSyncAt: string | null;
	/** Max repositories to cache in memory */
	maxRepositoryCacheSize: number;
}

/**
 * Tracks synchronization state and progress
 */
export interface SyncState {
	/** Whether sync is currently in progress */
	isSyncing: boolean;
	/** Timestamp of the last sync attempt */
	lastSync: string | null;
	/** Current step description */
	currentStep: string;
	/** Number of repositories processed in current sync */
	repositoriesProcessed: number;
	/** Total number of repositories involved in current sync */
	totalRepositories: number;
	/** Percentage complete for current sync */
	percentageComplete: number;
	/** Last error message, if any */
	error: string | null;
	/** Sync start time */
	startTime: string | null;
	/** Sync completion time */
	endTime: string | null;
	/** Duration of the last sync in seconds */
	duration: number | null;
	// T060: Checkpoint info for resume status display
	/** true if resuming from checkpoint, false if starting fresh */
	isResuming?: boolean;
	/** Number of repositories fetched from GitHub */
	fetchedCount?: number;
	/** Number of repositories converted to final storage */
	convertedCount?: number;
}

/**
 * GitHub GraphQL API response for starred repositories
 */
export interface GitHubGraphQLResponse {
	viewer: {
		starredRepositories: {
			pageInfo: {
				hasNextPage: boolean;
				endCursor: string;
			};
			edges: Array<{
				node: Repository;
				starredAt: string;
			}>;
		};
	};
}

/**
 * Rate limit information from GitHub API headers
 */
export interface RateLimitInfo {
	limit: number;
	remaining: number;
	used: number;
	resetAt: Date;
}

/**
 * Repository data stored in JSON file
 */
export interface RepositoryData {
	/** Last sync timestamp (ISO8601) */
	lastSync: string | null;
	/** Array of repository objects */
	repositories: Repository[];
}

/**
 * Tags data stored in JSON file
 */
export interface TagData {
	/** Array of tag objects */
	tags: Tag[];
}

/**
 * Sync checkpoint for tracking progress during repository synchronization
 */
export interface SyncCheckpoint {
	/** GraphQL pagination cursor for the last fetched page (null for first page) */
	cursor: string | null;
	/** Complete metadata for all repositories fetched so far */
	repositories: Repository[];
	/** Total count of starred repositories (fetched at sync start) */
	totalCount: number;
	/** Number of repositories successfully fetched so far */
	fetchedCount: number;
	/** ISO 8601 timestamp of last checkpoint update (optional) */
	timestamp?: string;
	/** Current state of the sync operation (optional) */
	status?: SyncStatus;
	/** UUID uniquely identifying this sync attempt (optional) */
	sessionId?: string;
	/** README metadata for each repository (repo ID → README metadata) */
	readmeMetadata?: Map<string, import('./types/readme.js').ReadmeMetadata>;
}

/**
 * Current state of a synchronization operation
 */
export type SyncStatus = 'in_progress' | 'completed' | 'failed';

/**
 * Real-time progress metrics for sync operations
 */
export interface SyncProgress {
	/** Total number of starred repositories to fetch */
	totalCount: number;
	/** Number of repositories fetched so far */
	fetchedCount: number;
	/** Number of repositories converted to final repository storage */
	convertedCount: number;
	/** true if resuming from existing checkpoint, false if starting fresh */
	isResuming: boolean;
	/** Current phase of sync operation */
	currentPhase: SyncPhase;
}

/**
 * Enumeration of sync phases for detailed progress display
 */
export type SyncPhase =
	| 'fetching_total_count' // Querying GitHub for total starred repos
	| 'loading_checkpoint' // Reading existing checkpoint file
	| 'fetching_repositories' // Fetching pages from GitHub API
	| 'converting_to_storage' // Converting checkpoint to final storage
	| 'completed'; // Sync finished successfully

/**
 * Validation error types for checkpoint operations
 */
export type ValidationReason =
	| 'file_not_found' // No checkpoint exists (not an error)
	| 'json_parse_error' // Corrupted JSON (unrecoverable)
	| 'missing_required_field' // Missing cursor/repositories (unrecoverable)
	| 'invalid_format' // Invalid field type/format (unrecoverable)
	| 'missing_optional_field' // Missing timestamp/status (recoverable, warn user)
	| 'stale_checkpoint' // Checkpoint > 7 days old (recoverable, warn user)
	| 'inconsistent_data' // fetchedCount != repositories.length (warn user)
	| 'concurrent_sync'; // Another sync already in progress (blocking)

/**
 * Error thrown when checkpoint validation fails
 */
export class CheckpointValidationError extends Error {
	/**
	 * @param message - Human-readable error message
	 * @param reason - Specific validation reason that occurred
	 * @param isRecoverable - Whether the error is recoverable (user can choose to continue)
	 */
	constructor(
		message: string,
		public readonly reason: ValidationReason,
		public readonly isRecoverable: boolean
	) {
		super(message);
		this.name = 'CheckpointValidationError';
	}
}
