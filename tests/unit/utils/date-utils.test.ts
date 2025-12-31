import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatDate, compareDates, isDateWithinDays, getCurrentTimestamp } from '@/utils/date-utils';

describe('date-utils', () => {
	describe('formatDate', () => {
		it('should format date in short format', () => {
			const result = formatDate('2025-12-30T12:00:00Z', 'short');
			expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
		});

		it('should format date in long format', () => {
			const result = formatDate('2025-12-30T12:00:00Z', 'long');
			expect(result).toContain('December');
			expect(result).toContain('2025');
		});

		it('should format date in relative format for recent dates', () => {
			const now = new Date();
			const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
			const result = formatDate(oneHourAgo.toISOString(), 'relative');
			expect(result).toContain('hour');
		});

		it('should default to short format', () => {
			const result = formatDate('2025-12-30T12:00:00Z');
			expect(result).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
		});

		it('should return "Invalid date" for invalid date strings', () => {
			const result = formatDate('invalid-date', 'short');
			expect(result).toBe('Invalid date');
		});

		it('should format dates as "just now" for very recent times', () => {
			const now = new Date();
			const thirtySecondsAgo = new Date(now.getTime() - 30 * 1000);
			const result = formatDate(thirtySecondsAgo.toISOString(), 'relative');
			expect(result).toContain('just now');
		});
	});

	describe('compareDates', () => {
		it('should return -1 when first date is earlier', () => {
			const result = compareDates('2025-12-30T12:00:00Z', '2025-12-31T12:00:00Z');
			expect(result).toBe(-1);
		});

		it('should return 1 when first date is later', () => {
			const result = compareDates('2025-12-31T12:00:00Z', '2025-12-30T12:00:00Z');
			expect(result).toBe(1);
		});

		it('should return 0 when dates are equal', () => {
			const result = compareDates('2025-12-30T12:00:00Z', '2025-12-30T12:00:00Z');
			expect(result).toBe(0);
		});
	});

	describe('isDateWithinDays', () => {
		it('should return true for dates within the specified days', () => {
			const now = new Date();
			const twoDaysAgo = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000);
			const result = isDateWithinDays(twoDaysAgo.toISOString(), 7);
			expect(result).toBe(true);
		});

		it('should return false for dates older than specified days', () => {
			const now = new Date();
			const tenDaysAgo = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
			const result = isDateWithinDays(tenDaysAgo.toISOString(), 7);
			expect(result).toBe(false);
		});

		it('should return true for today', () => {
			const now = new Date();
			const result = isDateWithinDays(now.toISOString(), 7);
			expect(result).toBe(true);
		});

		it('should return true for exactly the boundary day', () => {
			const now = new Date();
			const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
			const result = isDateWithinDays(sevenDaysAgo.toISOString(), 7);
			expect(result).toBe(true);
		});
	});

	describe('getCurrentTimestamp', () => {
		it('should return a valid ISO8601 timestamp', () => {
			const timestamp = getCurrentTimestamp();
			expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
		});

		it('should return a timestamp that can be parsed by Date constructor', () => {
			const timestamp = getCurrentTimestamp();
			const date = new Date(timestamp);
			expect(date.getTime()).not.toBeNaN();
		});

		it('should return a timestamp close to the current time', () => {
			const before = new Date();
			const timestamp = getCurrentTimestamp();
			const after = new Date();
			const date = new Date(timestamp);
			expect(date.getTime()).toBeGreaterThanOrEqual(before.getTime());
			expect(date.getTime()).toBeLessThanOrEqual(after.getTime());
		});
	});
});
