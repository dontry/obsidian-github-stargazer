/**
 * Vault File Manager for README Storage
 *
 * Handles all vault file operations for README files:
 * - Create/update README markdown files under owner/repo folders
 * - Check for file collisions before writing
 * - Detect local user modifications
 * - Read file metadata and content
 *
 * Files are stored under owner/repo with format: {owner}/{repo}/{owner}-{repo}-readme.md
 */

import { type App, normalizePath } from "obsidian";
import { ReadmeConflictState } from "@/config/readme-config";
import type { ReadmeConflictDetection } from "@/types/readme";
import { ensureOwnerDirectoryExists } from "@/utils/file-manager";

/**
 * Vault File Manager
 *
 * Provides methods for README file operations in the Obsidian vault.
 * All files are stored under owner/repo directories.
 */
export class VaultFileManager {
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Create or update a README file in the vault
	 *
	 * This method performs the following checks:
	 * 1. If file exists and localModified=true: Don't overwrite (user edited)
	 * 2. If file exists and localModified=false: Update content
	 * 3. If file doesn't exist: Create new file
	 *
	 * @param filePath - Path to the README file (e.g., "owner/repo/owner-repo-readme.md")
	 * @param content - Markdown content to write
	 * @param localModified - Whether user has edited the file locally
	 * @returns True if file was created/updated, false if skipped due to local modification
	 */
	async createOrUpdateReadmeFile(
		filePath: string,
		content: string,
		localModified: boolean,
	): Promise<boolean> {
		const normalizedPath = normalizePath(filePath);

		// Ensure owner/repo directories exist before writing
		const pathParts = normalizedPath.split("/");
		if (pathParts.length > 2) {
			await ensureOwnerDirectoryExists(
				this.app,
				`${pathParts[0]}/${pathParts[1]}`,
			);
		}

		// Check if file exists
		const fileExists = await this.app.vault.adapter.exists(normalizedPath);

		if (fileExists && localModified) {
			// File exists and user has modified it - skip update to preserve user edits
			return false;
		}

		if (fileExists) {
			// File exists but not modified by user - update it
			await this.app.vault.adapter.write(normalizedPath, content);
			return true;
		}

		// File doesn't exist - create it
		await this.app.vault.adapter.write(normalizedPath, content);
		return true;
	}

	/**
	 * Read the content of a README file from the vault
	 *
	 * @param filePath - Path to the README file
	 * @returns File content or null if file doesn't exist
	 */
	async readFileContent(filePath: string): Promise<string | null> {
		const normalizedPath = normalizePath(filePath);

		try {
			const content = await this.app.vault.adapter.read(normalizedPath);
			return content;
		} catch {
			// File doesn't exist or read error
			return null;
		}
	}

	/**
	 * Check if a README file already exists in the vault
	 *
	 * @param filePath - Path to the README file
	 * @returns True if file exists, false otherwise
	 */
	async fileExists(filePath: string): Promise<boolean> {
		const normalizedPath = normalizePath(filePath);
		return await this.app.vault.adapter.exists(normalizedPath);
	}

	/**
	 * Check for file collisions (name conflicts) in the vault
	 *
	 * Two repositories might have the same sanitized filename:
	 * - "foo/bar" → "foo/bar/foo-bar-readme.md"
	 * - "foo-bar" → "foo-bar/foo-bar/foo-bar-readme.md"
	 *
	 * This method detects such collisions and returns collision info.
	 *
	 * @param filePath - Path to check for collisions
	 * @param expectedOwner - Expected owner of the repository
	 * @param expectedRepo - Expected repository name
	 * @returns Collision detection result
	 */
	async checkFileCollision(
		filePath: string,
		expectedOwner: string,
		expectedRepo: string,
	): Promise<{ hasCollision: boolean; isCorrectOwner: boolean }> {
		const normalizedPath = normalizePath(filePath);
		const exists = await this.app.vault.adapter.exists(normalizedPath);

		if (!exists) {
			return { hasCollision: false, isCorrectOwner: true };
		}

		// File exists - read content to check if it's the correct repository
		// We check if the file contains the repository identifier in its frontmatter or content
		const content = await this.readFileContent(normalizedPath);

		if (!content) {
			return { hasCollision: true, isCorrectOwner: false };
		}

		// Check if content contains expected repository identifiers
		// README files typically include a link to the GitHub repository
		const expectedRepoPattern = new RegExp(
			`github\\.com/${expectedOwner}/${expectedRepo}`,
			"i",
		);
		const isCorrectOwner = expectedRepoPattern.test(content);

		return { hasCollision: !isCorrectOwner, isCorrectOwner };
	}

	/**
	 * Detect if user has modified a README file locally
	 *
	 * Compares the stored SHA with the current file content to detect modifications.
	 *
	 * @param filePath - Path to the README file
	 * @param storedSha - SHA stored in checkpoint
	 * @returns True if file has been locally modified
	 */
	async detectLocalModification(
		filePath: string,
		storedSha: string | null,
	): Promise<boolean> {
		// If no stored SHA, assume not modified
		if (!storedSha) {
			return false;
		}

		const normalizedPath = normalizePath(filePath);
		const exists = await this.app.vault.adapter.exists(normalizedPath);

		// If file doesn't exist but SHA is stored, consider it modified (user deleted it)
		if (!exists) {
			return true;
		}

		// Read file and compute SHA to compare
		const content = await this.readFileContent(normalizedPath);

		if (!content) {
			return false;
		}

		// TODO: Implement SHA computation for file content
		// For now, use file modification time as a heuristic
		const stat = await this.app.vault.adapter.stat(normalizedPath);
		if (!stat?.mtime) {
			throw new Error("stat.mtime is not available");
		}
		const fileModTime = new Date(stat?.mtime).getTime();

		// Assume modified if file is newer than 1 day ago
		// This is a simple heuristic - proper implementation would compute SHA
		const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
		return fileModTime > oneDayAgo;
	}

	/**
	 * Detect conflicts between local and remote README changes
	 *
	 * A conflict occurs when:
	 * 1. User has modified the local README AND
	 * 2. Remote README has also changed (SHA differs)
	 *
	 * @param filePath - Path to the README file
	 * @param localModified - Whether local file is marked as modified
	 * @param storedSha - SHA from checkpoint (last sync)
	 * @param remoteSha - Current SHA from GitHub API
	 * @returns Conflict detection result
	 */
	async detectConflict(
		filePath: string,
		localModified: boolean,
		storedSha: string | null,
		remoteSha: string | null,
	): Promise<ReadmeConflictDetection> {
		const remoteModified = !!remoteSha && storedSha !== remoteSha;
		const localSha = storedSha ?? undefined;
		const normalizedRemoteSha = remoteSha ?? undefined;

		// Case 1: No conflict - only remote changed, local not modified
		if (!localModified) {
			return {
				hasConflict: false,
				state: ReadmeConflictState.NO_CONFLICT,
				reason: "Local file not modified",
				localModified: false,
				remoteModified,
				localSha,
				remoteSha: normalizedRemoteSha,
			};
		}

		// Case 2: No conflict - only local changed, remote unchanged
		if (!remoteModified) {
			return {
				hasConflict: false,
				state: ReadmeConflictState.NO_CONFLICT,
				reason: "Remote README unchanged",
				localModified: true,
				remoteModified: false,
				localSha,
				remoteSha: normalizedRemoteSha,
			};
		}

		// Case 3: CONFLICT - both local and remote changed
		return {
			hasConflict: true,
			state: ReadmeConflictState.CONFLICT,
			reason: "Both local and remote README have changed",
			localModified: true,
			remoteModified: true,
			localSha,
			remoteSha: normalizedRemoteSha,
		};
	}

	/**
	 * Delete a README file from the vault
	 *
	 * Use with caution - this permanently removes the file.
	 *
	 * @param filePath - Path to the README file
	 * @returns True if file was deleted, false if it didn't exist
	 */
	async deleteReadmeFile(filePath: string): Promise<boolean> {
		const normalizedPath = normalizePath(filePath);
		const exists = await this.app.vault.adapter.exists(normalizedPath);

		if (!exists) {
			return false;
		}

		await this.app.vault.adapter.remove(normalizedPath);
		return true;
	}

	/**
	 * Rename a README file in the vault
	 *
	 * @param oldPath - Current path to the README file
	 * @param newPath - New path for the README file
	 * @returns True if renamed, false if old file didn't exist
	 */
	async renameReadmeFile(oldPath: string, newPath: string): Promise<boolean> {
		const normalizedOldPath = normalizePath(oldPath);
		const normalizedNewPath = normalizePath(newPath);
		const exists = await this.app.vault.adapter.exists(normalizedOldPath);

		if (!exists) {
			return false;
		}

		await this.app.vault.adapter.rename(normalizedOldPath, normalizedNewPath);
		return true;
	}

	/**
	 * Get file metadata (size, modification time)
	 *
	 * @param filePath - Path to the README file
	 * @returns File metadata or null if file doesn't exist
	 */
	async getFileMetadata(
		filePath: string,
	): Promise<{ size: number; mtime: Date } | null> {
		const normalizedPath = normalizePath(filePath);
		const exists = await this.app.vault.adapter.exists(normalizedPath);

		if (!exists) {
			return null;
		}

		try {
			const stat = await this.app.vault.adapter.stat(normalizedPath);
			if (stat?.size && stat.mtime) {
				return {
					size: stat?.size,
					mtime: new Date(stat?.mtime),
				};
			}
			throw new Error("stat data is unavailable");
		} catch {
			return null;
		}
	}
}
