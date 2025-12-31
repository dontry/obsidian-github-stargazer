/**
 * URL validation utilities
 * @module url-validator
 */

/**
 * Validates if a string is a valid HTTP or HTTPS URL
 *
 * @param urlString - The URL string to validate
 * @returns true if the URL is valid, false otherwise
 *
 * @example
 * ```typescript
 * isValidUrl("https://github.com/owner/repo") // true
 * isValidUrl("http://example.com") // true
 * isValidUrl("not-a-url") // false
 * isValidUrl("ftp://server.com") // false
 * ```
 */
export function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		// Only allow http and https protocols
		return url.protocol === 'http:' || url.protocol === 'https:';
	} catch {
		// URL constructor throws if the string is not a valid URL
		return false;
	}
}

/**
 * Validates if a string is a valid GitHub repository URL
 *
 * @param urlString - The URL string to validate
 * @returns true if the URL is a valid GitHub repository URL, false otherwise
 *
 * @example
 * ```typescript
 * isGitHubRepoUrl("https://github.com/owner/repo") // true
 * isGitHubRepoUrl("https://github.com/owner/repo/") // true
 * isGitHubRepoUrl("https://github.com/owner") // false
 * isGitHubRepoUrl("https://example.com/owner/repo") // false
 * ```
 */
export function isGitHubRepoUrl(urlString: string): boolean {
	if (!isValidUrl(urlString)) {
		return false;
	}

	try {
		const url = new URL(urlString);
		// Must be github.com domain
		if (url.hostname !== 'github.com' && url.hostname !== 'www.github.com') {
			return false;
		}

		// Must have path matching /owner/repo format
		const pathMatch = url.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
		return pathMatch !== null;
	} catch {
		return false;
	}
}
