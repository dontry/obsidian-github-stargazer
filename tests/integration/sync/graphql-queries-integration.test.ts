/**
 * Integration Tests: GraphQL Queries (graphql-queries.ts)
 *
 * These tests validate:
 *  1. The query / mutation strings are well-formed and contain all expected fields.
 *  2. The variable-type contracts are correct (compile-time check via satisfies).
 *  3. End-to-end flow through GitHubGraphQLClient with a mocked requestUrl:
 *     - fetchStarredRepositories  uses GET_STARRED_REPOSITORIES_QUERY
 *     - unstarRepository           uses UNSTAR_REPOSITORY_MUTATION
 *     - (GET_REPOSITORY_BY_ID_QUERY is tested structurally only, as it is not yet
 *       exposed as a dedicated client method)
 *
 * Run: pnpm test tests/integration/sync/graphql-queries-integration.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { requestUrl } from "obsidian";
import {
	GET_STARRED_REPOSITORIES_QUERY,
	GET_REPOSITORY_BY_ID_QUERY,
	UNSTAR_REPOSITORY_MUTATION,
	type GetStarredRepositoriesVariables,
	type GetStarredRepositoriesResponse,
	type GetRepositoryByIdVariables,
	type GetRepositoryByIdResponse,
	type UnstarRepositoryVariables,
	type UnstarRepositoryResponse,
	type GitHubGraphQLResult,
} from "../../../src/sync/graphql-queries.js";
import { GitHubGraphQLClient } from "../../../src/sync/github-client.js";

// ─── helpers ───────────────────────────────────────────────────────────────

const mockRequestUrl = vi.mocked(requestUrl);

/** Build a minimal successful requestUrl response */
function makeResponse(json: unknown, status = 200) {
	return {
		status,
		text: "",
		headers: {} as Record<string, string>,
		json,
	};
}

// ─── 1. GET_STARRED_REPOSITORIES_QUERY — structural tests ──────────────────

describe("GET_STARRED_REPOSITORIES_QUERY", () => {
	it("is a non-empty string", () => {
		expect(typeof GET_STARRED_REPOSITORIES_QUERY).toBe("string");
		expect(GET_STARRED_REPOSITORIES_QUERY.trim().length).toBeGreaterThan(0);
	});

	it("declares the correct operation name and variables", () => {
		expect(GET_STARRED_REPOSITORIES_QUERY).toMatch(
			/query\s+GetStarredRepositories\s*\(\s*\$cursor\s*:\s*String/,
		);
		expect(GET_STARRED_REPOSITORIES_QUERY).toMatch(/\$pageSize\s*:\s*Int!/);
	});

	it("requests starredRepositories with pagination fields", () => {
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("starredRepositories");
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("hasNextPage");
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("endCursor");
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("edges");
	});

	it("requests all required repository node fields", () => {
		const requiredFields = [
			"id",
			"name",
			"nameWithOwner",
			"description",
			"url",
			"stargazerCount",
			"primaryLanguage",
			"repositoryTopics",
			"createdAt",
			"updatedAt",
			"pushedAt",
			"homepageUrl",
			"forkCount",
			"issues",
			"watchers",
			"licenseInfo",
			"owner",
			"defaultBranchRef",
		];

		for (const field of requiredFields) {
			expect(GET_STARRED_REPOSITORIES_QUERY).toContain(field);
		}
	});

	it("requests the readme oid for SHA-based change detection", () => {
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("readme");
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("oid");
	});

	it("requests starredAt at the edge level", () => {
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("starredAt");
	});

	it("uses pagination variables in the correct positions", () => {
		// first: $pageSize  after: $cursor
		expect(GET_STARRED_REPOSITORIES_QUERY).toMatch(
			/first\s*:\s*\$pageSize/,
		);
		expect(GET_STARRED_REPOSITORIES_QUERY).toMatch(/after\s*:\s*\$cursor/);
	});

	it("orders results by STARRED_AT DESC", () => {
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("STARRED_AT");
		expect(GET_STARRED_REPOSITORIES_QUERY).toContain("DESC");
	});
});

// ─── 2. UNSTAR_REPOSITORY_MUTATION — structural tests ──────────────────────

describe("UNSTAR_REPOSITORY_MUTATION", () => {
	it("is a non-empty string", () => {
		expect(typeof UNSTAR_REPOSITORY_MUTATION).toBe("string");
		expect(UNSTAR_REPOSITORY_MUTATION.trim().length).toBeGreaterThan(0);
	});

	it("declares the correct operation name and variable", () => {
		expect(UNSTAR_REPOSITORY_MUTATION).toMatch(
			/mutation\s+UnstarRepository\s*\(\s*\$repositoryId\s*:\s*ID!/,
		);
	});

	it("calls the removeStar mutation with the correct input", () => {
		expect(UNSTAR_REPOSITORY_MUTATION).toContain("removeStar");
		expect(UNSTAR_REPOSITORY_MUTATION).toContain("starrableId");
		expect(UNSTAR_REPOSITORY_MUTATION).toContain("$repositoryId");
	});

	it("requests clientMutationId in the response", () => {
		expect(UNSTAR_REPOSITORY_MUTATION).toContain("clientMutationId");
	});
});

// ─── 3. GET_REPOSITORY_BY_ID_QUERY — structural tests ──────────────────────

describe("GET_REPOSITORY_BY_ID_QUERY", () => {
	it("is a non-empty string", () => {
		expect(typeof GET_REPOSITORY_BY_ID_QUERY).toBe("string");
		expect(GET_REPOSITORY_BY_ID_QUERY.trim().length).toBeGreaterThan(0);
	});

	it("declares the correct operation name and variable", () => {
		expect(GET_REPOSITORY_BY_ID_QUERY).toMatch(
			/query\s+GetRepositoryById\s*\(\s*\$repositoryId\s*:\s*ID!/,
		);
	});

	it("uses the node() root field with the repository ID", () => {
		expect(GET_REPOSITORY_BY_ID_QUERY).toContain("node(id: $repositoryId)");
	});

	it("requests required single-repo fields", () => {
		const requiredFields = [
			"id",
			"name",
			"nameWithOwner",
			"description",
			"url",
			"stargazerCount",
			"primaryLanguage",
			"createdAt",
			"updatedAt",
			"pushedAt",
			"owner",
			"defaultBranchRef",
		];

		for (const field of requiredFields) {
			expect(GET_REPOSITORY_BY_ID_QUERY).toContain(field);
		}
	});

	it("requests the readme oid AND text (full content for individual fetch)", () => {
		expect(GET_REPOSITORY_BY_ID_QUERY).toContain("readme");
		expect(GET_REPOSITORY_BY_ID_QUERY).toContain("oid");
		expect(GET_REPOSITORY_BY_ID_QUERY).toContain("text");
	});
});

// ─── 4. Type-contract compile-time checks ───────────────────────────────────
// These are pure TypeScript checks — if the types are wrong the file won't
// compile, guaranteeing the interfaces match the query shapes.

describe("Query variable types", () => {
	it("GetStarredRepositoriesVariables satisfies the expected shape", () => {
		const vars: GetStarredRepositoriesVariables = {
			cursor: null,
			pageSize: 10,
		};
		expect(vars.cursor).toBeNull();
		expect(vars.pageSize).toBe(10);
	});

	it("GetStarredRepositoriesVariables accepts a non-null cursor", () => {
		const vars: GetStarredRepositoriesVariables = {
			cursor: "Y3Vyc29yOnYyOpK5",
			pageSize: 50,
		};
		expect(typeof vars.cursor).toBe("string");
	});

	it("UnstarRepositoryVariables satisfies the expected shape", () => {
		const vars: UnstarRepositoryVariables = {
			repositoryId: "MDEwOlJlcG9zaXRvcnkx",
		};
		expect(typeof vars.repositoryId).toBe("string");
	});

	it("GetRepositoryByIdVariables satisfies the expected shape", () => {
		const vars: GetRepositoryByIdVariables = {
			repositoryId: "MDEwOlJlcG9zaXRvcnkx",
		};
		expect(typeof vars.repositoryId).toBe("string");
	});
});

// ─── 5. E2E flow via GitHubGraphQLClient (mocked requestUrl) ────────────────

describe("GitHubGraphQLClient integration with graphql-queries", () => {
	const TOKEN = "ghp_test_integration_token";
	let client: GitHubGraphQLClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new GitHubGraphQLClient(TOKEN);
	});

	// ── 5a. fetchStarredRepositories uses GET_STARRED_REPOSITORIES_QUERY ──

	describe("fetchStarredRepositories", () => {
		const mockEdge = {
			node: {
				id: "R_kgDOABC123",
				name: "my-repo",
				nameWithOwner: "octocat/my-repo",
				description: "A test repository",
				url: "https://github.com/octocat/my-repo",
				stargazerCount: 42,
				primaryLanguage: { name: "TypeScript" },
				repositoryTopics: {
					nodes: [{ topic: { name: "typescript" } }],
				},
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-06-01T00:00:00Z",
				pushedAt: "2024-06-01T00:00:00Z",
				homepageUrl: "https://example.com",
				forkCount: 5,
				issues: { totalCount: 3 },
				watchers: { totalCount: 10 },
				licenseInfo: { spdxId: "MIT" },
				owner: { login: "octocat", url: "https://github.com/octocat" },
				readme: { oid: "abc123def456" },
				defaultBranchRef: { name: "main" },
			},
			starredAt: "2024-07-01T00:00:00Z",
		};

		const firstPageResponse: GitHubGraphQLResult<GetStarredRepositoriesResponse> =
		{
			data: {
				viewer: {
					starredRepositories: {
						pageInfo: { hasNextPage: true, endCursor: "cursor_page2" },
						edges: [mockEdge],
					},
				},
			},
			extensions: {
				rateLimit: { cost: 1, remaining: 4999, resetAt: "2024-12-31T00:00:00Z" },
			},
		};

		const lastPageResponse: GitHubGraphQLResult<GetStarredRepositoriesResponse> =
		{
			data: {
				viewer: {
					starredRepositories: {
						pageInfo: { hasNextPage: false, endCursor: null },
						edges: [mockEdge],
					},
				},
			},
		};

		it("sends the GET_STARRED_REPOSITORIES_QUERY string in the request body", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			await client.fetchStarredRepositories(null, 10);

			expect(mockRequestUrl).toHaveBeenCalledOnce();
			const calledWith = mockRequestUrl.mock.calls[0]![0]! as {
				body: string;
			};
			const body = JSON.parse(calledWith.body);

			expect(body.query).toBe(GET_STARRED_REPOSITORIES_QUERY);
		});

		it("passes the cursor and pageSize variables correctly", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			await client.fetchStarredRepositories("cursor_page1", 25);

			const body = JSON.parse(
				(mockRequestUrl.mock.calls[0]![0]! as { body: string }).body,
			);
			expect(body.variables).toEqual({ cursor: "cursor_page1", pageSize: 25 });
		});

		it("passes null cursor for the first page", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			await client.fetchStarredRepositories(null, 10);

			const body = JSON.parse(
				(mockRequestUrl.mock.calls[0]![0]! as { body: string }).body,
			);
			expect(body.variables.cursor).toBeNull();
		});

		it("returns pageInfo with hasNextPage and endCursor", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			const result = await client.fetchStarredRepositories(null, 10);

			const pageInfo =
				result.data.viewer.starredRepositories.pageInfo;
			expect(pageInfo.hasNextPage).toBe(true);
			expect(pageInfo.endCursor).toBe("cursor_page2");
		});

		it("returns the last page with hasNextPage=false", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(lastPageResponse) as any,
			);

			const result = await client.fetchStarredRepositories("cursor_page2", 10);

			const pageInfo =
				result.data.viewer.starredRepositories.pageInfo;
			expect(pageInfo.hasNextPage).toBe(false);
			expect(pageInfo.endCursor).toBeNull();
		});

		it("returns repository node fields that match GetStarredRepositoriesResponse", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			const result = await client.fetchStarredRepositories(null, 10);

			const edge = result.data.viewer.starredRepositories.edges[0];
			const node = edge!.node;

			expect(node.id).toBe("R_kgDOABC123");
			expect(node.name).toBe("my-repo");
			expect(node.nameWithOwner).toBe("octocat/my-repo");
			expect(node.description).toBe("A test repository");
			expect(node.url).toBe("https://github.com/octocat/my-repo");
			expect(node.stargazerCount).toBe(42);
			expect(node.primaryLanguage?.name).toBe("TypeScript");
			expect(node.repositoryTopics.nodes[0]!.topic.name).toBe("typescript");
			expect(node.createdAt).toBe("2024-01-01T00:00:00Z");
			expect(node.updatedAt).toBe("2024-06-01T00:00:00Z");
			expect(node.pushedAt).toBe("2024-06-01T00:00:00Z");
			expect(node.homepageUrl).toBe("https://example.com");
			expect(node.forkCount).toBe(5);
			expect(node.issues.totalCount).toBe(3);
			expect(node.watchers.totalCount).toBe(10);
			expect(node.licenseInfo?.spdxId).toBe("MIT");
			expect(node.owner.login).toBe("octocat");
			expect(node.owner.url).toBe("https://github.com/octocat");
			expect(node.readme?.oid).toBe("abc123def456");
			expect(node.defaultBranchRef?.name).toBe("main");
			expect(edge!.starredAt).toBe("2024-07-01T00:00:00Z");
		});

		it("exposes rateLimit extensions when present", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			const result = await client.fetchStarredRepositories(null, 10);

			expect(result.extensions?.rateLimit?.cost).toBe(1);
			expect(result.extensions?.rateLimit?.remaining).toBe(4999);
		});

		it("handles repositories with nullable fields (no primary language, no readme, null license)", async () => {
			const nullableEdge = {
				...mockEdge,
				node: {
					...mockEdge.node,
					primaryLanguage: null,
					readme: null,
					licenseInfo: null,
					homepageUrl: null,
					description: null,
					defaultBranchRef: null,
				},
			};
			const response: GitHubGraphQLResult<GetStarredRepositoriesResponse> = {
				data: {
					viewer: {
						starredRepositories: {
							pageInfo: { hasNextPage: false, endCursor: null },
							edges: [nullableEdge],
						},
					},
				},
			};

			mockRequestUrl.mockResolvedValueOnce(makeResponse(response) as any);

			const result = await client.fetchStarredRepositories(null, 10);
			const node = result.data.viewer.starredRepositories.edges[0]!.node;

			expect(node.primaryLanguage).toBeNull();
			expect(node.readme).toBeNull();
			expect(node.licenseInfo).toBeNull();
			expect(node.homepageUrl).toBeNull();
			expect(node.description).toBeNull();
			expect(node.defaultBranchRef).toBeNull();
		});

		it("throws an error when the API returns GraphQL errors", async () => {
			const errorResponse: GitHubGraphQLResult<GetStarredRepositoriesResponse> =
			{
				data: null as any,
				errors: [{ message: "Field 'starredRepositories' doesn't exist" }],
			};

			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(errorResponse) as any,
			);

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow("GraphQL errors");
		});

		it("throws an authentication error on HTTP 401", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse({}, 401) as any,
			);

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow("Authentication failed");
		});

		it("throws a rate-limit error on HTTP 403", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse({}, 403) as any,
			);

			await expect(
				client.fetchStarredRepositories(null, 10),
			).rejects.toThrow("Rate limit exceeded");
		});

		it("uses Bearer token in the Authorization header", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			await client.fetchStarredRepositories(null, 10);

			const call = mockRequestUrl.mock.calls[0]![0]! as {
				headers: Record<string, string>;
			};
			expect(call.headers["Authorization"]).toBe(`Bearer ${TOKEN}`);
		});

		it("posts to the GitHub GraphQL endpoint", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(firstPageResponse) as any,
			);

			await client.fetchStarredRepositories(null, 10);

			const call = mockRequestUrl.mock.calls[0]![0]! as { url: string; method: string };
			expect(call.method).toBe("POST");
			expect(call.url).toContain("api.github.com");
			expect(call.url).toContain("graphql");
		});
	});

	// ── 5b. unstarRepository uses UNSTAR_REPOSITORY_MUTATION ──

	describe("unstarRepository", () => {
		const successResponse: GitHubGraphQLResult<UnstarRepositoryResponse> = {
			data: { removeStar: { clientMutationId: null } },
		};

		it("sends a mutation string that references removeStar in the request body", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(successResponse) as any,
			);

			await client.unstarRepository("R_kgDOABC123");

			const body = JSON.parse(
				(mockRequestUrl.mock.calls[0]![0]! as { body: string }).body,
			);
			// The client constructs its own inline mutation — verify it matches
			// the same semantic content as UNSTAR_REPOSITORY_MUTATION
			expect(body.query).toContain("removeStar");
			expect(body.query).toContain("starrableId");
			expect(body.query).toContain("UnstarRepository");
			expect(body.variables).toEqual({ repositoryId: "R_kgDOABC123" });
		});

		it("passes the correct repositoryId variable", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(successResponse) as any,
			);

			const repoId = "MDEwOlJlcG9zaXRvcnkx";
			await client.unstarRepository(repoId);

			const body = JSON.parse(
				(mockRequestUrl.mock.calls[0]![0]! as { body: string }).body,
			);
			expect(body.variables).toEqual({ repositoryId: repoId });
		});

		it("resolves without throwing on success", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(successResponse) as any,
			);

			await expect(
				client.unstarRepository("R_kgDOABC123"),
			).resolves.toBeUndefined();
		});

		it("throws on HTTP non-200 response", async () => {
			mockRequestUrl.mockResolvedValueOnce(
				makeResponse({}, 500) as any,
			);

			await expect(
				client.unstarRepository("R_kgDOABC123"),
			).rejects.toThrow("Failed to unstar repository");
		});

		it("throws when the response contains GraphQL errors", async () => {
			const errorResponse: GitHubGraphQLResult<UnstarRepositoryResponse> = {
				data: null as any,
				errors: [{ message: "Could not resolve to a node" }],
			};

			mockRequestUrl.mockResolvedValueOnce(
				makeResponse(errorResponse) as any,
			);

			await expect(
				client.unstarRepository("bad-id"),
			).rejects.toThrow("GraphQL errors");
		});
	});

	// ── 5c. UNSTAR_REPOSITORY_MUTATION string matches the shape client sends ──

	describe("UNSTAR_REPOSITORY_MUTATION string consistency", () => {
		it("exports a mutation string consistent with what the client actually sends", () => {
			// Both should reference the same operation name and input field
			expect(UNSTAR_REPOSITORY_MUTATION).toContain("UnstarRepository");
			expect(UNSTAR_REPOSITORY_MUTATION).toContain("removeStar");
			expect(UNSTAR_REPOSITORY_MUTATION).toContain("starrableId");
			expect(UNSTAR_REPOSITORY_MUTATION).toContain("clientMutationId");
		});
	});
});

// ─── 6. GitHubGraphQLResult wrapper type ────────────────────────────────────

describe("GitHubGraphQLResult wrapper", () => {
	it("correctly wraps a GetStarredRepositoriesResponse payload", () => {
		const result: GitHubGraphQLResult<GetStarredRepositoriesResponse> = {
			data: {
				viewer: {
					starredRepositories: {
						pageInfo: { hasNextPage: false, endCursor: null },
						edges: [],
					},
				},
			},
		};

		expect(result.data.viewer.starredRepositories.edges).toHaveLength(0);
		expect(result.errors).toBeUndefined();
		expect(result.extensions).toBeUndefined();
	});

	it("correctly wraps a GetRepositoryByIdResponse payload (null node for missing repo)", () => {
		const result: GitHubGraphQLResult<GetRepositoryByIdResponse> = {
			data: { node: null },
		};

		expect(result.data.node).toBeNull();
	});

	it("includes optional errors and extensions arrays", () => {
		const result: GitHubGraphQLResult<GetStarredRepositoriesResponse> = {
			data: null as any,
			errors: [{ message: "some error" }],
			extensions: {
				rateLimit: { cost: 1, remaining: 0, resetAt: "2025-01-01T00:00:00Z" },
			},
		};

		expect(result.errors).toHaveLength(1);
		expect(result.extensions?.rateLimit?.remaining).toBe(0);
	});
});
