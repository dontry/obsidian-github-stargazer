import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubGraphQLClient } from "@/sync/github-client";
import { requestUrl } from "@/../tests/mocks/obsidian";

vi.mocked(requestUrl);

describe("GitHubGraphQLClient", () => {
	let client: GitHubGraphQLClient;
	const mockToken = "ghp_test_token_123456789012345678901234567890";

	beforeEach(() => {
		client = new GitHubGraphQLClient(mockToken);
		vi.clearAllMocks();
	});

	describe("fetchStarredRepositories", () => {
		it("should fetch starred repositories with pagination", async () => {
			const mockResponse = {
				viewer: {
					starredRepositories: {
						pageInfo: {
							hasNextPage: false,
							endCursor: "cursor123",
						},
						edges: [],
					},
				},
			};

			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				text: JSON.stringify(mockResponse),
				json: async () => mockResponse,
				headers: {},
			});

			const result = await client.fetchStarredRepositories(null, 10);

			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://api.github.com/graphql",
					method: "POST",
					headers: {
						Authorization: `Bearer ${mockToken}`,
						"Content-Type": "application/json",
					},
				}),
			);
		});

		it("should handle authentication errors", async () => {
			vi.mocked(requestUrl).mockResolvedValue({
				status: 401,
				text: "Unauthorized",
				json: async () => ({}),
				headers: {},
			});

			await expect(client.fetchStarredRepositories(null, 10)).rejects.toThrow(
				"Authentication failed. Please check your GitHub token.",
			);
		});
	});

	describe("unstarRepository", () => {
		it("should send unstar mutation", async () => {
			const mockResponse = {
				data: {
					removeStar: {
						clientMutationId: "id123",
					},
				},
			};

			vi.mocked(requestUrl).mockResolvedValue({
				status: 200,
				text: JSON.stringify(mockResponse),
				json: async () => mockResponse,
				headers: {},
			});

			await client.unstarRepository("MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw");

			expect(requestUrl).toHaveBeenCalledWith(
				expect.objectContaining({
					url: "https://api.github.com/graphql",
					method: "POST",
					headers: {
						Authorization: `Bearer ${mockToken}`,
						"Content-Type": "application/json",
					},
				}),
			);
		});
	});

	// T017: Unit test for exponential backoff retry (3 retries, 1s/2s/4s delays)
	describe("Retry Logic (T017)", () => {
		it("should retry transient errors up to 3 times with exponential backoff", async () => {
			const mockResponse = {
				viewer: {
					starredRepositories: {
						pageInfo: {
							hasNextPage: false,
							endCursor: "cursor123",
						},
						edges: [],
					},
				},
			};

			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				if (attemptCount < 3) {
					// First 2 attempts fail with transient error
					throw new Error("ETIMEDOUT");
				}
				// 3rd attempt succeeds
				return {
					status: 200,
					text: JSON.stringify(mockResponse),
					json: async () => mockResponse,
					headers: {},
				};
			});

			const startTime = Date.now();
			const result = await client.fetchStarredRepositories(null, 10);
			const elapsedTime = Date.now() - startTime;

			expect(result).toBeDefined();
			expect(attemptCount).toBe(3);

			// Verify exponential backoff: 1s + 2s = 3s minimum (allow some margin)
			expect(elapsedTime).toBeGreaterThanOrEqual(2900);
		});

		it("should fail after 3 retry attempts", async () => {
			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				throw new Error("ETIMEDOUT");
			});

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow("ETIMEDOUT");

			// Should have attempted 4 times (1 initial + 3 retries)
			expect(attemptCount).toBe(4);
		}, 10000); // 10 second timeout (1s + 2s + 4s delays + margin)

		it("should wait 1 second before first retry", async () => {
			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				if (attemptCount === 1) {
					throw new Error("ETIMEDOUT");
				}
				return {
					status: 200,
					text: "{}",
					json: async () => ({ viewer: { starredRepositories: { pageInfo: { hasNextPage: false, endCursor: "" }, edges: [] } } }),
					headers: {},
				};
			});

			const startTime = Date.now();
			await client.fetchStarredRepositories(null, 10);
			const elapsedTime = Date.now() - startTime;

			// Should wait approximately 1 second before first retry
			expect(elapsedTime).toBeGreaterThanOrEqual(950);
			expect(elapsedTime).toBeLessThan(1500);
		});
	});

	// T018: Unit test for retry with transient errors vs fatal errors
	describe("Transient vs Fatal Errors (T018)", () => {
		it("should retry transient network errors (ETIMEDOUT, ECONNRESET)", async () => {
			const mockResponse = {
				viewer: {
					starredRepositories: {
						pageInfo: {
							hasNextPage: false,
							endCursor: "cursor123",
						},
						edges: [],
					},
				},
			};

			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				if (attemptCount === 1) {
					throw new Error("ETIMEDOUT");
				}
				return {
					status: 200,
					text: JSON.stringify(mockResponse),
					json: async () => mockResponse,
					headers: {},
				};
			});

			const result = await client.fetchStarredRepositories(null, 10);

			expect(result).toBeDefined();
			expect(attemptCount).toBeGreaterThan(1);
		});

		it("should NOT retry authentication errors (401)", async () => {
			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				return {
					status: 401,
					text: "Unauthorized",
					json: async () => ({}),
					headers: {},
				};
			});

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow();

			// Should only attempt once (no retries for auth errors)
			expect(attemptCount).toBe(1);
		});

		it("should NOT retry forbidden errors (403)", async () => {
			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				return {
					status: 403,
					text: "Forbidden",
					json: async () => ({}),
					headers: {},
				};
			});

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow();

			// Should only attempt once (no retries for forbidden errors)
			expect(attemptCount).toBe(1);
		});

		it("should retry 5xx server errors", async () => {
			const mockResponse = {
				viewer: {
					starredRepositories: {
						pageInfo: {
							hasNextPage: false,
							endCursor: "cursor123",
						},
						edges: [],
					},
				},
			};

			let attemptCount = 0;
			vi.mocked(requestUrl).mockImplementation(async () => {
				attemptCount++;
				if (attemptCount === 1) {
					return {
						status: 503,
						text: "Service Unavailable",
						json: async () => ({}),
						headers: {},
					};
				}
				return {
					status: 200,
					text: JSON.stringify(mockResponse),
					json: async () => mockResponse,
					headers: {},
				};
			});

			const result = await client.fetchStarredRepositories(null, 10);

			expect(result).toBeDefined();
			expect(attemptCount).toBe(2);
		});
	});
});
