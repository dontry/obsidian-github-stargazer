/**
 * Validation Utilities
 *
 * Common validation functions for README fetching and vault file operations.
 */

import {
	README_FILENAME_FORMAT,
	README_MAX_FILE_SIZE,
} from "../config/readme-config.js";
import { ReadmeTooLargeError } from "../types/errors.js";

/**
 * Validate README file size against maximum allowed size
 *
 * @param size - File size in bytes
 * @param repository - Repository identifier (for error context)
 * @throws {ReadmeTooLargeError} If size exceeds README_MAX_FILE_SIZE
 * @returns true if size is valid
 */
export function validateReadmeSize(size: number, repository: string): boolean {
	if (size > README_MAX_FILE_SIZE) {
		throw new ReadmeTooLargeError(repository, size, README_MAX_FILE_SIZE);
	}
	if (size <= 0) {
		throw new Error(`README size must be positive (got ${size} bytes)`);
	}
	return true;
}

/**
 * Sanitize a repository name for safe file naming
 *
 * Removes or replaces characters that are problematic in file names:
 * - Spaces → underscores
 * - Special characters (< > : " / \ | ? *) → removed
 * - Leading/trailing dots and spaces → removed
 *
 * @param name - Repository owner or repository name
 * @returns Sanitized name safe for use in file paths
 */
export function sanitizeFileName(name: string): string {
	let sanitized = name;

	// Remove leading/trailing dots and spaces FIRST (before replacing spaces with underscores)
	sanitized = sanitized.replace(/^[.\s]+|[.\s]+$/g, "");

	// Replace spaces with underscores
	sanitized = sanitized.replace(/\s+/g, "_");

	// Remove characters invalid in Windows/Linux file paths
	sanitized = sanitized.replace(/[<>:"/\\|?*]/g, "");

	// Remove any remaining underscores at the beginning or end (from converted spaces)
	sanitized = sanitized.replace(/^_+|_+$/g, "");

	// Ensure name is not empty after sanitization
	if (!sanitized) {
		sanitized = "unnamed";
	}

	// Limit length to reasonable file name length (255 chars max for most file systems)
	const MAX_FILENAME_LENGTH = 200; // Leave room for "-README.md" suffix
	if (sanitized.length > MAX_FILENAME_LENGTH) {
		sanitized = sanitized.substring(0, MAX_FILENAME_LENGTH);
	}

	return sanitized;
}

/**
 * Generate README vault file path from owner and repository name
 *
 * Creates a file path following the pattern: {owner}-{repo}-README.md
 * Names are sanitized to ensure file system compatibility.
 *
 * @param owner - Repository owner/organization name
 * @param repo - Repository name
 * @returns Vault file path (relative to vault root)
 */
export function generateReadmeFilePath(owner: string, repo: string): string {
	const sanitizedOwner = sanitizeFileName(owner);
	const sanitizedRepo = sanitizeFileName(repo);
	
	// Combine owner and repo
	let filePath = README_FILENAME_FORMAT.replace("{owner}", sanitizedOwner).replace(
		"{repo}",
		sanitizedRepo,
	);
	
	// Ensure total path length fits in filesystem limit (255 chars max, but we use 254 to be safe)
	const MAX_PATH_LENGTH = 254;
	if (filePath.length > MAX_PATH_LENGTH) {
		// Calculate how much we need to trim
		const suffix = "-README.md";
		const ownerRepoLength = filePath.length;
		const overflow = ownerRepoLength - MAX_PATH_LENGTH;
		
		// Trim from both owner and repo proportionally, but ensure each gets at least 20 chars
		const minNameLength = 20;
		const availableTrim = sanitizedOwner.length + sanitizedRepo.length - (minNameLength * 2);
		
		if (availableTrim > 0) {
			const ownerTrim = Math.floor((sanitizedOwner.length / (sanitizedOwner.length + sanitizedRepo.length)) * overflow);
			const repoTrim = overflow - ownerTrim;
			
			const trimmedOwner = sanitizedOwner.substring(0, Math.max(minNameLength, sanitizedOwner.length - ownerTrim));
			const trimmedRepo = sanitizedRepo.substring(0, Math.max(minNameLength, sanitizedRepo.length - repoTrim));
			
			filePath = README_FILENAME_FORMAT.replace("{owner}", trimmedOwner).replace(
				"{repo}",
				trimmedRepo,
			);
		} else {
			// Fallback: just truncate the whole path
			filePath = filePath.substring(0, MAX_PATH_LENGTH);
		}
	}
	
	return filePath;
}

/**
 * Validate that a file path does not contain directory traversal attempts
 *
 * @param filePath - File path to validate
 * @throws {Error} If path contains directory traversal patterns
 * @returns true if path is safe
 */
export function validateFilePathSafe(filePath: string): boolean {
	// Check for directory traversal patterns
	if (
		filePath.includes("..") ||
		filePath.includes("~") ||
		filePath.startsWith("/")
	) {
		throw new Error(`Unsafe file path detected: ${filePath}`);
	}

	// Check for absolute path patterns (Unix: /path, Windows: C:/path, C:\path)
	if (filePath.match(/^\/|^[a-zA-Z]:[/\\]/)) {
		throw new Error(`Absolute paths not allowed: ${filePath}`);
	}

	return true;
}

/**
 * Validate README content encoding
 *
 * Checks if content appears to be valid UTF-8 text.
 * This is a basic check - binary files may pass but will be handled during storage.
 *
 * @param content - README content as string
 * @returns true if content appears to be valid text
 */
export function validateReadmeContent(content: string): boolean {
	if (typeof content !== "string") {
		throw new Error("README content must be a string");
	}

	// Check for null bytes (indicator of binary content)
	if (content.includes("\u0000")) {
		throw new Error(
			"README content contains null bytes (likely binary content)",
		);
	}

	// Check if content is empty
	if (content.length === 0) {
		throw new Error("README content is empty");
	}

	return true;
}
