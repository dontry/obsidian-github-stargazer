import { beforeEach, describe, expect, it } from "vitest";
import { RateLimiter } from "@/sync/rate-limiter";

describe("RateLimiter", () => {
	let rateLimiter: RateLimiter;

	beforeEach(() => {
		rateLimiter = new RateLimiter();
	});

	describe("shouldThrottle", () => {
		it("should return false when remaining points are high", () => {
			rateLimiter.trackQuery(100, 4000);
			expect(rateLimiter.shouldThrottle()).toBe(false);
		});

		it("should return true when remaining points are low (< 20%)", () => {
			rateLimiter.trackQuery(100, 4900);
			expect(rateLimiter.shouldThrottle()).toBe(true);
		});

		it("should return false at exactly 20% threshold", () => {
			rateLimiter.trackQuery(100, 4000);
			expect(rateLimiter.shouldThrottle()).toBe(false);
		});
	});

	describe("waitForReset", () => {
		it("should calculate wait time correctly", () => {
			const resetTime = new Date(Date.now() + 5000);
			rateLimiter.setResetTime(resetTime);

			const waitTime = rateLimiter.getTimeUntilReset();
			expect(waitTime).toBeGreaterThan(0);
			expect(waitTime).toBeLessThanOrEqual(5000);
		});

		it("should return 0 if reset time has passed", () => {
			const pastTime = new Date(Date.now() - 1000);
			rateLimiter.setResetTime(pastTime);

			const waitTime = rateLimiter.getTimeUntilReset();
			expect(waitTime).toBe(0);
		});
	});

	describe("trackQuery", () => {
		it("should update remaining and used points", () => {
			rateLimiter.trackQuery(5, 1000);
			rateLimiter.trackQuery(5, 1005);

			const info = rateLimiter.getInfo();
			expect(info.used).toBe(10);
		});

		it("should track reset time from headers", () => {
			const resetTime = new Date(Date.now() + 3600000);
			rateLimiter.trackQuery(5, 1000, resetTime);

			const info = rateLimiter.getInfo();
			expect(info.resetAt).toEqual(resetTime);
		});
	});

	describe("getInfo", () => {
		it("should return current rate limit info", () => {
			rateLimiter.trackQuery(10, 500);

			const info = rateLimiter.getInfo();
			expect(info.limit).toBe(5000);
			expect(info.remaining).toBeLessThanOrEqual(5000);
			expect(info.used).toBe(10);
		});
	});
});
