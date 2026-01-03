/**
 * Logging utilities for GitHub Stargazer plugin
 * @module logger
 */

/**
 * Sanitized error data for safe logging (excludes sensitive information)
 */
interface SafeErrorData {
	/** Error type or name */
	type?: string;
	/** Error message */
	message: string;
	/** Additional context (excluding sensitive data) */
	context?: Record<string, unknown>;
}

/**
 * Sanitize error data for logging (removes sensitive information)
 * @param error - Error object or message
 * @returns Safe error data without tokens or full payloads
 */
function sanitizeError(error: unknown): SafeErrorData {
	if (error instanceof Error) {
		return {
			type: error.name,
			message: error.message,
		};
	}

	if (typeof error === 'string') {
		return { message: error };
	}

	if (typeof error === 'object' && error !== null) {
		// Extract type and message, exclude stack traces (may contain tokens)
		const { type, message } = error as Record<string, unknown>;
		return {
			type: typeof type === 'string' ? type : undefined,
			message: typeof message === 'string' ? message : 'Unknown error',
		};
	}

	return { message: 'Unknown error' };
}

/**
 * Log an informational message
 * @param message - Message to log
 * @param context - Optional contextual data (must not contain sensitive data)
 */
export function info(message: string, context?: Record<string, unknown>): void {
	const logData = context ? { message, ...context } : { message };
	console.warn(`[GitHubStargazer]`, JSON.stringify(logData));
}

/**
 * Log a warning message
 * @param message - Warning message to log
 * @param context - Optional contextual data (must not contain sensitive data)
 */
export function warn(message: string, context?: Record<string, unknown>): void {
	const logData = context ? { message, ...context } : { message };
	console.warn(`[GitHubStargazer]`, JSON.stringify(logData));
}

/**
 * Log an error message without sensitive data
 * IMPORTANT: Never logs GitHub tokens, full request/response payloads, or stack traces
 * @param message - Error message
 * @param error - Error object or data
 */
export function error(message: string, error: unknown): void {
	const safeData = sanitizeError(error);
	console.error(`[GitHubStargazer]`, JSON.stringify({ errorMessage: message, ...safeData }));
}

/**
 * Log a sync lifecycle event
 * @param event - Type of lifecycle event
 * @param data - Event data (must not contain sensitive data)
 */
export function logSyncEvent(
	event:
		| 'sync_started'
		| 'sync_resumed'
		| 'sync_completed'
		| 'sync_failed'
		| 'page_fetched'
		| 'retry_attempted'
		| 'checkpoint_written'
		| 'checkpoint_loaded',
	data: Record<string, unknown>
): void {
	info(`Sync event: ${event}`, data);
}
