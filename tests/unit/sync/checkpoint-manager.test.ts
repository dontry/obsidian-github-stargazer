import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReadmeFetchStatus } from "@/config/readme-config";
import { CheckpointManager } from "@/sync/checkpoint-manager";
import type { SyncCheckpoint } from "@/types";
import { CheckpointValidationError } from "@/types";

// Mock Obsidian App
const mockApp = {
	vault: {
		adapter: {
			read: vi.fn(),
			write: vi.fn(),
			remove: vi.fn(),
			rename: vi.fn(),
		},
	},
};

const mockReadmeMetadata = new Map([
	[
		"user/test-repo",
		{
			sha: "abc123def4567890123456789012345678901234",
			vaultFilePath: "user-test-repo-README.md",
			fetchStatus: ReadmeFetchStatus.SUCCESS,
			lastFetchedAt: "2025-01-04T12:00:00Z",
			localModified: false,
			size: 1024,
			originalFileName: "README.md",
		},
	],
]);

describe("CheckpointManager", () => {
	let checkpointManager: CheckpointManager;

	beforeEach(() => {
		checkpointManager = new CheckpointManager(mockApp as any);
		vi.clearAllMocks();
	});

	// T011: Unit test for CheckpointManager.saveCheckpoint() atomic write pattern
	describe("saveCheckpoint (T011)", () => {
		it("should write checkpoint to temp file then actual file (atomic pattern)", async () => {

			const checkpoint: SyncCheckpoint = {
				cursor: "abc123",
				repositories: [
					{
						id: "repo1",
						name: "test-repo",
						nameWithOwner: "user/test-repo",
						description: "Test repo",
						url: "https://github.com/user/test-repo",
						starCount: 100,
						primaryLanguage: "TypeScript",
						owner: "google",
						starredAt: "2025-01-02T00:00:00Z",
						createdAt: "2025-01-02T00:00:00Z",
						updatedAt: "2025-01-02T00:00:00Z",
						readmeSha: "a123sad",
						tags: [],
						linkedResources: [],
						isUnstarred: false,
					},
				],
				totalCount: 150,
				fetchedCount: 1,
			};

			await checkpointManager.saveCheckpoint(checkpoint);

			// Verify temp file was written first
			expect(mockApp.vault.adapter.write).toHaveBeenCalledWith(
				".sync-checkpoint.json.tmp",
				expect.stringContaining('"cursor": "abc123"'),
			);

			// Verify actual file was written after temp
			expect(mockApp.vault.adapter.write).toHaveBeenCalledWith(
				".sync-checkpoint.json",
				expect.stringContaining('"cursor": "abc123"'),
			);

			// Verify temp file was cleaned up
			expect(mockApp.vault.adapter.remove).toHaveBeenCalledWith(
				".sync-checkpoint.json.tmp",
			);
		});

		it("should add timestamp and status to checkpoint before saving", async () => {
			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				// No timestamp or status
			};

			await checkpointManager.saveCheckpoint(checkpoint);

			const writtenContent = (mockApp.vault.adapter.write as any).mock
				.calls[1][1];
			const parsed = JSON.parse(writtenContent);

			expect(parsed.timestamp).toBeDefined();
			expect(parsed.status).toBe("in_progress");
		});

		it("should preserve existing status if provided", async () => {
			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				status: "completed",
			};

			await checkpointManager.saveCheckpoint(checkpoint);

			const writtenContent = (mockApp.vault.adapter.write as any).mock
				.calls[1][1];
			const parsed = JSON.parse(writtenContent);

			expect(parsed.status).toBe("completed");
		});
	});

	// T012: Unit test for CheckpointManager.loadCheckpoint() file reading
	describe("loadCheckpoint (T012)", () => {
		it("should load and validate checkpoint from file", async () => {
			const checkpointData: SyncCheckpoint = {
				cursor: "abc123",
				repositories: [],
				totalCount: 150,
				fetchedCount: 50,
				timestamp: new Date().toISOString(),
				status: "in_progress",
			};

			(mockApp.vault.adapter.read as any).mockResolvedValueOnce(
				JSON.stringify(checkpointData),
			);

			const result = await checkpointManager.loadCheckpoint();

			expect(result).toEqual(checkpointData);
			expect(mockApp.vault.adapter.read).toHaveBeenCalledWith(
				".sync-checkpoint.json",
			);
		});

		it("should return null if file does not exist", async () => {
			(mockApp.vault.adapter.read as any).mockRejectedValueOnce(
				new Error("ENOENT: file not found"),
			);

			const result = await checkpointManager.loadCheckpoint();

			expect(result).toBeNull();
		});

		it("should return null if file is empty", async () => {
			(mockApp.vault.adapter.read as any).mockResolvedValueOnce("");

			const result = await checkpointManager.loadCheckpoint();

			expect(result).toBeNull();
		});

		it("should preserve corrupted checkpoint file and throw validation error", async () => {
			(mockApp.vault.adapter.read as any).mockResolvedValueOnce(
				"{invalid json",
			);

			await expect(checkpointManager.loadCheckpoint()).rejects.toThrow(
				CheckpointValidationError,
			);

			// Verify corrupted file was preserved
			expect(mockApp.vault.adapter.rename).toHaveBeenCalledWith(
				".sync-checkpoint.json",
				".sync-checkpoint.json.corrupted",
			);
		});
	});

	// T013: Unit test for CheckpointManager.validateCheckpoint() lenient validation
	describe("validateCheckpoint (T013)", () => {
		it("should validate checkpoint with all required fields", () => {
			const validCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
			};

			const result = checkpointManager.validateCheckpoint(validCheckpoint);

			expect(result).toEqual(validCheckpoint);
		});

		it("should validate checkpoint with missing optional fields (lenient)", () => {
			const checkpointWithoutOptional = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				// Missing: timestamp, status, sessionId
			};

			const result = checkpointManager.validateCheckpoint(
				checkpointWithoutOptional,
			);

			expect(result).toEqual(checkpointWithoutOptional);
		});

		it("should throw error if required field is missing", () => {
			const incompleteCheckpoint = {
				cursor: null,
				repositories: [],
				// Missing: totalCount, fetchedCount
			};

			expect(() =>
				checkpointManager.validateCheckpoint(incompleteCheckpoint),
			).toThrow(CheckpointValidationError);
		});

		it("should throw error if cursor has invalid type", () => {
			const invalidCheckpoint = {
				cursor: 123, // Should be string or null
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
			};

			expect(() =>
				checkpointManager.validateCheckpoint(invalidCheckpoint),
			).toThrow(CheckpointValidationError);
		});

		it("should throw error if repositories is not an array", () => {
			const invalidCheckpoint = {
				cursor: null,
				repositories: "not-an-array",
				totalCount: 100,
				fetchedCount: 0,
			};

			expect(() =>
				checkpointManager.validateCheckpoint(invalidCheckpoint),
			).toThrow(CheckpointValidationError);
		});

		it("should throw error if totalCount or fetchedCount is negative", () => {
			const invalidCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: -1,
				fetchedCount: 0,
			};

			expect(() =>
				checkpointManager.validateCheckpoint(invalidCheckpoint),
			).toThrow(CheckpointValidationError);
		});

		it("should warn but allow if fetchedCount != repositories.length", () => {
			const inconsistentCheckpoint = {
				cursor: null,
				repositories: [{ id: "repo1" }], // 1 repo
				totalCount: 100,
				fetchedCount: 5, // Inconsistent
			};

			const result = checkpointManager.validateCheckpoint(
				inconsistentCheckpoint,
			);

			// Should not throw - lenient validation
			expect(result).toEqual(inconsistentCheckpoint);
		});
	});

	// T014: Unit test for CheckpointManager.isStale() 7-day detection
	describe("isStale (T014)", () => {
		it("should return false for recent checkpoint (< 7 days)", () => {
			const recentCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				timestamp: new Date().toISOString(), // Now
			};

			const result = checkpointManager.isStale(recentCheckpoint);

			expect(result).toBe(false);
		});

		it("should return true for old checkpoint (> 7 days)", () => {
			const oldDate = new Date();
			oldDate.setDate(oldDate.getDate() - 10); // 10 days ago

			const oldCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				timestamp: oldDate.toISOString(),
			};

			const result = checkpointManager.isStale(oldCheckpoint);

			expect(result).toBe(true);
		});

		it("should return false for checkpoint exactly 7 days old (not stale yet)", () => {
			const sevenDaysAgo = new Date();
			sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

			const boundaryCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				timestamp: sevenDaysAgo.toISOString(),
			};

			const result = checkpointManager.isStale(boundaryCheckpoint);

			// Should NOT be stale (must be OLDER THAN 7 days, not 7 days exactly)
			expect(result).toBe(false);
		});

		it("should return true for checkpoint older than 7 days", () => {
			const eightDaysAgo = new Date();
			eightDaysAgo.setDate(eightDaysAgo.getDate() - 8);

			const staleCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				timestamp: eightDaysAgo.toISOString(),
			};

			const result = checkpointManager.isStale(staleCheckpoint);

			// Should be stale (older than 7 days)
			expect(result).toBe(true);
		});

		it("should return true if timestamp is missing", () => {
			const noTimestampCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				// No timestamp
			};

			const result = checkpointManager.isStale(noTimestampCheckpoint);

			expect(result).toBe(true);
		});

		it("should return true if timestamp is invalid", () => {
			const invalidTimestampCheckpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				timestamp: "invalid-date",
			};

			const result = checkpointManager.isStale(invalidTimestampCheckpoint);

			expect(result).toBe(true);
		});
	});

	describe("deleteCheckpoint", () => {
		it("should delete checkpoint file", async () => {
			(mockApp.vault.adapter.remove as any).mockResolvedValueOnce(undefined);

			await checkpointManager.deleteCheckpoint();

			expect(mockApp.vault.adapter.remove).toHaveBeenCalledWith(
				".sync-checkpoint.json",
			);
		});

		it("should succeed if file does not exist (idempotent)", async () => {
			(mockApp.vault.adapter.remove as any).mockRejectedValueOnce(
				new Error("ENOENT: file not found"),
			);

			// Should not throw
			await expect(
				checkpointManager.deleteCheckpoint(),
			).resolves.toBeUndefined();
		});
	});

	// T013: Unit test for checkpoint README metadata management (004-fetch-readme)
	describe("README Metadata Management (T013)", () => {
		it("should save README metadata for a repository", () => {
			const metadata = {
				sha: "abc123def4567890123456789012345678901234",
				vaultFilePath: "owner-repo-README.md",
				fetchStatus: ReadmeFetchStatus.SUCCESS,
				lastFetchedAt: "2025-01-04T12:00:00Z",
				localModified: false,
				size: 1024,
				originalFileName: "README.md",
			};

			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				readmeMetadata: new Map([["owner/repo", metadata]]),
			};

			const result = checkpointManager.validateCheckpoint(checkpoint);
			expect(result.readmeMetadata?.get("owner/repo")).toEqual(metadata);
		});

		it("should load README metadata from checkpoint", () => {
			const metadata = {
				sha: "abc123",
				vaultFilePath: "owner-repo-README.md",
				fetchStatus: ReadmeFetchStatus.SUCCESS,
				lastFetchedAt: "2025-01-04T12:00:00Z",
				localModified: false,
			};

			const checkpointData: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				readmeMetadata: new Map([["owner/repo", metadata]]),
			};

			(mockApp.vault.adapter.read as any).mockResolvedValueOnce(
				JSON.stringify(checkpointData),
			);

			// Note: Map serialization needs special handling
			// This test will be updated after implementation
		});

		it("should handle missing README metadata gracefully", () => {
			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				// No readmeMetadata field
			};

			const result = checkpointManager.validateCheckpoint(checkpoint);
			expect(result.readmeMetadata).toBeUndefined();
		});

		it("should store failed fetch status", () => {
			const metadata = {
				sha: "",
				vaultFilePath: "",
				fetchStatus: ReadmeFetchStatus.FAILED,
				lastFetchedAt: "2025-01-04T12:00:00Z",
				localModified: false,
				errorMessage: "Network error: timeout",
			};

			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				readmeMetadata: new Map([["owner/repo", metadata]]),
			};

			const result = checkpointManager.validateCheckpoint(checkpoint);
			const repoMetadata = result.readmeMetadata?.get("owner/repo");

			expect(repoMetadata?.fetchStatus).toBe("failed");
			expect(repoMetadata?.errorMessage).toBe("Network error: timeout");
		});

		it("should store NOT_AVAILABLE status for repositories without README", () => {
			const metadata = {
				sha: "",
				vaultFilePath: "",
				fetchStatus: ReadmeFetchStatus.SUCCESS,
				lastFetchedAt: "2025-01-04T12:00:00Z",
				localModified: false,
			};

			const checkpoint: SyncCheckpoint = {
				cursor: null,
				repositories: [],
				totalCount: 100,
				fetchedCount: 0,
				readmeMetadata: new Map([["owner/empty-repo", metadata]]),
			};

			const result = checkpointManager.validateCheckpoint(checkpoint);
			const repoMetadata = result.readmeMetadata?.get("owner/empty-repo");

			expect(repoMetadata?.fetchStatus).toBe("not_available");
		});
	});
});
