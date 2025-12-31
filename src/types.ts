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
	/** README.md content in markdown (optional) */
	readme: string | null;
	/** Array of tag names applied to this repo */
	tags: string[];
	/** External documentation links */
	linkedResources: LinkedResource[];
	/** Whether the repo has been un-starred but kept locally */
	isUnstarred?: boolean;
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
