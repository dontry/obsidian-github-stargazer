/**
 * README Metadata Types
 *
 * Type definitions for README fetching, storage, and conflict detection.
 */

import type {
	ReadmeConflictState,
	ReadmeFetchStatus,
} from "../config/readme-config.js";

/**
 * README metadata stored in checkpoint for each repository
 *
 * This metadata is persisted in the checkpoint file to enable:
 * - SHA-based change detection (skip unchanged READMEs)
 * - Resume from checkpoint (track fetch status)
 * - Conflict detection (local vs remote changes)
 */
export interface ReadmeMetadata {
	/**
	 * SHA hash of the README content from GitHub API
	 * Used for accurate change detection - only fetch if SHA has changed.
	 */
	sha: string;

	/**
	 * Path to the README markdown file in the vault
	 * Relative path from vault root (e.g., "facebook/react/facebook-react-readme.md")
	 */
	vaultFilePath: string;

	/**
	 * Current fetch status of this README
	 */
	fetchStatus: ReadmeFetchStatus;

	/**
	 * ISO8601 timestamp when the README was last fetched
	 * Used for staleness detection and user display.
	 */
	lastFetchedAt: string;

	/**
	 * Whether the user has manually edited the README file in their vault
	 * Set to true when local file modification is detected.
	 * Used for conflict detection when remote README also changes.
	 */
	localModified: boolean;

	/**
	 * Size of the README content in bytes
	 * Used for validation and user display.
	 */
	size?: number;

	/**
	 * Original README filename from the repository
	 * Examples: "README.md", "README.rst", "readme.txt"
	 */
	originalFileName?: string;

	/**
	 * Error message if fetch failed
	 * Populated when fetchStatus is 'failed'.
	 */
	errorMessage?: string;
}

/**
 * GitHub README API response
 *
 * Response structure from GET api.github.com/repos/{owner}/{repo}/readme
 */
export interface GitHubReadmeResponse {
	/** README filename (e.g., "README.md") */
	name: string;

	/** README path in repository (e.g., "README.md") */
	path: string;

	/** SHA of the README blob (for change detection) */
	sha: string;

	/** File size in bytes */
	size: number;

	/** Content encoding (typically "base64") */
	encoding: string;

	/** Base64-encoded README content */
	content: string;

	/** URL to view the README on GitHub */
	html_url: string;
}

/**
 * README conflict detection result
 *
 * Returned by conflict detector to determine if user intervention is needed.
 */
export interface ReadmeConflictDetection {
	/**
	 * Whether a conflict exists between local and remote versions
	 */
	hasConflict: boolean;

	/**
	 * Conflict state
	 */
	state: ReadmeConflictState;

	/**
	 * Short explanation for the conflict decision
	 */
	reason: string;

	/**
	 * Whether the local README file has been modified
	 */
	localModified: boolean;

	/**
	 * Whether the remote README has changed (different SHA)
	 */
	remoteModified: boolean;

	/**
	 * SHA of the local README (from checkpoint)
	 */
	localSha?: string;

	/**
	 * SHA of the remote README (from GitHub API)
	 */
	remoteSha?: string;
}

/**
 * README fetch result
 *
 * Returned by README fetcher to indicate success or failure.
 */
export interface ReadmeFetchResult {
	/**
	 * Repository identifier (owner/repo)
	 */
	repository: string;

	/**
	 * Whether the fetch was successful
	 */
	success: boolean;

	/**
	 * README metadata (if successful)
	 */
	metadata?: ReadmeMetadata;

	/**
	 * Error that occurred (if failed)
	 */
	error?: Error;

	/**
	 * Whether the README was skipped (SHA unchanged)
	 */
	skipped: boolean;

	/**
	 * Skip reason (if skipped)
	 */
	skipReason?: "sha_unchanged" | "not_available" | "too_large";
}

/**
 * README vault file information
 *
 * Metadata about a README file stored in the vault.
 */
export interface VaultReadmeFile {
	/**
	 * Repository owner/name
	 */
	repository: string;

	/**
	 * Vault file path (relative to vault root)
	 */
	filePath: string;

	/**
	 * README content
	 */
	content: string;

	/**
	 * README SHA from GitHub
	 */
	sha: string;

	/**
	 * File size in bytes
	 */
	size: number;

	/**
	 * When the README was fetched
	 */
	fetchedAt: Date;

	/**
	 * Original README filename from repository
	 */
	originalFileName: string;
}
