/**
 * Path utilities for repository file organization
 * @feature 006-repo-metadata-frontmatter
 * @module utils/path-utils
 */

const MAX_PATH_SEGMENT_LENGTH = 200; // Individual path segment cap
const MAX_FULL_PATH_LENGTH = 499; // Keep generated paths below Windows MAX_PATH

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
	return generateRepositoryFilePath(owner, repo, "metadata.md");
}

/**
 * Generate the file path for a repository's README file
 * @param owner - Repository owner login
 * @param repo - Repository name
 * @returns Relative path to README file (e.g., "owner/repo/owner-repo-readme.md")
 */
export function generateReadmeFilePath(owner: string, repo: string): string {
	return generateRepositoryFilePath(owner, repo, "readme.md");
}

function generateRepositoryFilePath(
	owner: string,
	repo: string,
	suffix: "metadata.md" | "readme.md",
): string {
	let sanitizedOwner = sanitizePathSegment(owner);
	let sanitizedRepo = sanitizePathSegment(repo);
	let fileName = `${sanitizedOwner}-${sanitizedRepo}-${suffix}`;
	let fullPath = `${sanitizedOwner}/${sanitizedRepo}/${fileName}`;

	if (fullPath.length < MAX_FULL_PATH_LENGTH) {
		return fullPath;
	}

	const overflow = fullPath.length - MAX_FULL_PATH_LENGTH + 1;
	const repoBudget = Math.max(1, sanitizedRepo.length - overflow);
	sanitizedRepo = sanitizedRepo.substring(0, repoBudget);
	fileName = `${sanitizedOwner}-${sanitizedRepo}-${suffix}`;
	fullPath = `${sanitizedOwner}/${sanitizedRepo}/${fileName}`;

	if (fullPath.length < MAX_FULL_PATH_LENGTH) {
		return fullPath;
	}

	const ownerOverflow = fullPath.length - MAX_FULL_PATH_LENGTH + 1;
	const ownerBudget = Math.max(1, sanitizedOwner.length - ownerOverflow);
	sanitizedOwner = sanitizedOwner.substring(0, ownerBudget);
	fileName = `${sanitizedOwner}-${sanitizedRepo}-${suffix}`;
	return `${sanitizedOwner}/${sanitizedRepo}/${fileName}`;
}
