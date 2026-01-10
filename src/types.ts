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
	/** Array of topics names applied to this repo */
	topics: string[];
	/** External documentation links */
	linkedResources: LinkedResource[];
	/** Whether the repo has been un-starred but kept locally */
	isUnstarred?: boolean;
	/** SHA hash of the README content from GitHub API (for change detection) */
	readmeSha: string | null;
	/** Path to the README markdown file in the vault (e.g., "facebook/react/facebook-react-readme.md") */
	readmeVaultFilePath?: string; 
	/** Whether the user has manually edited the README file in the vault */
	localReadmeModified?: boolean;
	/** Path to metadata file in new structure (e.g., "facebook/react/facebook-react-metadata.md") @feature 006-repo-metadata-frontmatter */
	metadataFilePath?: string;
	/** SHA-256 hash of last metadata write (for change detection) @feature 006-repo-metadata-frontmatter */
	metadataSha?: string;
	/** Whether the user has added notes to the metadata file @feature 006-repo-metadata-frontmatter */
	hasUserNotes?: boolean;
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
	/** Number of repositories to fetch per page (default: 10) */
	pageSize?: number;
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

/**
 * Repository metadata extracted from GitHub API for YAML frontmatter
 * @feature 006-repo-metadata-frontmatter
 */
export interface RepositoryMetadata {
	/** Repository name (e.g., "react") */
	name: string;
	/** Full name with owner (e.g., "facebook/react") */
	fullName: string;
	/** Repository description or null if not provided */
	description: string | null;
	/** Total number of stars */
	starCount: number;
	/** Primary programming language or null if not detected */
	primaryLanguage: string | null;
	/** Array of topic names */
	tags: string[];
	/** GitHub repository URL */
	url: string;
	/** Repository owner login (username) */
	ownerLogin: string;
	/** Repository creation timestamp (ISO8601) */
	createdAt: string;
	/** Last update timestamp (ISO8601) */
	updatedAt: string;
	/** Custom homepage URL or null if not set */
	homepageUrl: string | null;
	/** License SPDX identifier (e.g., "MIT", "Apache-2.0") or null */
	license: string | null;
	/** Total number of forks */
	forkCount: number;
	/** Total number of open issues */
	openIssuesCount: number;
	/** Total number of watchers */
	watchersCount: number;
}

/**
 * Result of a file system operation on vault files
 * @feature 006-repo-metadata-frontmatter
 */
export interface FileOperationResult {
	/** Whether the operation completed successfully */
	success: boolean;
	/** Relative path of the file in the vault */
	filePath: string;
	/** Action that was performed or attempted */
	action: 'created' | 'updated' | 'deleted' | 'skipped';
	/** Error if operation failed, null otherwise */
	error: Error | null;
	/** Human-readable message for logging/UI (optional) */
	message?: string;
}

/**
 * A metadata markdown file stored in the vault
 * @feature 006-repo-metadata-frontmatter
 */
export interface RepositoryMetadataFile {
	/** Relative path from vault root (e.g., "facebook/react/facebook-react-metadata.md") */
	filePath: string;
	/** Repository metadata from GitHub API */
	metadata: RepositoryMetadata;
	/** YAML frontmatter block as string (including --- markers) */
	frontmatter: string;
	/** User-written content below frontmatter (preserved during updates) */
	userContent: string;
	/** SHA-256 hash of metadata (for change detection) */
	metadataSha: string;
	/** Whether user has manually edited this file */
	hasUserEdits: boolean;
	/** Last sync timestamp (ISO8601) */
	lastSyncedAt: string;
}

/**
 * Options for metadata file generation during sync
 * @feature 006-repo-metadata-frontmatter
 */
export interface MetadataSyncOptions {
	/** Force refresh all metadata files (ignore SHA check) */
	forceRefresh?: boolean;
	/** Whether to create metadata files (true by default) */
	createMetadata?: boolean;
	/** Whether to update existing metadata files (true by default) */
	updateMetadata?: boolean;
	/** Callback for progress updates during sync */
	onProgress?: (repo: Repository, result: FileOperationResult) => void;
	/** Callback for user confirmation (unstar deletion) */
	onConfirm?: (repos: Repository[]) => Promise<boolean>;
}

/**
 * Generate SHA-256 hash of repository metadata for change detection
 * @feature 006-repo-metadata-frontmatter
 * @param metadata - Repository metadata object
 * @returns SHA-256 hash as hexadecimal string
 */
export async function generateMetadataSha(metadata: RepositoryMetadata): Promise<string> {
	// Sort keys for consistent hashing regardless of field order
	const metadataJson = JSON.stringify(metadata, Object.keys(metadata).sort());
	const encoder = new TextEncoder();
	const data = encoder.encode(metadataJson);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
