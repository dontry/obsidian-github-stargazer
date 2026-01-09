/**
 * File manager utilities for metadata file operations
 * @feature 006-repo-metadata-frontmatter
 * @module utils/file-manager
 */

import type { App, TFile } from "obsidian";
import type { FileOperationResult, Repository } from "@/types";

const FRONTMATTER_REGEX = /^---\n[\s\S]*?\n---/;

/**
 * Create or update a metadata file in the vault
 * @param app - Obsidian app instance
 * @param filePath - Relative path to the metadata file
 * @param frontmatter - YAML frontmatter content
 * @returns Operation result with success status
 */
export async function createOrUpdateMetadataFile(
	app: App,
	filePath: string,
	frontmatter: string,
): Promise<FileOperationResult> {
	// Check if file exists before try block
	const existingFile = app.vault.getAbstractFileByPath(
		filePath,
	) as TFile | null;

	try {
		// Ensure owner directory exists
		const pathParts = filePath.split("/");
		if (pathParts.length > 1) {
			await ensureOwnerDirectoryExists(app, pathParts[0] + "/" + pathParts[1]);
		}

		if (existingFile) {
			// File exists: read current content
			const currentContent = await app.vault.read(existingFile);

			// Check if frontmatter has changed
			if (currentContent.startsWith(frontmatter)) {
				// No changes needed
				return {
					success: true,
					filePath,
					action: "skipped",
					error: null,
					message: "Metadata unchanged",
				};
			}

			// Preserve user content below frontmatter
			const frontmatterMatch = currentContent.match(FRONTMATTER_REGEX);
			let userContent = "";

			if (frontmatterMatch) {
				// Extract content after frontmatter
				userContent = currentContent.substring(frontmatterMatch[0].length);
			} else {
				// No frontmatter found, preserve entire content
				userContent = "\n\n" + currentContent;
			}

			// Update file with new frontmatter + preserved user content
			const newContent = frontmatter + userContent;
			await app.vault.modify(existingFile, newContent);

			return {
				success: true,
				filePath,
				action: "updated",
				error: null,
				message: "Metadata updated",
			};
		} else {
			// File doesn't exist: create new
			await app.vault.create(filePath, frontmatter);

			return {
				success: true,
				filePath,
				action: "created",
				error: null,
				message: "Metadata created",
			};
		}
	} catch (error) {
		return {
			success: false,
			filePath,
			action: existingFile ? "updated" : "created",
			error: error as Error,
			message: `Failed to ${existingFile ? "update" : "create"} metadata file: ${(error as Error).message}`,
		};
	}
}

/**
 * Delete all files associated with a repository (metadata and README)
 * @param app - Obsidian app instance
 * @param repo - Repository object with file paths
 * @returns Array of operation results for each deleted file
 */
export async function deleteRepositoryFiles(
	app: App,
	repo: Repository,
): Promise<FileOperationResult[]> {
	const results: FileOperationResult[] = [];

	// Delete metadata file if path exists
	if (repo.metadataFilePath) {
		try {
			await app.vault.adapter.remove(repo.metadataFilePath);
			results.push({
				success: true,
				filePath: repo.metadataFilePath,
				action: "deleted",
				error: null,
				message: "Metadata file deleted",
			});
		} catch (error) {
			results.push({
				success: false,
				filePath: repo.metadataFilePath,
				action: "deleted",
				error: error as Error,
				message: `Failed to delete metadata file: ${(error as Error).message}`,
			});
		}
	}

	// Delete README file if path exists
	if (repo.readmeVaultFilePath) {
		try {
			await app.vault.adapter.remove(repo.readmeVaultFilePath);
			results.push({
				success: true,
				filePath: repo.readmeVaultFilePath,
				action: "deleted",
				error: null,
				message: "README file deleted",
			});
		} catch (error) {
			results.push({
				success: false,
				filePath: repo.readmeVaultFilePath,
				action: "deleted",
				error: error as Error,
				message: `Failed to delete README file: ${(error as Error).message}`,
			});
		}
	}

	// Remove owner/repo directory if empty
	if (repo.metadataFilePath || repo.readmeVaultFilePath) {
		const basePath = repo.metadataFilePath || repo.readmeVaultFilePath;
		if (basePath) {
			const pathParts = basePath.split("/");
			const repoDir = pathParts.slice(0, 2).join("/");

			try {
				const files = await app.vault.adapter.list(repoDir);
				if (files.files.length === 0 && files.folders.length === 0) {
					await app.vault.adapter.rmdir(repoDir, true);
				}
			} catch (error) {
				// Directory removal failed, not critical
				console.warn(`Failed to remove empty directory: ${repoDir}`, error);
			}
		}
	}

	return results;
}

/**
 * Detect repositories that are no longer starred on GitHub
 * @param currentStarred - Set of currently starred repository full names
 * @param localRepos - Array of local repository objects
 * @returns Array of repositories that are no longer starred
 */
export function detectUnstarredRepos(
	currentStarred: Set<string>,
	localRepos: Repository[],
): Repository[] {
	return localRepos.filter(
		(repo) => !currentStarred.has(repo.nameWithOwner) && !repo.isUnstarred,
	);
}

/**
 * Ensure the owner directory exists in the vault
 * @param app - Obsidian app instance
 * @param path - Path to repository (e.g., "owner/repo")
 */
export async function ensureOwnerDirectoryExists(
	app: App,
	path: string,
): Promise<void> {
	const pathParts = path.split("/");
	if (pathParts.length < 2) {
		return;
	}

	// Create owner directory if it doesn't exist
	const ownerDir = pathParts[0];
	const ownerDirObj = app.vault.getAbstractFileByPath(ownerDir ?? 'unknown');

	if (!ownerDirObj) {
		try {
			await app.vault.createFolder(ownerDir ?? 'unknown');
		} catch (error) {
			// Directory might already exist, ignore error
			console.debug(`Owner directory creation: ${ownerDir}`, error);
		}
	}

	// Create repo directory if it doesn't exist
	const repoDir = `${ownerDir}/${pathParts[1]}`;
	const repoDirObj = app.vault.getAbstractFileByPath(repoDir);

	if (!repoDirObj) {
		try {
			await app.vault.createFolder(repoDir);
		} catch (error) {
			// Directory might already exist, ignore error
			console.debug(`Repo directory creation: ${repoDir}`, error);
		}
	}
}
