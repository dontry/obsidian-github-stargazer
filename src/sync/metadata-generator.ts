/**
 * Metadata generator for repository YAML frontmatter
 * @feature 006-repo-metadata-frontmatter
 * @module sync/metadata-generator
 */

import type { Repository, RepositoryMetadata } from "@/types";
import { generateMetadataFilePath } from "@/utils/path-utils";

/**
 * Escape a value for safe YAML serialization
 * @param value - Value to escape (string, number, boolean, null, etc.)
 * @returns Escaped YAML-safe string
 */
export function escapeYaml(value: unknown): string {
	if (value === null || value === undefined) {
		return "null";
	}

	if (typeof value === "boolean") {
		return value ? "true" : "false";
	}

	if (typeof value === "number") {
		return String(value);
	}

	// eslint-disable-next-line @typescript-eslint/no-base-to-string
	const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

	// Empty string
	if (str.length === 0) {
		return '""';
	}

	// Check if value needs quoting
	// URLs are safe unquoted even with colons
	const isUrl = /^https?:\/\//.test(str);
	const isHexColor = /^#[0-9a-fA-F]{3,8}$/.test(str);
	// Strings with only letters, numbers, spaces, hyphens, underscores, periods, forward slashes, hash, at sign don't need quotes
	// Colons require quoting to avoid YAML ambiguity (except in URLs)
	const isSimpleString = /^[a-zA-Z0-9\s\-_./#@]+$/;
	// Quote if contains colon, quote, newline, tab, or is a YAML keyword (but not URLs or hex colors)
	const hasSpecialChars = /:|["'\n\r\t]|^null$|^true$|^false$|^~$/.test(str);
	const needsQuotes =
		!isUrl && !isHexColor && (!isSimpleString.test(str) || hasSpecialChars);

	if (needsQuotes) {
		// Escape quotes, backslashes, and newlines
		const escaped = str
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\n/g, "\\n")
			.replace(/\r/g, "\\r")
			.replace(/\t/g, "\\t");
		return `"${escaped}"`;
	}

	return str;
}

/**
 * Generate YAML frontmatter from repository metadata
 * @param metadata - Repository metadata object
 * @returns YAML frontmatter block as string (with --- delimiters)
 */
export function generateFrontmatter(metadata: RepositoryMetadata): string {
	const lines: string[] = ["---"];

	// Basic info
	lines.push(`name: ${escapeYaml(metadata.name)}`);
	lines.push(`fullName: ${escapeYaml(metadata.fullName)}`);
	lines.push(`description: ${escapeYaml(metadata.description)}`);
	lines.push(`starCount: ${metadata.starCount}`);
	lines.push(`language: ${escapeYaml(metadata.primaryLanguage)}`);

	// Primary language object
	if (metadata.primaryLanguage) {
		lines.push(`primaryLanguage: ${escapeYaml(metadata.primaryLanguage)}`);
	} else {
		lines.push("primaryLanguage: null");
	}

	// Topics array
	if (metadata.tags && metadata.tags.length > 0) {
		lines.push("tags:");
		for (const tag of metadata.tags) {
			lines.push(`  - ${escapeYaml(tag)}`);
		}
	}

	// Links and dates
	lines.push(`url: ${escapeYaml(metadata.url)}`);
	lines.push(`ownerLogin: ${escapeYaml(metadata.ownerLogin)}`);
	lines.push(`createdAt: ${escapeYaml(metadata.createdAt)}`);
	lines.push(`updatedAt: ${escapeYaml(metadata.updatedAt)}`);

	// Optional fields
	lines.push(`homepageUrl: ${escapeYaml(metadata.homepageUrl)}`);
	lines.push(`license: ${escapeYaml(metadata.license)}`);
	lines.push(`forkCount: ${metadata.forkCount}`);
	lines.push(`openIssuesCount: ${metadata.openIssuesCount}`);
	lines.push(`watchersCount: ${metadata.watchersCount}`);

	lines.push("---");
	return lines.join("\n");
}

/**
 * Validate YAML frontmatter format
 * @param frontmatter - YAML frontmatter string to validate
 * @returns Validation result with errors if any
 */
export function validateFrontmatter(frontmatter: string): {
	valid: boolean;
	errors: string[];
} {
	const errors: string[] = [];

	// Must start and end with ---
	if (!frontmatter.startsWith("---\n") && !frontmatter.startsWith("---\r\n")) {
		errors.push("Frontmatter must start with ---");
	}

	if (!frontmatter.endsWith("\n---") && !frontmatter.endsWith("\r\n---")) {
		errors.push("Frontmatter must end with ---");
	}

	// Check for required fields
	const requiredFields = ["name", "fullName", "url", "ownerLogin"];
	for (const field of requiredFields) {
		if (!frontmatter.includes(`${field}:`)) {
			errors.push(`Missing required field: ${field}`);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Metadata generator class for orchestrating metadata generation
 * @feature 006-repo-metadata-frontmatter
 */
export class MetadataGenerator {
	/**
	 * Generate YAML frontmatter from repository object
	 * @param runknown - Repository object from sync
	 * @returns YAML frontmatter block
	 */
	generateFrontmatter(repo: Repository): string {
		// Extract metadata from GraphQL data if available
		const metadata = this.convertRepositoryToMetadata(repo);

		return generateFrontmatter(metadata);
	}

	/**
	 * Generate metadata file path for a repository
	 * @param owner - Repository owner login
	 * @param repo - Repository name
	 * @returns Relative path to metadata file
	 */
	generateMetadataFilePath(owner: string, repo: string): string {
		return generateMetadataFilePath(owner, repo);
	}

	/**unknown
	 * Convert Repository object to RepositoryMetadata
	 * @param repo - Repository object
	 * @returns Repository metadata
	 */
	private convertRepositoryToMetadata(repo: Repository): RepositoryMetadata {
		// Extract language name from primaryLanguage object if available

		return {
			name: repo.name,
			fullName: repo.nameWithOwner,
			description: repo.description,
			starCount: repo.starCount,
			primaryLanguage: repo.primaryLanguage || null,
			tags: repo.topics || [],
			url: repo.url,
			ownerLogin: repo.owner,
			createdAt: repo.createdAt,
			updatedAt: repo.updatedAt,
			homepageUrl: null,
			license: null,
			forkCount: 0,
			openIssuesCount: 0,
			watchersCount: 0,
		};
	}
}
