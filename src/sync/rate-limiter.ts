/**
 * Rate limiter for GitHub GraphQL API requests
 * Implements client-side rate limiting with exponential backoff
 */
export class RateLimiter {
	private remaining: number = 5000;
	private limit: number = 5000;
	private used: number = 0;
	private resetAt: Date | null = null;
	private lastReportedUsed: number | null = null;

	/**
	 * Track a query and update rate limit information
	 */
	trackQuery(cost: number, used: number, resetAt?: Date): void {
		const delta =
			this.lastReportedUsed === null
				? cost
				: Math.max(0, used - this.lastReportedUsed);

		this.used += delta;
		this.remaining = Math.max(0, this.limit - used);
		this.lastReportedUsed = used;

		if (resetAt) {
			this.resetAt = resetAt;
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
	 */
	shouldThrottle(): boolean {
		const threshold = this.limit * 0.2; // 20% threshold
		return this.remaining < threshold;
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
	 */
	getInfo(): { limit: number; remaining: number; used: number; resetAt: Date | null } {
		return {
			limit: this.limit,
			remaining: this.remaining,
			used: this.used,
			resetAt: this.resetAt,
		};
	}
}
