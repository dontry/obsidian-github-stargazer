/**
 * Unit tests for metadata generator
 * @feature 006-repo-metadata-frontmatter
 * @TDD These tests MUST fail before implementation
 */

import { describe, expect, it } from "vitest";
import {
	escapeYaml,
	generateFrontmatter,
	validateFrontmatter,
} from "@/sync/metadata-generator";
import type { RepositoryMetadata } from "@/types";

describe("MetadataGenerator - escapeYaml", () => {
	it("should escape strings containing quotes", () => {
		expect(escapeYaml('Project "quoted" name')).toBe(
			'"Project \\"quoted\\" name"',
		);
		expect(escapeYaml("Test's value")).toBe('"Test\'s value"');
	});

	it("should escape strings containing colons", () => {
		expect(escapeYaml("ratio: 2:1")).toBe('"ratio: 2:1"');
		expect(escapeYaml("time: 10:30")).toBe('"time: 10:30"');
	});

	it("should escape strings with special YAML characters", () => {
		expect(escapeYaml("value\nwith\nnewlines")).toBe(
			'"value\\nwith\\nnewlines"',
		);
		expect(escapeYaml("tab\there")).toBe('"tab\\there"');
	});

	it("should escape strings starting with YAML special values", () => {
		expect(escapeYaml("null")).toBe('"null"');
		expect(escapeYaml("true")).toBe('"true"');
		expect(escapeYaml("false")).toBe('"false"');
		expect(escapeYaml("~")).toBe('"~"');
	});

	it("should not escape normal strings", () => {
		expect(escapeYaml("normal-text")).toBe("normal-text");
		expect(escapeYaml("repository")).toBe("repository");
	});

	it("should handle null and undefined values", () => {
		expect(escapeYaml(null)).toBe("null");
		expect(escapeYaml(undefined)).toBe("null");
	});

	it("should handle numbers", () => {
		expect(escapeYaml(123)).toBe("123");
		expect(escapeYaml(45.67)).toBe("45.67");
	});

	it("should handle booleans", () => {
		expect(escapeYaml(true)).toBe("true");
		expect(escapeYaml(false)).toBe("false");
	});

	it("should handle empty strings", () => {
		expect(escapeYaml("")).toBe('""');
	});
});

describe("MetadataGenerator - generateFrontmatter", () => {
	const sampleMetadata: RepositoryMetadata = {
		name: "react",
		fullName: "facebook/react",
		description: "A declarative JavaScript library",
		starCount: 220000,
		primaryLanguage: "JavaScript",
		tags: ["library", "javascript", "frontend"],
		url: "https://github.com/facebook/react",
		ownerLogin: "facebook",
		createdAt: "2013-05-24T16:15:32Z",
		updatedAt: "2025-01-05T10:30:00Z",
		homepageUrl: "https://react.dev",
		license: "MIT",
		forkCount: 46000,
		openIssuesCount: 1800,
		watchersCount: 7200,
	};

	it("should generate valid YAML frontmatter with --- delimiters", () => {
		const frontmatter = generateFrontmatter(sampleMetadata);

		expect(frontmatter).toMatch(/^---\n/);
		expect(frontmatter).toMatch(/\n---$/);
	});

	it("should include all required fields", () => {
		const frontmatter = generateFrontmatter(sampleMetadata);

		expect(frontmatter).toContain("name: react");
		expect(frontmatter).toContain("fullName: facebook/react");
		expect(frontmatter).toContain("starCount: 220000");
		expect(frontmatter).toContain("url: https://github.com/facebook/react");
		expect(frontmatter).toContain("ownerLogin: facebook");
	});

	it("should handle null values correctly", () => {
		const metadataWithNulls: RepositoryMetadata = {
			...sampleMetadata,
			description: null,
			primaryLanguage: null,
			homepageUrl: null,
			license: null,
		};

		const frontmatter = generateFrontmatter(metadataWithNulls);

		expect(frontmatter).toContain("description: null");
		expect(frontmatter).toContain("language: null");
		expect(frontmatter).toContain("homepageUrl: null");
		expect(frontmatter).toContain("license: null");
	});

	it("should format topics as YAML list", () => {
		const frontmatter = generateFrontmatter(sampleMetadata);

		expect(frontmatter).toContain("tags:");
		expect(frontmatter).toContain("- library");
		expect(frontmatter).toContain("- javascript");
		expect(frontmatter).toContain("- frontend");
	});

	it("should handle empty topics array", () => {
		const metadataNoTopics: RepositoryMetadata = {
			...sampleMetadata,
			tags: [],
		};

		const frontmatter = generateFrontmatter(metadataNoTopics);

		// Should not include topics: if empty
		expect(frontmatter).not.toContain("topics:");
	});

	it("should escape special characters in description", () => {
		const metadataWithSpecialChars: RepositoryMetadata = {
			...sampleMetadata,
			description: 'A library with "quotes" and: colons',
		};

		const frontmatter = generateFrontmatter(metadataWithSpecialChars);

		expect(frontmatter).toContain(
			'description: "A library with \\"quotes\\" and: colons"',
		);
	});

	it("should format primaryLanguage as nested object", () => {
		const frontmatter = generateFrontmatter(sampleMetadata);

		expect(frontmatter).toContain("primaryLanguage: JavaScript");
	});

	it("should handle null primaryLanguage", () => {
		const metadataNoLanguage: RepositoryMetadata = {
			...sampleMetadata,
			primaryLanguage: null,
		};

		const frontmatter = generateFrontmatter(metadataNoLanguage);

		expect(frontmatter).toContain("primaryLanguage: null");
	});

	it("should preserve field order for consistency", () => {
		const frontmatter1 = generateFrontmatter(sampleMetadata);
		const frontmatter2 = generateFrontmatter(sampleMetadata);

		expect(frontmatter1).toBe(frontmatter2);
	});
});

describe("MetadataGenerator - validateFrontmatter", () => {
	it("should validate correctly formatted frontmatter", () => {
		const validFrontmatter = `---
name: test
fullName: owner/test
url: https://github.com/owner/test
ownerLogin: owner
---`;

		const result = validateFrontmatter(validFrontmatter);

		expect(result.valid).toBe(true);
		expect(result.errors).toHaveLength(0);
	});

	it("should reject frontmatter without starting ---", () => {
		const invalidFrontmatter = `name: test
fullName: owner/test
---`;

		const result = validateFrontmatter(invalidFrontmatter);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Frontmatter must start with ---");
	});

	it("should reject frontmatter without ending ---", () => {
		const invalidFrontmatter = `---
name: test
fullName: owner/test`;

		const result = validateFrontmatter(invalidFrontmatter);

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Frontmatter must end with ---");
	});

	it("should detect missing required fields", () => {
		const incompleteFrontmatter = `---
name: test
---`;

		const result = validateFrontmatter(incompleteFrontmatter);

		expect(result.valid).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
		expect(result.errors.some((e) => e.includes("fullName"))).toBe(true);
		expect(result.errors.some((e) => e.includes("url"))).toBe(true);
	});

	it("should accept frontmatter with all required fields", () => {
		const completeFrontmatter = `---
name: test
fullName: owner/test
url: https://github.com/owner/test
ownerLogin: owner
starCount: 100
---`;

		const result = validateFrontmatter(completeFrontmatter);

		expect(result.valid).toBe(true);
	});

	it("should accept frontmatter with extra fields", () => {
		const frontmatterWithExtras = `---
name: test
fullName: owner/test
url: https://github.com/owner/test
ownerLogin: owner
description: Test repo
topics:
  - test
---`;

		const result = validateFrontmatter(frontmatterWithExtras);

		expect(result.valid).toBe(true);
	});

	it("should handle empty string", () => {
		const result = validateFrontmatter("");

		expect(result.valid).toBe(false);
		expect(result.errors).toContain("Frontmatter must start with ---");
	});

	it("should accept frontmatter with only delimiters (minimal valid)", () => {
		const minimalFrontmatter = `---
name: test
fullName: owner/test
url: https://github.com/owner/test
ownerLogin: owner
---`;

		const result = validateFrontmatter(minimalFrontmatter);

		expect(result.valid).toBe(true);
	});
});
