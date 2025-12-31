import { beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubGraphQLClient } from "@/sync/github-client";

global.fetch = vi.fn();

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

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			const result = await client.fetchStarredRepositories(null, 10);

			expect(fetch).toHaveBeenCalledWith(
				"https://api.github.com/graphql",
				expect.objectContaining({
					method: "POST",
					headers: {
						Authorization: `Bearer ${mockToken}`,
						"Content-Type": "application/json",
					},
				}),
			);
		});

		it("should handle authentication errors", async () => {
			vi.mocked(fetch).mockResolvedValue({
				ok: false,
				status: 401,
			} as Response);

			await expect(client.fetchStarredRepositories(null, 10)).rejects.toThrow();
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

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: async () => mockResponse,
			} as Response);

			await client.unstarRepository("MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw");

			expect(fetch).toHaveBeenCalled();
		});
	});
});
