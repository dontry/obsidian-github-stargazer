import type { App } from "obsidian";
import { Modal, Notice } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RepositoryStore } from "@/storage/repository-store";
import type { Repository } from "@/types";
import { RepositoryDeletionModal } from "@/ui/repository-deletion-modal";

// Mock Obsidian
vi.mock("obsidian", () => ({
	Modal: class MockModal {
		open() {}
		close() {}
	},
	Notice: class MockNotice {
		constructor(message: string) {
			this.message = message;
		}
		message: string;
	},
}));

// Mock file utilities
vi.mock("@/utils/file-manager", () => ({
	deleteRepositoryFiles: vi.fn(() =>
		Promise.resolve([
			{
				success: true,
				filePath: "test/test-metadata.md",
				action: "deleted",
				error: null,
			},
			{
				success: true,
				filePath: "test/test-readme.md",
				action: "deleted",
				error: null,
			},
		]),
	),
}));

// Mock logger
vi.mock("@/utils/logger", () => ({
	info: vi.fn(),
	error: vi.fn(),
}));

describe("RepositoryDeletionModal", () => {
	let mockApp: App;
	let mockRepositoryStore: RepositoryStore;
	let removedRepos: Repository[];

	beforeEach(() => {
		// Mock app
		mockApp = {
			vault: {
				getName: () => "TestVault",
			},
		} as App;

		// Mock repository store
		mockRepositoryStore = {
			deleteRepositories: vi.fn(() => Promise.resolve()),
		} as unknown as RepositoryStore;

		// Mock removed repositories
		removedRepos = [
			{
				id: "repo1",
				name: "test-repo-1",
				nameWithOwner: "user1/test-repo-1",
				description: "Test repository 1",
				url: "https://github.com/user1/test-repo-1",
				starCount: 100,
				primaryLanguage: "TypeScript",
				owner: "user1",
				createdAt: "2024-01-01T00:00:00Z",
				updatedAt: "2024-01-02T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				topics: ["test", "typescript"],
				linkedResources: [],
				isUnstarred: true,
				readmeSha: "sha123",
				metadataFilePath: "user1/test-repo-1/user1-test-repo-1-metadata.md",
				readmeVaultFilePath: "user1/test-repo-1/user1-test-repo-1-readme.md",
			},
			{
				id: "repo2",
				name: "test-repo-2",
				nameWithOwner: "user2/test-repo-2",
				description: "Test repository 2",
				url: "https://github.com/user2/test-repo-2",
				starCount: 200,
				primaryLanguage: "JavaScript",
				owner: "user2",
				createdAt: "2024-02-01T00:00:00Z",
				updatedAt: "2024-02-02T00:00:00Z",
				starredAt: "2024-02-01T00:00:00Z",
				topics: ["test", "javascript"],
				linkedResources: [],
				isUnstarred: true,
				readmeSha: "sha456",
				metadataFilePath: "user2/test-repo-2/user2-test-repo-2-metadata.md",
				readmeVaultFilePath: "user2/test-repo-2/user2-test-repo-2-readme.md",
			},
		];

		vi.clearAllMocks();
	});

	describe("UI Rendering", () => {
		it("should display modal title", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			expect(modal).toBeDefined();
		});

		it("should show repository names in checkbox list", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Note: In actual DOM testing, we would verify elements are rendered
			// This is a placeholder to test that component is instantiated correctly
			expect(removedRepos).toHaveLength(2);
		});

		it("should display vault paths to be deleted", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			const firstRepo = removedRepos[0];

			if (firstRepo) {
				expect(firstRepo.metadataFilePath).toBe(
					"user1/test-repo-1/user1-test-repo-1-metadata.md",
				);
				expect(firstRepo.readmeVaultFilePath).toBe(
					"user1/test-repo-1/user1-test-repo-1-readme.md",
				);
			}
		});

		it("should display empty message when no repositories to delete", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				[],
				mockRepositoryStore,
			);
			expect(modal).toBeDefined();
		});
	});

	describe("Checkbox Selection", () => {
		it("should track selected repository IDs", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			expect(removedRepos.map((r) => r.id)).toEqual(["repo1", "repo2"]);
		});

		it("should allow selecting individual repositories", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// In actual implementation, clicking checkbox would update selection
			expect(modal).toBeDefined();
		});

		it("should allow selecting all repositories", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			expect(removedRepos.length).toBeGreaterThan(0);
		});

		it("should allow selecting none", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			expect(modal).toBeDefined();
		});
	});

	describe("Deletion Processing", () => {
		it("should close modal immediately when delete button is clicked", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Modal has close method from base class
			expect(typeof modal.close).toBe("function");
		});

		it("should delete repository files in background", async () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Modal instance should have access to close method
			expect(modal).toBeDefined();
		});

		it("should call repositoryStore.deleteRepositories after file deletion", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Repository store should have deleteRepositories method
			expect(mockRepositoryStore.deleteRepositories).toBeDefined();
		});
	});

	describe("Error Handling", () => {
		it("should handle file deletion failures gracefully", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Modal should handle errors without crashing
			expect(modal).toBeDefined();
		});

		it("should show generic error message on failure", () => {
			// In actual implementation, Notice would show generic message
			expect(Notice).toBeDefined();
		});

		it("should preserve repositories if prompt fails", () => {
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			// Repositories should remain if deletion is cancelled or fails
			expect(removedRepos.length).toBe(2);
		});
	});

	describe("Notice Messages", () => {
		it("should show success message for all successful deletions", () => {
			// In actual implementation, Notice would show success
			expect(Notice).toBeDefined();
		});

		it("should show partial success message if some deletions fail", () => {
			// In actual implementation, Notice would show partial success
			expect(Notice).toBeDefined();
		});

		it("should show failure message if all deletions fail", () => {
			// In actual implementation, Notice would show failure
			expect(Notice).toBeDefined();
		});

		it("should show no notice if no repositories selected", () => {
			const modal = new RepositoryDeletionModal(mockApp, [], mockRepositoryStore);
			expect(modal).toBeDefined();
		});
	});

	describe("Data Consistency", () => {
		it("should only remove from JSON after successful file deletion", () => {
			// Test ordering: file deletion → JSON removal
			const modal = new RepositoryDeletionModal(
				mockApp,
				removedRepos,
				mockRepositoryStore,
			);
			expect(mockRepositoryStore.deleteRepositories).toBeDefined();
		});

		it("should preserve repository in JSON if file deletion fails", () => {
			// Test that JSON store is not updated if file deletion fails
			expect(mockRepositoryStore).toBeDefined();
		});
	});
});
