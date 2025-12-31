import { describe, it, expect } from 'vitest';
import { isValidUrl, isGitHubRepoUrl } from '@/utils/url-validator';

describe('url-validator', () => {
	describe('isValidUrl', () => {
		it('should accept valid HTTPS URLs', () => {
			expect(isValidUrl('https://github.com')).toBe(true);
			expect(isValidUrl('https://example.com')).toBe(true);
			expect(isValidUrl('https://codewiki.google/internal-docs')).toBe(true);
		});

		it('should accept valid HTTP URLs', () => {
			expect(isValidUrl('http://github.com')).toBe(true);
			expect(isValidUrl('http://example.com')).toBe(true);
		});

		it('should reject URLs with other protocols', () => {
			expect(isValidUrl('ftp://example.com')).toBe(false);
			expect(isValidUrl('file:///path/to/file')).toBe(false);
			expect(isValidUrl('javascript:void(0)')).toBe(false);
		});

		it('should reject invalid URL strings', () => {
			expect(isValidUrl('not-a-url')).toBe(false);
			expect(isValidUrl('github.com')).toBe(false);
			expect(isValidUrl('')).toBe(false);
			expect(isValidUrl('https://')).toBe(false);
		});

		it('should accept URLs with ports and paths', () => {
			expect(isValidUrl('https://example.com:8080/path')).toBe(true);
			expect(isValidUrl('https://example.com/path?query=value')).toBe(true);
			expect(isValidUrl('https://example.com/path#fragment')).toBe(true);
		});
	});

	describe('isGitHubRepoUrl', () => {
		it('should accept valid GitHub repository URLs', () => {
			expect(isGitHubRepoUrl('https://github.com/owner/repo')).toBe(true);
			expect(isGitHubRepoUrl('https://github.com/facebook/react')).toBe(true);
			expect(isGitHubRepoUrl('https://github.com/owner/repo/')).toBe(true);
		});

		it('should accept GitHub URLs with www subdomain', () => {
			expect(isGitHubRepoUrl('https://www.github.com/owner/repo')).toBe(true);
		});

		it('should reject non-GitHub URLs', () => {
			expect(isGitHubRepoUrl('https://example.com/owner/repo')).toBe(false);
			expect(isGitHubRepoUrl('https://gitlab.com/owner/repo')).toBe(false);
		});

		it('should reject GitHub URLs without owner/repo path', () => {
			expect(isGitHubRepoUrl('https://github.com/owner')).toBe(false);
			expect(isGitHubRepoUrl('https://github.com/')).toBe(false);
			expect(isGitHubRepoUrl('https://github.com')).toBe(false);
		});

		it('should reject invalid URLs', () => {
			expect(isGitHubRepoUrl('not-a-url')).toBe(false);
			expect(isGitHubRepoUrl('')).toBe(false);
			expect(isGitHubRepoUrl('owner/repo')).toBe(false);
		});

		it('should reject GitHub URLs with additional path segments', () => {
			expect(isGitHubRepoUrl('https://github.com/owner/repo/tree/main')).toBe(false);
			expect(isGitHubRepoUrl('https://github.com/owner/repo/issues')).toBe(false);
		});
	});
});
