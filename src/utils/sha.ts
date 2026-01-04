/**
 * SHA Comparison Utilities
 *
 * Functions for comparing README SHA hashes to detect changes.
 */

import type { GitHubReadmeResponse } from '../types/readme.js';

/**
 * Compare two SHA hashes for equality
 *
 * @param sha1 - First SHA hash (or null if no README)
 * @param sha2 - Second SHA hash (or null if no README)
 * @returns true if SHAs are different (README changed), false if same or both null
 */
export function compareShas(sha1: string | null, sha2: string | null): boolean {
	// Both null - no README on either side, no change
	if (sha1 === null && sha2 === null) {
		return false;
	}

	// One null, one not - README added or removed
	if (sha1 === null || sha2 === null) {
		return true;
	}

	// Compare SHAs
	return sha1 !== sha2;
}

/**
 * Extract SHA from GitHub README API response
 *
 * @param response - GitHub README API response
 * @returns SHA hash string
 * @throws {Error} If response is invalid or missing SHA
 */
export function extractShaFromResponse(response: GitHubReadmeResponse): string {
	if (!response || !response.sha) {
		throw new Error('Invalid GitHub README response: missing SHA');
	}
	return response.sha;
}

/**
 * Validate SHA hash format
 *
 * GitHub SHAs are 40-character hexadecimal strings (SHA-1).
 * This is a basic validation - not a full SHA format check.
 *
 * @param sha - SHA hash to validate
 * @returns true if SHA appears valid
 * @throws {Error} If SHA format is invalid
 */
export function validateShaFormat(sha: string): boolean {
	if (!sha || typeof sha !== 'string') {
		throw new Error('SHA must be a non-empty string');
	}

	// GitHub SHAs are typically 40 hex chars (SHA-1), but can be shorter in some contexts
	// Just check it looks like a hex string
	if (!/^[a-f0-9]+$/i.test(sha)) {
		throw new Error(`Invalid SHA format: ${sha} (expected hexadecimal)`);
	}

	if (sha.length < 4 || sha.length > 64) {
		throw new Error(`Invalid SHA length: ${sha.length} (expected 4-64 characters)`);
	}

	return true;
}

/**
 * Check if a SHA indicates a README change
 *
 * Compares stored SHA from checkpoint with current SHA from GitHub API.
 * Returns true if the README has been updated on GitHub.
 *
 * @param storedSha - SHA from last sync (or null if first sync)
 * @param currentSha - SHA from GitHub API (or null if no README)
 * @returns true if README changed, false if unchanged or both absent
 */
export function hasReadmeChanged(storedSha: string | null, currentSha: string | null): boolean {
	return compareShas(storedSha, currentSha);
}

/**
 * Format SHA for display (truncate to reasonable length)
 *
 * @param sha - Full SHA hash
 * @param length - Number of characters to keep (default: 7, like git)
 * @returns Truncated SHA with "..." suffix if truncated
 */
export function formatShaForDisplay(sha: string, length: number = 7): string {
	if (!sha) {
		return 'none';
	}

	if (sha.length <= length) {
		return sha;
	}

	return `${sha.substring(0, length)}...`;
}
