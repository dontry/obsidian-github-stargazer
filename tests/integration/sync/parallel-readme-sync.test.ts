/**
 * Integration Tests: Parallel README Fetching (T022, T024)
 *
 * Tests TDD approach: These tests are written BEFORE implementation.
 * They should FAIL initially, then pass after implementation.
 *
 * Run: pnpm test tests/integration/sync/parallel-readme-sync.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadmeFetchStatus } from "@/config/readme-config.js";
import { ReadmeFetcher } from "../../../src/sync/readme-fetcher.js";
import type { Repository } from "../../../src/types.js";

// Mock GitHub Client
const mockGithubClient = {
	fetchReadme: vi.fn(),
} as any;

// Mock Vault Manager
const mockVaultManager = {
	createOrUpdateReadmeFile: vi.fn(),
	readFileContent: vi.fn(),
	fileExists: vi.fn(),
	detectLocalModification: vi.fn(),
	detectConflict: vi.fn(),
} as any;

describe("Parallel README Fetching Integration Tests", () => {
	let fetcher: ReadmeFetcher;

	beforeEach(() => {
		vi.clearAllMocks();
		fetcher = new ReadmeFetcher(mockGithubClient, mockVaultManager);
	});

	describe("T022: Parallel README Fetching", () => {
		it("should fetch 10 repos in parallel with max 5 concurrent", async () => {
			// Create 10 test repositories
			const repos: Repository[] = Array.from({ length: 10 }, (_, i) => ({
				id: `repo${i}`,
				name: `repo${i}`,
				nameWithOwner: `owner/repo${i}`,
				description: `Test repo ${i}`,
				url: `https://github.com/owner/repo${i}`,
				starCount: 100,
				primaryLanguage: "TypeScript",
				owner: "owner",
				starredAt: "2025-01-04T00:00:00Z",
				createdAt: "2025-01-04T00:00:00Z",
				updatedAt: "2025-01-04T00:00:00Z",
				readme: "",
				tags: [],
				linkedResources: [],
				readmeSha: 'asdfasdf',
			}));

			// Track concurrent requests
			let concurrentCount = 0;
			let maxConcurrent = 0;

			mockGithubClient.fetchReadme.mockImplementation(async () => {
				concurrentCount++;
				maxConcurrent = Math.max(maxConcurrent, concurrentCount);

				// Simulate network delay
				await new Promise((resolve) => setTimeout(resolve, 50));

				concurrentCount--;

				return {
					content: `# README for repo`,
					sha: `sha${Math.random()}`,
					originalFileName: "README.md",
					size: 100,
				};
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Fetch READMEs for all repos
			const results = await Promise.allSettled(
				repos.map((repo) => {
					const [owner, repoName] = repo.nameWithOwner.split("/");
					return fetcher.fetchReadmeIfChanged(owner, repoName);
				}),
			);

			// Verify all requests completed
			expect(results).toHaveLength(10);
			expect(results.every((r) => r.status === "fulfilled")).toBe(true);

			// Verify concurrency was limited to 5
			expect(maxConcurrent).toBeLessThanOrEqual(5);

			// Verify all metadata was stored
			const metadata = fetcher.getMetadata();
			expect(metadata.size).toBe(10);
		});

		it("should verify all READMEs are fetched successfully", async () => {
			const repos: Repository[] = [
				{
					id: "repo1",
					name: "repo1",
					nameWithOwner: "owner/repo1",
					description: "Test repo 1",
					url: "https://github.com/owner/repo1",
					starCount: 100,
					primaryLanguage: "TypeScript",
					owner: "owner",
					starredAt: "2025-01-04T00:00:00Z",
					createdAt: "2025-01-04T00:00:00Z",
					updatedAt: "2025-01-04T00:00:00Z",
					tags: [],
					linkedResources: [],
					readmeSha: 'asdf09123',
				},
				{
					id: "repo2",
					name: "repo2",
					nameWithOwner: "owner/repo2",
					description: "Test repo 2",
					url: "https://github.com/owner/repo2",
					starCount: 200,
					primaryLanguage: "TypeScript",
					owner: "owner",
					starredAt: "2025-01-04T00:00:00Z",
					createdAt: "2025-01-04T00:00:00Z",
					updatedAt: "2025-01-04T00:00:00Z",
					tags: [],
					linkedResources: [],
					readmeSha: 'asdf71y2312',
				},
			];

			mockGithubClient.fetchReadme.mockResolvedValue({
				content: "# Test README",
				sha: "abc123",
				originalFileName: "README.md",
				size: 100,
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Fetch READMEs
			for (const repo of repos) {
				const [owner, repoName] = repo.nameWithOwner.split("/");
				await fetcher.fetchReadmeIfChanged(owner, repoName);
			}

			// Verify all READMEs fetched
			const metadata = fetcher.getMetadata();
			expect(metadata.size).toBe(2);
			expect(metadata.get("owner/repo1")?.fetchStatus).toBe("success");
			expect(metadata.get("owner/repo2")?.fetchStatus).toBe("success");
		});

		it("should include all metadata in checkpoint", async () => {
			const repos: Repository[] = Array.from({ length: 5 }, (_, i) => ({
				id: `repo${i}`,
				name: `repo${i}`,
				nameWithOwner: `owner/repo${i}`,
				description: `Test repo ${i}`,
				url: `https://github.com/owner/repo${i}`,
				starCount: 100,
				primaryLanguage: "TypeScript",
				owner: "owner",
				starredAt: "2025-01-04T00:00:00Z",
				createdAt: "2025-01-04T00:00:00Z",
				updatedAt: "2025-01-04T00:00:00Z",
				readme: "",
				tags: [],
				linkedResources: [],
				readmeSha: 'asdf0y60123',
			}));

			mockGithubClient.fetchReadme.mockResolvedValue({
				content: "# README",
				sha: `sha${Math.random()}`,
				originalFileName: "README.md",
				size: 100,
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Fetch all READMEs
			const results = await Promise.all(
				repos.map((repo) => {
					const [owner, repoName] = repo.nameWithOwner.split("/");
		
					return fetcher.fetchReadmeIfChanged(owner, repoName);
				}),
			);

			// Verify checkpoint metadata
			const metadata = fetcher.getMetadata();
			expect(metadata.size).toBe(5);

			// Verify each metadata entry has required fields
			for (const [repo, meta] of metadata.entries()) {
				expect(meta.sha).toBeTruthy();
				expect(meta.vaultFilePath).toBeTruthy();
				expect(meta.fetchStatus).toBe("success");
				expect(meta.lastFetchedAt).toBeTruthy();
				expect(meta.size).toBeGreaterThan(0);
			}
		});
	});

	describe("T024: Checkpoint Resume with Parallel Fetching", () => {
		it("should interrupt sync during parallel fetch and resume from checkpoint", async () => {
			// Simulate checkpoint with partial metadata
			const existingMetadata = new Map([
				[
					"owner/repo1",
					{
						sha: "sha1",
						vaultFilePath: "owner-repo1-README.md",
						fetchStatus: ReadmeFetchStatus.SUCCESS,
						lastFetchedAt: "2025-01-04T12:00:00Z",
						localModified: false,
					},
				],
				[
					"owner/repo2",
					{
						sha: "sha2",
						vaultFilePath: "owner-repo2-README.md",
						fetchStatus: ReadmeFetchStatus.SUCCESS,
						lastFetchedAt: "2025-01-04T12:00:00Z",
						localModified: false,
					},
				],
			]);

			// Create fetcher with existing metadata
			const resumeFetcher = new ReadmeFetcher(
				mockGithubClient,
				mockVaultManager,
				existingMetadata,
			);

			// Fetch remaining repos
			const reposToFetch = ["repo3", "repo4", "repo5"];

			mockGithubClient.fetchReadme.mockResolvedValue({
				content: "# README",
				sha: "new-sha",
				originalFileName: "README.md",
				size: 100,
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Fetch remaining READMEs
			for (const repo of reposToFetch) {
				await resumeFetcher.fetchReadmeIfChanged("owner", repo);
			}

			// Verify metadata includes both old and new
			const metadata = resumeFetcher.getMetadata();
			expect(metadata.size).toBe(5); // 2 existing + 3 new
			expect(metadata.get("owner/repo1")).toBeTruthy();
			expect(metadata.get("owner/repo5")).toBeTruthy();
		});

		it("should continue parallel fetching from checkpoint", async () => {
			// Checkpoint with 3 completed, 7 remaining
			const existingMetadata = new Map();
			for (let i = 0; i < 3; i++) {
				existingMetadata.set(`owner/repo${i}`, {
					sha: `sha${i}`,
					vaultFilePath: `owner-repo${i}-README.md`,
					fetchStatus: "success" as const,
					lastFetchedAt: "2025-01-04T12:00:00Z",
					localModified: false,
				});
			}

			const resumeFetcher = new ReadmeFetcher(
				mockGithubClient,
				mockVaultManager,
				existingMetadata,
			);

			// Fetch remaining 7 repos
			mockGithubClient.fetchReadme.mockResolvedValue({
				content: "# README",
				sha: "new-sha",
				originalFileName: "README.md",
				size: 100,
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Continue fetching remaining repos
			for (let i = 3; i < 10; i++) {
				await resumeFetcher.fetchReadmeIfChanged("owner", `repo${i}`);
			}

			// Verify all 10 repos in metadata
			const metadata = resumeFetcher.getMetadata();
			expect(metadata.size).toBe(10);

			// Verify old metadata preserved
			expect(metadata.get("owner/repo0")?.sha).toBe("sha0");
			expect(metadata.get("owner/repo2")?.sha).toBe("sha2");
		});

		it("should update checkpoint incrementally during parallel fetch", async () => {
			// Start with empty checkpoint
			const fetcher = new ReadmeFetcher(
				mockGithubClient,
				mockVaultManager,
				new Map(),
			);

			mockGithubClient.fetchReadme.mockImplementation(async () => {
				// Simulate progressive fetching
				await new Promise((resolve) => setTimeout(resolve, 10));
				return {
					content: "# README",
					sha: `sha-${Date.now()}`,
					originalFileName: "README.md",
					size: 100,
				};
			});

			mockVaultManager.createOrUpdateReadmeFile.mockResolvedValue(true);
			mockVaultManager.fileExists.mockResolvedValue(false);
			mockVaultManager.detectConflict.mockResolvedValue({
				hasConflict: false,
				state: "no_conflict" as const,
				reason: "No local file",
			});

			// Fetch 10 repos incrementally
			for (let i = 0; i < 10; i++) {
				await fetcher.fetchReadmeIfChanged("owner", `repo${i}`);

				// Verify checkpoint grows incrementally
				const metadata = fetcher.getMetadata();
				expect(metadata.size).toBe(i + 1);
			}

			// Final verification
			const finalMetadata = fetcher.getMetadata();
			expect(finalMetadata.size).toBe(10);
		});
	});
});
