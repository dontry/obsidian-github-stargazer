/**
 * Unit tests for path utilities
 * @feature 006-repo-metadata-frontmatter
 * @TDD These tests MUST fail before implementation
 */

import { describe, expect, it } from "vitest";
import {
	generateMetadataFilePath,
	generateReadmeFilePath,
	sanitizePathSegment,
} from "@/utils/path-utils";

describe("PathUtils - sanitizePathSegment", () => {
	it("should replace invalid characters with hyphens", () => {
		expect(sanitizePathSegment("repo:name")).toBe("repo-name");
		expect(sanitizePathSegment("foo/bar")).toBe("foo-bar");
		expect(sanitizePathSegment("test*file")).toBe("test-file");
		expect(sanitizePathSegment("file?name")).toBe("file-name");
		expect(sanitizePathSegment("file<name>")).toBe("file-name");
		expect(sanitizePathSegment("file|name")).toBe("file-name");
		expect(sanitizePathSegment('file"name')).toBe("file-name");
	});

	it("should handle spaces correctly", () => {
		expect(sanitizePathSegment("my repo")).toBe("my-repo");
		expect(sanitizePathSegment("repo  name")).toBe("repo-name");
		expect(sanitizePathSegment("  leading-and-trailing  ")).toBe(
			"leading-and-trailing",
		);
	});

	it("should handle multiple consecutive invalid characters", () => {
		expect(sanitizePathSegment("repo///name")).toBe("repo-name");
		expect(sanitizePathSegment("test***file")).toBe("test-file");
	});

	it("should remove leading and trailing hyphens", () => {
		expect(sanitizePathSegment("-test-")).toBe("test");
		expect(sanitizePathSegment("--repo--")).toBe("repo");
	});

	it("should handle very long repository names", () => {
		const longName = "a".repeat(300);
		const result = sanitizePathSegment(longName);
		expect(result.length).toBeLessThanOrEqual(200);
	});

	it("should handle empty string after sanitization", () => {
		expect(sanitizePathSegment("---")).toBe("unnamed");
		expect(sanitizePathSegment("***")).toBe("unnamed");
		expect(sanitizePathSegment("///")).toBe("unnamed");
	});

	it("should preserve valid characters", () => {
		expect(sanitizePathSegment("valid-repo_name123")).toBe(
			"valid-repo_name123",
		);
		expect(sanitizePathSegment("TestRepo")).toBe("TestRepo");
	});

	it("should handle Unicode characters", () => {
		expect(sanitizePathSegment("测试仓库")).toBe("测试仓库");
		expect(sanitizePathSegment("repo-тест")).toContain("тест");
	});
});

describe("PathUtils - generateMetadataFilePath", () => {
	it("should generate correct path for owner/repo", () => {
		const path = generateMetadataFilePath("facebook", "react");
		expect(path).toBe("facebook/react/facebook-react-metadata.md");
	});

	it("should sanitize owner and repo names", () => {
		const path = generateMetadataFilePath("foo/bar", "repo:name");
		expect(path).toBe("foo-bar/repo-name/foo-bar-repo-name-metadata.md");
	});

	it("should handle special characters in owner", () => {
		const path = generateMetadataFilePath("owner*test", "repo");
		expect(path).toBe("owner-test/repo/owner-test-repo-metadata.md");
	});

	it("should handle special characters in repo", () => {
		const path = generateMetadataFilePath("owner", "repo:name");
		expect(path).toBe("owner/repo-name/owner-repo-name-metadata.md");
	});

	it("should handle spaces in names", () => {
		const path = generateMetadataFilePath("my owner", "my repo");
		expect(path).toBe("my-owner/my-repo/my-owner-my-repo-metadata.md");
	});

	it("should handle very long names", () => {
		const longOwner = "o".repeat(250);
		const longRepo = "r".repeat(250);
		const path = generateMetadataFilePath(longOwner, longRepo);
		// Should truncate to prevent filesystem issues
		expect(path.length).toBeLessThan(500); // Windows MAX_PATH limit
	});

	it("should always return path ending with -metadata.md", () => {
		const path = generateMetadataFilePath("test", "repo");
		expect(path).toMatch(/-metadata\.md$/);
	});
});

describe("PathUtils - generateReadmeFilePath", () => {
	it("should generate correct path for owner/repo", () => {
		const path = generateReadmeFilePath("facebook", "react");
		expect(path).toBe("facebook/react/facebook-react-readme.md");
	});

	it("should sanitize owner and repo names", () => {
		const path = generateReadmeFilePath("foo/bar", "repo:name");
		expect(path).toBe("foo-bar/repo-name/foo-bar-repo-name-readme.md");
	});

	it("should handle special characters in owner", () => {
		const path = generateReadmeFilePath("owner*test", "repo");
		expect(path).toBe("owner-test/repo/owner-test-repo-readme.md");
	});

	it("should handle special characters in repo", () => {
		const path = generateReadmeFilePath("owner", "repo:name");
		expect(path).toBe("owner/repo-name/owner-repo-name-readme.md");
	});

	it("should handle spaces in names", () => {
		const path = generateReadmeFilePath("my owner", "my repo");
		expect(path).toBe("my-owner/my-repo/my-owner-my-repo-readme.md");
	});

	it("should handle very long names", () => {
		const longOwner = "o".repeat(250);
		const longRepo = "r".repeat(250);
		const path = generateReadmeFilePath(longOwner, longRepo);
		// Should truncate to prevent filesystem issues
		expect(path.length).toBeLessThan(500); // Windows MAX_PATH limit
	});

	it("should always return path ending with -readme.md", () => {
		const path = generateReadmeFilePath("test", "repo");
		expect(path).toMatch(/-readme\.md$/);
	});

	it("should generate different paths for metadata and readme", () => {
		const metadataPath = generateMetadataFilePath("facebook", "react");
		const readmePath = generateReadmeFilePath("facebook", "react");
		expect(metadataPath).not.toBe(readmePath);
		expect(metadataPath).toContain("metadata");
		expect(readmePath).toContain("readme");
	});
});
