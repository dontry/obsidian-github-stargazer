/**
 * Integration tests for metadata sync flow
 * @feature 006-repo-metadata-frontmatter
 * @TDD These tests MUST fail before implementation
 */

import type { App, TFile } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MetadataGenerator } from "@/sync/metadata-generator";
import type { Repository } from "@/types";
import { createOrUpdateMetadataFile } from "@/utils/file-manager";

// Mock Obsidian API
vi.mock("obsidian", () => ({
	TFile: class {},
	Notice: class {},
}));

describe("Metadata Sync Integration", () => {
	let mockApp: App;
	let mockVault: any;
	let metadataGenerator: MetadataGenerator;

	beforeEach(() => {
		mockVault = {
			create: vi.fn(),
			modify: vi.fn(),
			read: vi.fn(),
			getAbstractFileByPath: vi.fn(),
			createFolder: vi.fn(),
		};
		mockApp = {
			vault: mockVault,
		} as unknown as App;
		metadataGenerator = new MetadataGenerator();
	});

	describe("Metadata File Creation", () => {
		it("should create metadata file for a repository", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "react",
				nameWithOwner: "facebook/react",
				description: "A JavaScript library",
				url: "https://github.com/facebook/react",
				starCount: 220000,
				primaryLanguage: {
					name: "JavaScript",
					color: "#f1e05a",
				} as any,
				owner: "facebook",
				topics: [],
				createdAt: "2013-05-24T16:15:32Z",
				updatedAt: "2025-01-05T10:30:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			// Generate metadata
			const frontmatter = metadataGenerator.generateFrontmatter(repo);

			// Verify frontmatter is valid
			expect(frontmatter).toMatch(/^---\n/);
			expect(frontmatter).toMatch(/\n---$/);
			expect(frontmatter).toContain("name: react");
			expect(frontmatter).toContain("fullName: facebook/react");
			expect(frontmatter).toContain("starCount: 220000");
		});

		it("should create metadata file in correct path structure", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "react",
				nameWithOwner: "facebook/react",
				description: null,
				url: "https://github.com/facebook/react",
				starCount: 220000,
				primaryLanguage: null,
				owner: "facebook",
				topics: [],
				createdAt: "2013-05-24T16:15:32Z",
				updatedAt: "2025-01-05T10:30:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			const frontmatter = metadataGenerator.generateFrontmatter(repo);
			const filePath = metadataGenerator.generateMetadataFilePath(
				repo.owner,
				repo.name,
			);

			// Verify path structure
			expect(filePath).toBe("facebook/react/facebook-react-metadata.md");
			expect(filePath).toMatch(/-metadata\.md$/);
		});

		it("should handle repositories with special characters in names", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "repo:name",
				nameWithOwner: "foo/repo:name",
				description: null,
				url: "https://github.com/foo/repo:name",
				starCount: 100,
				primaryLanguage: null,
				owner: "foo",
				topics: [],
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			const filePath = metadataGenerator.generateMetadataFilePath(
				repo.owner,
				repo.name,
			);

			// Should sanitize special characters
			expect(filePath).toBe("foo/repo-name/foo-repo-name-metadata.md");
		});

		it("should escape special characters in description", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "test",
				nameWithOwner: "owner/test",
				description: 'Test with "quotes" and: colons\nand newlines',
				url: "https://github.com/owner/test",
				starCount: 100,
				primaryLanguage: null,
				owner: "owner",
				topics: [],
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			const frontmatter = metadataGenerator.generateFrontmatter(repo);

			// Should escape special characters
			expect(frontmatter).toContain(
				'description: "Test with \\"quotes\\" and: colons\\nand newlines"',
			);
		});

		it("should handle repositories with topics", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "test",
				nameWithOwner: "owner/test",
				description: null,
				url: "https://github.com/owner/test",
				starCount: 100,
				primaryLanguage: null,
				owner: "owner",
				topics: ["javascript", "library", "frontend", "react"],
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			};

			const frontmatter = metadataGenerator.generateFrontmatter(repo);

			// Should format topics as YAML list
			expect(frontmatter).toContain("tags:");
			expect(frontmatter).toContain("- javascript");
			expect(frontmatter).toContain("- library");
			expect(frontmatter).toContain("- frontend");
			expect(frontmatter).toContain("- react");
		});

		it("should handle repositories without topics", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "test",
				nameWithOwner: "owner/test",
				description: "No topics",
				url: "https://github.com/owner/test",
				starCount: 100,
				primaryLanguage: null,
				owner: "owner",
				topics: [],
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			const frontmatter = metadataGenerator.generateFrontmatter(repo);

			// Should not include topics field if empty
			expect(frontmatter).not.toContain("topics:");
		});

		it("should include all required metadata fields", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "test",
				nameWithOwner: "owner/test",
				description: "Test repository",
				url: "https://github.com/owner/test",
				starCount: 1000,
				primaryLanguage: "TypeScript",
				owner: "owner",
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				topics: [],
				linkedResources: [],
				readmeSha: null,
			}; 

			const frontmatter = metadataGenerator.generateFrontmatter(repo);

			// Check all required fields
			expect(frontmatter).toContain("name: test");
			expect(frontmatter).toContain("fullName: owner/test");
			expect(frontmatter).toContain("description: Test repository");
			expect(frontmatter).toContain("starCount: 1000");
			expect(frontmatter).toContain("primaryLanguage: TypeScript");
			expect(frontmatter).toContain("url: https://github.com/owner/test");
			expect(frontmatter).toContain("ownerLogin: owner");
			expect(frontmatter).toContain('createdAt: "2020-01-01T00:00:00Z"');
			expect(frontmatter).toContain('updatedAt: "2025-01-01T00:00:00Z"');
		});
	});

	describe("Metadata Update Preserving User Edits", () => {
		it("should preserve user notes when updating metadata", async () => {
			const oldFrontmatter = `---
name: test
fullName: owner/test
starCount: 100
---`;

			const newFrontmatter = `---
name: test
fullName: owner/test
starCount: 200
---`;

			const userNotes = `
# My Notes About This Repository

This is a great repository!

## Key Features
- Feature 1
- Feature 2
`;

			const filePath = "owner/test/owner-test-metadata.md";
			const mockFile = {} as TFile;

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.read.mockReturnValue(oldFrontmatter + userNotes);

			await createOrUpdateMetadataFile(mockApp, filePath, newFrontmatter);

			// Verify user notes are preserved
			expect(mockVault.modify).toHaveBeenCalledWith(
				mockFile,
				newFrontmatter + userNotes,
			);
		});

		it("should handle files without existing frontmatter", async () => {
			const newFrontmatter = `---
name: test
fullName: owner/test
starCount: 200
---`;

			const userContent = "Some existing content without frontmatter";
			const filePath = "owner/test/owner-test-metadata.md";
			const mockFile = {} as TFile;

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.read.mockReturnValue(userContent);

			await createOrUpdateMetadataFile(mockApp, filePath, newFrontmatter);

			// Should prepend frontmatter to existing content
			expect(mockVault.modify).toHaveBeenCalledWith(
				mockFile,
				newFrontmatter + "\n\n" + userContent,
			);
		});

		it("should skip update if metadata has not changed", async () => {
			const frontmatter = `---
name: test
fullName: owner/test
starCount: 100
---`;

			const filePath = "owner/test/owner-test-metadata.md";
			const mockFile = {} as TFile;

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.read.mockReturnValue(frontmatter + "\n\nUser notes");

			const result = await createOrUpdateMetadataFile(
				mockApp,
				filePath,
				frontmatter,
			);

			// Should skip update
			expect(result.action).toBe("skipped");
			expect(mockVault.modify).not.toHaveBeenCalled();
		});

		it("should update only when SHA differs", async () => {
			const oldFrontmatter = `---
name: test
fullName: owner/test
starCount: 100
---`;

			const newFrontmatter = `---
name: test
fullName: owner/test
starCount: 101
---`;

			const filePath = "owner/test/owner-test-metadata.md";
			const mockFile = {} as TFile;

			mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
			mockVault.read.mockReturnValue(oldFrontmatter + "\n\nUser notes");

			const result = await createOrUpdateMetadataFile(
				mockApp,
				filePath,
				newFrontmatter,
			);

			// Should update
			expect(result.action).toBe("updated");
			expect(mockVault.modify).toHaveBeenCalled();
		});
	});

	describe("End-to-End Metadata Sync Flow", () => {
		it("should generate and write metadata file for repository", async () => {
			const repo: Repository = {
				id: "test-id",
				name: "react",
				nameWithOwner: "facebook/react",
				description: "A JavaScript library",
				url: "https://github.com/facebook/react",
				starCount: 220000,
				primaryLanguage: {
					name: "JavaScript",
					color: "#f1e05a",
				} as any,
				owner: "facebook",
				topics: ["library", "frontend"],
				createdAt: "2013-05-24T16:15:32Z",
				updatedAt: "2025-01-05T10:30:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				linkedResources: [],
				readmeSha: null,
			} as Repository;

			// Generate metadata
			const frontmatter = metadataGenerator.generateFrontmatter(repo);
			const filePath = metadataGenerator.generateMetadataFilePath(
				repo.owner,
				repo.name,
			);

			// Mock file doesn't exist
			mockVault.getAbstractFileByPath.mockReturnValue(null);

			// Create file
			await createOrUpdateMetadataFile(mockApp, filePath, frontmatter);

			// Verify file creation
			expect(mockVault.create).toHaveBeenCalledWith(filePath, frontmatter);
		});

		it("should handle multiple repositories in sequence", async () => {
			const repos: Repository[] = [
				{
					id: "1",
					name: "react",
					nameWithOwner: "facebook/react",
					description: "A JavaScript library",
					url: "https://github.com/facebook/react",
					starCount: 220000,
					primaryLanguage: null,
					owner: "facebook",
					createdAt: "2013-05-24T16:15:32Z",
					updatedAt: "2025-01-05T10:30:00Z",
					starredAt: "2024-01-01T00:00:00Z",
					topics: [],
					linkedResources: [],
					readmeSha: null,
				},
				{
					id: "2",
					name: "vue",
					nameWithOwner: "vuejs/vue",
					description: "A progressive framework",
					url: "https://github.com/vuejs/vue",
					starCount: 200000,
					primaryLanguage: null,
					owner: "vuejs",
					createdAt: "2014-02-01T00:00:00Z",
					updatedAt: "2025-01-05T10:30:00Z",
					starredAt: "2024-01-01T00:00:00Z",
					topics: [],
					linkedResources: [],
					readmeSha: null,
				},
			];

			// Process each repository
			for (const repo of repos) {
				const frontmatter = metadataGenerator.generateFrontmatter(repo);
				const filePath = metadataGenerator.generateMetadataFilePath(
					repo.owner,
					repo.name,
				);

				mockVault.getAbstractFileByPath.mockReturnValue(null);
				await createOrUpdateMetadataFile(mockApp, filePath, frontmatter);
			}

			// Verify both files were created
			expect(mockVault.create).toHaveBeenCalledTimes(2);
		});
	});
});
