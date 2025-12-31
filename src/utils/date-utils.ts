/**
 * Date formatting and comparison utilities
 * @module date-utils
 */

/**
 * Formats an ISO8601 date string to a human-readable format
 *
 * @param dateString - ISO8601 date string
 * @param format - The format to use ('short', 'long', 'relative')
 * @returns Formatted date string
 *
 * @example
 * ```typescript
 * formatDate("2025-12-30T12:00:00Z", "short") // "12/30/2025"
 * formatDate("2025-12-30T12:00:00Z", "long") // "December 30, 2025"
 * formatDate("2025-12-30T12:00:00Z", "relative") // "2 hours ago"
 * ```
 */
export function formatDate(
	dateString: string,
	format: 'short' | 'long' | 'relative' = 'short'
): string {
	const date = new Date(dateString);

	if (isNaN(date.getTime())) {
		return 'Invalid date';
	}

	switch (format) {
		case 'short':
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'numeric',
				day: 'numeric',
			});

		case 'long':
			return date.toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit',
			});

		case 'relative':
			return getRelativeTimeString(date);

		default:
			return date.toLocaleDateString();
	}
}

/**
 * Returns a relative time string (e.g., "2 hours ago")
 *
 * @param date - The date to format
 * @returns Relative time string
 */
function getRelativeTimeString(date: Date): string {
	const now = new Date();
	const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

	if (diffInSeconds < 60) {
		return diffInSeconds <= 1 ? 'just now' : `${diffInSeconds} seconds ago`;
	}

	const diffInMinutes = Math.floor(diffInSeconds / 60);
	if (diffInMinutes < 60) {
		return diffInMinutes === 1 ? '1 minute ago' : `${diffInMinutes} minutes ago`;
	}

	const diffInHours = Math.floor(diffInMinutes / 60);
	if (diffInHours < 24) {
		return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
	}

	const diffInDays = Math.floor(diffInHours / 24);
	if (diffInDays < 7) {
		return diffInDays === 1 ? '1 day ago' : `${diffInDays} days ago`;
	}

	const diffInWeeks = Math.floor(diffInDays / 7);
	if (diffInWeeks < 4) {
		return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
	}

	const diffInMonths = Math.floor(diffInDays / 30);
	if (diffInMonths < 12) {
		return diffInMonths === 1 ? '1 month ago' : `${diffInMonths} months ago`;
	}

	const diffInYears = Math.floor(diffInDays / 365);
	return diffInYears === 1 ? '1 year ago' : `${diffInYears} years ago`;
}

/**
 * Compares two dates and returns the comparison result
 *
 * @param date1 - First date string (ISO8601)
 * @param date2 - Second date string (ISO8601)
 * @returns -1 if date1 < date2, 0 if equal, 1 if date1 > date2
 *
 * @example
 * ```typescript
 * compareDates("2025-12-30T12:00:00Z", "2025-12-31T12:00:00Z") // -1
 * compareDates("2025-12-31T12:00:00Z", "2025-12-30T12:00:00Z") // 1
 * compareDates("2025-12-30T12:00:00Z", "2025-12-30T12:00:00Z") // 0
 * ```
 */
export function compareDates(date1: string, date2: string): number {
	const d1 = new Date(date1);
	const d2 = new Date(date2);

	if (d1 < d2) return -1;
	if (d1 > d2) return 1;
	return 0;
}

/**
 * Checks if a date is within the last N days
 *
 * @param dateString - ISO8601 date string to check
 * @param days - Number of days to look back
 * @returns true if the date is within the last N days
 *
 * @example
 * ```typescript
 * isDateWithinDays("2025-12-30T12:00:00Z", 7) // true if within last week
 * ```
 */
export function isDateWithinDays(dateString: string, days: number): boolean {
	const date = new Date(dateString);
	const now = new Date();
	const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
	return diffInDays >= 0 && diffInDays <= days;
}

/**
 * Gets the current timestamp in ISO8601 format
 *
 * @returns Current timestamp as ISO8601 string
 */
export function getCurrentTimestamp(): string {
	return new Date().toISOString();
}
