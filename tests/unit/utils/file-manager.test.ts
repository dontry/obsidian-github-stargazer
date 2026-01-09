/**
 * Unit tests for file manager utilities
 * @feature 006-repo-metadata-frontmatter
 * @TDD These tests MUST fail before implementation
 */

import type { App, TFile } from "obsidian";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FileOperationResult, Repository } from "@/types";
import {
	createOrUpdateMetadataFile,
	deleteRepositoryFiles,
	detectUnstarredRepos,
	ensureOwnerDirectoryExists,
} from "@/utils/file-manager";

// Mock Obsidian API
vi.mock("obsidian", () => ({
	TFile: class {},
	Notice: class {},
}));

describe("FileManager - createOrUpdateMetadataFile", () => {
	let mockApp: App;
	let mockVault: any;

	beforeEach(() => {
		mockVault = {
			create: vi.fn(),
			createFolder: vi.fn(),
			modify: vi.fn(),
			read: vi.fn(),
			getAbstractFileByPath: vi.fn(),
		};
		mockApp = {
			vault: mockVault,
		} as unknown as App;
	});

	it("should create new file if it does not exist", async () => {
		const frontmatter = "---\nname: test\n---";
		const filePath = "owner/repo/owner-repo-metadata.md";

		mockVault.getAbstractFileByPath.mockReturnValue(null);

		const result = await createOrUpdateMetadataFile(
			mockApp,
			filePath,
			frontmatter,
		);

		expect(result.success).toBe(true);
		expect(result.action).toBe("created");
		expect(result.filePath).toBe(filePath);
		expect(mockVault.create).toHaveBeenCalledWith(filePath, frontmatter);
	});

	it("should update existing file if it exists and SHA changed", async () => {
		const oldFrontmatter = "---\nname: old\n---";
		const newFrontmatter = "---\nname: new\n---";
		const filePath = "owner/repo/owner-repo-metadata.md";
		const mockFile = {} as TFile;

		mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
		mockVault.read.mockReturnValue(oldFrontmatter + "\n\nUser notes");

		const result = await createOrUpdateMetadataFile(
			mockApp,
			filePath,
			newFrontmatter,
		);

		expect(result.success).toBe(true);
		expect(result.action).toBe("updated");
		expect(mockVault.modify).toHaveBeenCalled();
	});

	it("should skip if file exists and SHA is unchanged", async () => {
		const frontmatter = "---\nname: test\n---";
		const filePath = "owner/repo/owner-repo-metadata.md";
		const mockFile = {} as TFile;

		mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
		mockVault.read.mockReturnValue(frontmatter + "\n\nUser notes");

		const result = await createOrUpdateMetadataFile(
			mockApp,
			filePath,
			frontmatter,
		);

		expect(result.success).toBe(true);
		expect(result.action).toBe("skipped");
		expect(mockVault.create).not.toHaveBeenCalled();
		expect(mockVault.modify).not.toHaveBeenCalled();
	});

	it("should preserve user content when updating", async () => {
		const oldFrontmatter = "---\nname: old\n---";
		const newFrontmatter = "---\nname: new\n---";
		const userContent = "\n\n# My Notes\n\nThese are my notes.";
		const filePath = "owner/repo/owner-repo-metadata.md";
		const mockFile = {} as TFile;

		mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
		mockVault.read.mockReturnValue(oldFrontmatter + userContent);

		await createOrUpdateMetadataFile(mockApp, filePath, newFrontmatter);

		expect(mockVault.modify).toHaveBeenCalledWith(
			mockFile,
			newFrontmatter + userContent,
		);
	});

	it("should handle file creation errors", async () => {
		const frontmatter = "---\nname: test\n---";
		const filePath = "owner/repo/owner-repo-metadata.md";
		const error = new Error("Permission denied");

		mockVault.getAbstractFileByPath.mockReturnValue(null);
		mockVault.create.mockRejectedValue(error);

		const result = await createOrUpdateMetadataFile(
			mockApp,
			filePath,
			frontmatter,
		);

		expect(result.success).toBe(false);
		expect(result.error).toBe(error);
		expect(result.action).toBe("created");
	});

	it("should handle file read errors", async () => {
		const frontmatter = "---\nname: test\n---";
		const filePath = "owner/repo/owner-repo-metadata.md";
		const mockFile = {} as TFile;
		const error = new Error("Read error");

		mockVault.getAbstractFileByPath.mockReturnValue(mockFile);
		mockVault.read.mockRejectedValue(error);

		const result = await createOrUpdateMetadataFile(
			mockApp,
			filePath,
			frontmatter,
		);

		expect(result.success).toBe(false);
		expect(result.error).toBe(error);
	});
});

describe("FileManager - deleteRepositoryFiles", () => {
	let mockApp: App;
	let mockVault: any;

	beforeEach(() => {
		mockVault = {
			adapter: {
				remove: vi.fn(),
				list: vi.fn(),
				rmdir: vi.fn(),
			},
			getAbstractFileByPath: vi.fn(),
		};
		mockApp = {
			vault: mockVault,
		} as unknown as App;
	});

	it("should delete both metadata and readme files", async () => {
		const repo: Repository = {
			id: "test-id",
			name: "react",
			nameWithOwner: "facebook/react",
			description: "A JavaScript library",
			url: "https://github.com/facebook/react",
			starCount: 1000,
			primaryLanguage: "JavaScript",
			owner: "facebook",
			createdAt: "2013-05-24T16:15:32Z",
			updatedAt: "2025-01-05T10:30:00Z",
			starredAt: "2024-01-01T00:00:00Z",
			topics: [],
			linkedResources: [],
			readmeSha: null,
			metadataFilePath: "facebook/react/facebook-react-metadata.md",
			readmeVaultFilePath: "facebook/react/facebook-react-readme.md",
		} as Repository;

		const results = await deleteRepositoryFiles(mockApp, repo);

		expect(results).toHaveLength(2);
		expect(results[0]?.success).toBe(true);
		expect(results[0]?.action).toBe("deleted");
		expect(results[1]?.success).toBe(true);
		expect(results[1]?.action).toBe("deleted");
	});

	it("should handle missing files gracefully", async () => {
		const repo: Repository = {
			id: "test-id",
			name: "react",
			nameWithOwner: "facebook/react",
			description: null,
			url: "https://github.com/facebook/react",
			starCount: 1000,
			primaryLanguage: null,
			owner: "facebook",
			createdAt: "2013-05-24T16:15:32Z",
			updatedAt: "2025-01-05T10:30:00Z",
			starredAt: "2024-01-01T00:00:00Z",
			topics: [],
			linkedResources: [],
			readmeSha: null,
			metadataFilePath: "facebook/react/facebook-react-metadata.md",
		} as Repository;

		mockVault.adapter.remove.mockRejectedValue(new Error("File not found"));

		const results = await deleteRepositoryFiles(mockApp, repo);

		// Should not throw, return results with errors
		expect(results.length).toBeGreaterThan(0);
	});

	it("should remove empty owner directory after deletion", async () => {
		const repo: Repository = {
			id: "test-id",
			name: "react",
			nameWithOwner: "facebook/react",
			description: null,
			url: "https://github.com/facebook/react",
			starCount: 1000,
			primaryLanguage: null,
			owner: "facebook",
			createdAt: "2013-05-24T16:15:32Z",
			updatedAt: "2025-01-05T10:30:00Z",
			starredAt: "2024-01-01T00:00:00Z",
			topics: [],
			linkedResources: [],
			readmeSha: null,
			metadataFilePath: "facebook/react/facebook-react-metadata.md",
			readmeVaultFilePath: "facebook/react/facebook-react-readme.md",
		} as Repository;

		mockVault.adapter.list.mockResolvedValue({ files: [], folders: [] });

		await deleteRepositoryFiles(mockApp, repo);

		expect(mockVault.adapter.rmdir).toHaveBeenCalledWith(
			"facebook/react",
			true,
		);
	});
});

describe("FileManager - detectUnstarredRepos", () => {
	it("should detect repositories that are no longer starred", () => {
		const currentStarred = new Set(["facebook/react", "vuejs/core"]);
		const localRepos: Repository[] = [
			{
				id: "1",
				name: "react",
				nameWithOwner: "facebook/react",
				description: null,
				url: "https://github.com/facebook/react",
				starCount: 1000,
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
				name: "old-repo",
				nameWithOwner: "user/old-repo",
				description: null,
				url: "https://github.com/user/old-repo",
				starCount: 100,
				primaryLanguage: null,
				owner: "user",
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				topics: [],
				linkedResources: [],
				readmeSha: null,
			},
		] as Repository[];

		const unstarred = detectUnstarredRepos(currentStarred, localRepos);

		expect(unstarred).toHaveLength(1);
		expect(unstarred[0]?.nameWithOwner).toBe("user/old-repo");
	});

	it("should ignore repositories marked as isUnstarred", () => {
		const currentStarred = new Set(["facebook/react"]);
		const localRepos: Repository[] = [
			{
				id: "1",
				name: "react",
				nameWithOwner: "facebook/react",
				description: null,
				url: "https://github.com/facebook/react",
				starCount: 1000,
				primaryLanguage: null,
				owner: "facebook",
				createdAt: "2013-05-24T16:15:32Z",
				updatedAt: "2025-01-05T10:30:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				topics: [],
				linkedResources: [],
				readmeSha: null,
				isUnstarred: true,
			},
		] as Repository[];

		const unstarred = detectUnstarredRepos(currentStarred, localRepos);

		expect(unstarred).toHaveLength(0);
	});

	it("should return empty array if all repos are still starred", () => {
		const currentStarred = new Set(["facebook/react", "vuejs/core"]);
		const localRepos: Repository[] = [
			{
				id: "1",
				name: "react",
				nameWithOwner: "facebook/react",
				description: null,
				url: "https://github.com/facebook/react",
				starCount: 1000,
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
				name: "core",
				nameWithOwner: "vuejs/core",
				description: null,
				url: "https://github.com/vuejs/core",
				starCount: 500,
				primaryLanguage: null,
				owner: "vuejs",
				createdAt: "2020-01-01T00:00:00Z",
				updatedAt: "2025-01-01T00:00:00Z",
				starredAt: "2024-01-01T00:00:00Z",
				topics: [],
				linkedResources: [],
				readmeSha: null,
			},
		] as Repository[];

		const unstarred = detectUnstarredRepos(currentStarred, localRepos);

		expect(unstarred).toHaveLength(0);
	});
});

describe("FileManager - ensureOwnerDirectoryExists", () => {
	let mockApp: App;
	let mockVault: any;

	beforeEach(() => {
		mockVault = {
			createFolder: vi.fn(),
			getAbstractFileByPath: vi.fn(),
		};
		mockApp = {
			vault: mockVault,
		} as unknown as App;
	});

	it("should create owner directory if it does not exist", async () => {
		mockVault.getAbstractFileByPath.mockReturnValue(null);

		await ensureOwnerDirectoryExists(mockApp, "facebook/react");

		expect(mockVault.createFolder).toHaveBeenCalledWith("facebook");
	});

	it("should not create directory if it already exists", async () => {
		const mockDir = {} as any;
		mockVault.getAbstractFileByPath.mockReturnValue(mockDir);

		await ensureOwnerDirectoryExists(mockApp, "facebook/react");

		expect(mockVault.createFolder).not.toHaveBeenCalled();
	});

	it("should handle nested directory structure", async () => {
		mockVault.getAbstractFileByPath.mockReturnValue(null);

		await ensureOwnerDirectoryExists(mockApp, "owner1/owner2/repo");

		expect(mockVault.createFolder).toHaveBeenCalledWith("owner1");
	});
});
