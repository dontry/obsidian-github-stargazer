/**
 * Path utilities for repository file organization
 * @feature 006-repo-metadata-frontmatter
 * @module utils/path-utils
 */

const MAX_PATH_SEGMENT_LENGTH = 100; // Further reduced to keep full path well under 500 chars

/**
 * Sanitize a path segment (owner or repository name) for cross-platform compatibility
 * Replaces invalid filesystem characters with hyphens
 * @param segment - Path segment to sanitize
 * @returns Sanitized path segment safe for all operating systems
 */
export function sanitizePathSegment(segment: string): string {
	// Replace all invalid characters including spaces with hyphen
	let sanitized = segment.replace(/[\\/:*?"<>|\s]/g, '-');

	// Handle multiple consecutive hyphens
	sanitized = sanitized.replace(/-+/g, '-');

	// Remove leading/trailing hyphens
	sanitized = sanitized.replace(/^-+|-+$/g, '');

	// Handle empty string (if all chars were invalid)
	if (sanitized.length === 0) {
		sanitized = 'unnamed';
	}

	// Truncate to prevent filesystem path length issues
	if (sanitized.length > MAX_PATH_SEGMENT_LENGTH) {
		sanitized = sanitized.substring(0, MAX_PATH_SEGMENT_LENGTH);
	}

	return sanitized;
}

/**
 * Generate the file path for a repository's metadata file
 * @param owner - Repository owner login
 * @param repo - Repository name
 * @returns Relative path to metadata file (e.g., "owner/repo/owner-repo-metadata.md")
 */
export function generateMetadataFilePath(owner: string, repo: string): string {
	const sanitizedOwner = sanitizePathSegment(owner);
	const sanitizedRepo = sanitizePathSegment(repo);
	const fileName = `${sanitizedOwner}-${sanitizedRepo}-metadata.md`;
	return `${sanitizedOwner}/${sanitizedRepo}/${fileName}`;
}

/**
 * Generate the file path for a repository's README file
 * @param owner - Repository owner login
 * @param repo - Repository name
 * @returns Relative path to README file (e.g., "owner/repo/owner-repo-readme.md")
 */
export function generateReadmeFilePath(owner: string, repo: string): string {
	const sanitizedOwner = sanitizePathSegment(owner);
	const sanitizedRepo = sanitizePathSegment(repo);
	const fileName = `${sanitizedOwner}-${sanitizedRepo}-readme.md`;
	return `${sanitizedOwner}/${sanitizedRepo}/${fileName}`;
}
