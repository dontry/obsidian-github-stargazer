/**
 * Rate limiter for GitHub API requests
 * Implements client-side rate limiting with exponential backoff
 *
 * Supports both GraphQL API (query cost) and REST API (request count) rate limits.
 */
export class RateLimiter {
	// GraphQL API rate limit
	private graphqlRemaining: number = 5000;
	private graphqlLimit: number = 5000;
	private graphqlUsed: number = 0;
	private lastReportedUsed: number | null = null;

	// REST API rate limit (authenticated: 5000 requests/hour)
	private restRemaining: number = 5000;
	private restLimit: number = 5000;
	private restUsed: number = 0;

	private resetAt: Date | null = null;

	/**
	 * Track a GraphQL query and update rate limit information
	 *
	 * @param cost - Query cost (from GraphQL API response)
	 * @param used - Total points used (from GraphQL API response)
	 * @param resetAt - When the rate limit resets (optional)
	 */
	/**
	 * Track a GraphQL query and update rate limit information
	 *
	 * @param cost - Query cost (from GraphQL API response)
	 * @param used - Total points used (from GraphQL API response)
	 * @param resetAt - When the rate limit resets (optional)
	 */
	trackQuery(cost: number, used: number, resetAt?: Date): void {
		// Update remaining based on total used from API
		this.graphqlRemaining = Math.max(0, this.graphqlLimit - used);

		// Set total used directly from API response
		// The GraphQL API provides accurate total usage, so we use it directly
		this.graphqlUsed = used;
		this.lastReportedUsed = used;

		if (resetAt) {
			this.resetAt = resetAt;
		}
	}

	/**
	 * Track a REST API request and update rate limit information
	 *
	 * GitHub REST API uses different headers (x-ratelimit-remaining, etc.)
	 * This method should be called after each REST API request.
	 *
	 * @param remaining - Remaining requests from response headers
	 * @param limit - Rate limit from response headers
	 * @param resetAt - When the rate limit resets (Unix timestamp or Date)
	 */
	trackRestRequest(
		remaining: number,
		limit: number,
		resetAt?: number | Date,
	): void {
		this.restRemaining = remaining;
		this.restLimit = limit;
		this.restUsed = limit - remaining;

		if (resetAt) {
			this.resetAt =
				resetAt instanceof Date ? resetAt : new Date(resetAt * 1000);
		}
	}

	/**
	 * Set the reset time from rate limit headers
	 */
	setResetTime(resetAt: Date): void {
		this.resetAt = resetAt;
	}

	/**
	 * Check if we should throttle requests
	 * Returns true if remaining points are below 20% threshold
	 *
	 * Checks both GraphQL and REST API limits.
	 */
	/**
	 * Check if we should throttle requests
	 * Returns true if remaining points are at or below 20% threshold
	 *
	 * Checks both GraphQL and REST API limits.
	 */
	shouldThrottle(): boolean {
		const threshold = this.restLimit * 0.2; // 20% threshold for REST
		const graphqlThreshold = this.graphqlLimit * 0.2; // 20% threshold for GraphQL

		return (
			this.restRemaining <= threshold || this.graphqlRemaining <= graphqlThreshold
		);
	}

	/**
	 * Get time until rate limit reset in milliseconds
	 */
	getTimeUntilReset(): number {
		if (!this.resetAt) {
			return 0;
		}
		const now = new Date();
		const diff = this.resetAt.getTime() - now.getTime();
		return Math.max(0, diff);
	}

	/**
	 * Get current rate limit information
	 *
	 * @returns Object containing both REST and GraphQL rate limit info
	 */
	getInfo(): {
		rest: { limit: number; remaining: number; used: number };
		graphql: { limit: number; remaining: number; used: number };
		resetAt: Date | null;
	} {
		return {
			rest: {
				limit: this.restLimit,
				remaining: this.restRemaining,
				used: this.restUsed,
			},
			graphql: {
				limit: this.graphqlLimit,
				remaining: this.graphqlRemaining,
				used: this.graphqlUsed,
			},
			resetAt: this.resetAt,
		};
	}

	/**
	 * Get REST API specific rate limit info
	 *
	 * @returns REST API rate limit information
	 */
	getRestInfo(): { limit: number; remaining: number; used: number } {
		return {
			limit: this.restLimit,
			remaining: this.restRemaining,
			used: this.restUsed,
		};
	}

	/**
	 * Get GraphQL specific rate limit info
	 *
	 * @returns GraphQL API rate limit information
	 */
	getGraphqlInfo(): { limit: number; remaining: number; used: number } {
		return {
			limit: this.graphqlLimit,
			remaining: this.graphqlRemaining,
			used: this.graphqlUsed,
		};
	}

	/**
	 * Wait for rate limit reset with exponential backoff
	 *
	 * Called when approaching or hitting rate limits. Waits until the rate limit
	 * resets, using exponential backoff for safety margin.
	 *
	 * @param retryCount - Number of retries attempted (for exponential backoff)
	 * @returns Promise that resolves when it's safe to resume requests
	 */
	async waitForRateLimitReset(retryCount = 0): Promise<void> {
		const timeUntilReset = this.getTimeUntilReset();

		if (timeUntilReset <= 0) {
			// Reset time has passed - safe to proceed
			return;
		}

		// Calculate exponential backoff delay
		// Base delay: time until reset
		// Exponential backoff: add 1s, 2s, 4s based on retry count
		const exponentialBackoff = 2 ** retryCount * 1000; // 1s, 2s, 4s, 8s...
		const safetyMargin = 1000; // 1 second safety margin
		const totalDelay = timeUntilReset + exponentialBackoff + safetyMargin;

		console.warn("Rate limit approached, waiting for reset", {
			waitTimeMs: totalDelay,
			retryCount,
		});

		// Wait for reset + backoff
		await new Promise((resolve) => setTimeout(resolve, totalDelay));

		console.debug("Rate limit reset wait complete, resuming requests");
	}

	/**
	 * Check if we should wait before making more requests
	 *
	 * Returns true if we're approaching rate limits and should pause.
	 *
	 * @returns true if we should wait, false otherwise
	 */
	shouldWaitForRateLimit(): boolean {
		return this.shouldThrottle();
	}
}
