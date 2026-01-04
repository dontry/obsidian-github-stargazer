/**
 * Unit Tests: README Validation Utilities
 *
 * Tests TDD approach: These tests are written BEFORE implementation.
 * They should FAIL initially, then pass after implementation.
 *
 * Run: pnpm test tests/unit/utils/validation.test.ts
 */

import { fail } from "assert";
import { describe, expect, it } from "vitest";
import { ReadmeTooLargeError } from "../../../src/types/errors.js";
import {
	generateReadmeFilePath,
	sanitizeFileName,
	validateFilePathSafe,
	validateReadmeContent,
	validateReadmeSize,
} from "../../../src/utils/validation.js";

describe("README Validation Utilities", () => {
	describe("validateReadmeSize", () => {
		it("should accept README under size limit (5MB)", () => {
			const size = 1024 * 1024; // 1MB
			expect(() => validateReadmeSize(size, "test/repo")).not.toThrow();
			expect(validateReadmeSize(size, "test/repo")).toBe(true);
		});

		it("should accept README exactly at size limit", () => {
			const size = 5 * 1024 * 1024; // 5MB (exact limit)
			expect(() => validateReadmeSize(size, "test/repo")).not.toThrow();
			expect(validateReadmeSize(size, "test/repo")).toBe(true);
		});

		it("should reject README over size limit", () => {
			const size = 6 * 1024 * 1024; // 6MB (over limit)
			expect(() => validateReadmeSize(size, "test/repo")).toThrow(
				ReadmeTooLargeError,
			);
		});

		it("should include size information in error", () => {
			const size = 6 * 1024 * 1024;
			try {
				validateReadmeSize(size, "test/repo");
				fail("Should have thrown ReadmeTooLargeError");
			} catch (error) {
				expect(error).toBeInstanceOf(ReadmeTooLargeError);
				if (error instanceof ReadmeTooLargeError) {
					expect(error.repository).toBe("test/repo");
					expect(error.size).toBe(size);
					expect(error.maxSize).toBe(5 * 1024 * 1024);
				}
			}
		});

		it("should reject zero size README", () => {
			const size = 0;
			expect(() => validateReadmeSize(size, "test/repo")).toThrow(
				"README size must be positive",
			);
		});

		it("should reject negative size README", () => {
			const size = -100;
			expect(() => validateReadmeSize(size, "test/repo")).toThrow(
				"README size must be positive",
			);
		});
	});

	describe("sanitizeFileName", () => {
		it("should preserve simple alphanumeric names", () => {
			expect(sanitizeFileName("facebook")).toBe("facebook");
			expect(sanitizeFileName("react")).toBe("react");
		});

		it("should replace spaces with underscores", () => {
			expect(sanitizeFileName("my repo")).toBe("my_repo");
			expect(sanitizeFileName("repo name")).toBe("repo_name");
		});

		it("should replace multiple spaces with single underscore", () => {
			expect(sanitizeFileName("my   repo")).toBe("my_repo");
		});

		it('should remove special characters (< > : " / \\ | ? *)', () => {
			expect(sanitizeFileName("repo<>name")).toBe("reponame");
			expect(sanitizeFileName("repo:name")).toBe("reponame");
			expect(sanitizeFileName('repo"name')).toBe("reponame");
			expect(sanitizeFileName("repo/name")).toBe("reponame");
			expect(sanitizeFileName("repo\\name")).toBe("reponame");
			expect(sanitizeFileName("repo|name")).toBe("reponame");
			expect(sanitizeFileName("repo?name")).toBe("reponame");
			expect(sanitizeFileName("repo*name")).toBe("reponame");
		});

		it("should remove multiple special characters", () => {
			expect(sanitizeFileName('repo<>:"/\\|?*name')).toBe("reponame");
		});

		it("should remove leading dots and spaces", () => {
			expect(sanitizeFileName(".repo")).toBe("repo");
			expect(sanitizeFileName("..repo")).toBe("repo");
			expect(sanitizeFileName(" repo")).toBe("repo");
			expect(sanitizeFileName("  .  repo")).toBe("repo");
		});

		it("should remove trailing dots and spaces", () => {
			expect(sanitizeFileName("repo.")).toBe("repo");
			expect(sanitizeFileName("repo..")).toBe("repo");
			expect(sanitizeFileName("repo ")).toBe("repo");
			expect(sanitizeFileName("repo  .  ")).toBe("repo");
		});

		it('should return "unnamed" for empty string after sanitization', () => {
			expect(sanitizeFileName("")).toBe("unnamed");
			expect(sanitizeFileName("...")).toBe("unnamed");
			expect(sanitizeFileName("   ")).toBe("unnamed");
			expect(sanitizeFileName('<>:"/\\|?*')).toBe("unnamed");
		});

		it("should preserve hyphens and underscores", () => {
			expect(sanitizeFileName("my-repo_name")).toBe("my-repo_name");
			expect(sanitizeFileName("repo-1")).toBe("repo-1");
			expect(sanitizeFileName("repo_2")).toBe("repo_2");
		});

		it("should truncate long names to 200 characters", () => {
			const longName = "a".repeat(250);
			const sanitized = sanitizeFileName(longName);
			expect(sanitized.length).toBe(200);
		});

		it("should not truncate short names", () => {
			const name = "my-repo-name";
			expect(sanitizeFileName(name)).toBe(name);
		});
	});

	describe("generateReadmeFilePath", () => {
		it("should generate file path in format {owner}-{repo}-README.md", () => {
			const path = generateReadmeFilePath("facebook", "react");
			expect(path).toBe("facebook-react-README.md");
		});

		it("should sanitize owner name", () => {
			const path = generateReadmeFilePath("My Owner", "react");
			expect(path).toBe("My_Owner-react-README.md");
		});

		it("should sanitize repository name", () => {
			const path = generateReadmeFilePath("facebook", "My:Repo");
			expect(path).toBe("facebook-MyRepo-README.md");
		});

		it("should sanitize both owner and repo names", () => {
			const path = generateReadmeFilePath("My Owner", "My:Repo");
			expect(path).toBe("My_Owner-MyRepo-README.md");
		});

		it("should handle names with special characters", () => {
			const path = generateReadmeFilePath("owner<>name", "repo/name");
			expect(path).toBe("ownername-reponame-README.md");
		});

		it("should handle very long names", () => {
			const longOwner = "a".repeat(250);
			const longRepo = "b".repeat(250);
			const path = generateReadmeFilePath(longOwner, longRepo);
			expect(path.length).toBeLessThan(255); // Should fit in file system limits
			expect(path).toMatch(/-README\.md$/);
		});
	});

	describe("validateFilePathSafe", () => {
		it("should accept safe relative file paths", () => {
			expect(() => validateFilePathSafe("README.md")).not.toThrow();
			expect(validateFilePathSafe("README.md")).toBe(true);
		});

		it("should accept safe nested paths", () => {
			expect(() => validateFilePathSafe("folder/README.md")).not.toThrow();
			expect(validateFilePathSafe("folder/README.md")).toBe(true);
		});

		it("should reject paths with parent directory traversal (..)", () => {
			expect(() => validateFilePathSafe("../README.md")).toThrow(
				"Unsafe file path detected",
			);
			expect(() => validateFilePathSafe("folder/../../README.md")).toThrow(
				"Unsafe file path detected",
			);
		});

		it("should reject paths starting with /", () => {
			expect(() => validateFilePathSafe("/README.md")).toThrow(
				"Unsafe file path detected",
			);
		});

		it("should reject paths with ~ (home directory)", () => {
			expect(() => validateFilePathSafe("~/README.md")).toThrow(
				"Unsafe file path detected",
			);
		});

		it("should reject Windows absolute paths (C:\\)", () => {
			expect(() => validateFilePathSafe("C:\\Users\\README.md")).toThrow(
				"Absolute paths not allowed",
			);
		});

		it("should reject Windows absolute paths (C:/)", () => {
			expect(() => validateFilePathSafe("C:/Users/README.md")).toThrow(
				"Absolute paths not allowed",
			);
		});
	});

	describe("validateReadmeContent", () => {
		it("should accept valid markdown content", () => {
			const content = "# Example README\n\nThis is a test.";
			expect(() => validateReadmeContent(content)).not.toThrow();
			expect(validateReadmeContent(content)).toBe(true);
		});

		it("should accept empty README (single character)", () => {
			const content = "#";
			expect(() => validateReadmeContent(content)).not.toThrow();
		});

		it("should reject empty string", () => {
			expect(() => validateReadmeContent("")).toThrow(
				"README content is empty",
			);
		});

		it("should reject non-string content", () => {
			expect(() => validateReadmeContent(null as any)).toThrow(
				"README content must be a string",
			);
			expect(() => validateReadmeContent(undefined as any)).toThrow(
				"README content must be a string",
			);
			expect(() => validateReadmeContent(123 as any)).toThrow(
				"README content must be a string",
			);
		});

		it("should reject content with null bytes (binary indicator)", () => {
			const content = "README\u0000content";
			expect(() => validateReadmeContent(content)).toThrow("null bytes");
		});

		it("should accept markdown with code blocks", () => {
			const content = '# Example\n\n```javascript\nconsole.log("test");\n```';
			expect(() => validateReadmeContent(content)).not.toThrow();
		});

		it("should accept markdown with special characters", () => {
			const content =
				"# Example\n\n- [x] Task\n- [ ] Task\n\n**Bold** and *italic*";
			expect(() => validateReadmeContent(content)).not.toThrow();
		});
	});
});
