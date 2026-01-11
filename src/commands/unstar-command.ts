import type { App } from "obsidian";
import { Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import { GitHubGraphQLClient } from "@/sync/github-client";
import { UnstarModal } from "@/ui/unstar-modal";
import { ERROR_MESSAGES } from "@/utils/constants";
import { info } from "@/utils/logger";

/**
 * Command handler for batch unstarring repositories
 *
 * This command opens a modal allowing users to select starred repositories
 * to unstar. The unstar operation includes:
 * - Removing the star from GitHub via API
 * - Deleting local repository files from the vault
 * - Removing the repository from the JSON store
 */
export class UnstarCommand {
	/**
	 * Execute the unstar command
	 *
	 * @param app - Obsidian app instance
	 * @param githubToken - GitHub personal access token
	 * @param repositoryStore - Repository data store
	 */
	async execute(
		app: App,
		githubToken: string,
		repositoryStore: RepositoryStore,
	): Promise<void> {
		// Validate GitHub token
		if (!githubToken || githubToken.trim() === "") {
			new Notice(ERROR_MESSAGES.AUTH_FAILED);
			return;
		}

		try {
			// Load all repositories from store
			const data = await repositoryStore.loadRepositories();
			const allRepos = data.repositories;

			if (allRepos.length === 0) {
				new Notice("No repositories found. Please sync first.");
				return;
			}

			// Filter to get only starred repositories
			const starredRepos = allRepos.filter((repo) => !repo.isUnstarred);

			if (starredRepos.length === 0) {
				new Notice("No starred repositories found.");
				return;
			}

			info("Unstar command executed", {
				totalRepos: allRepos.length,
				starredRepos: starredRepos.length,
			});

			// Create GitHub client
			const githubClient = new GitHubGraphQLClient(githubToken);

			// Open modal for user selection
			new UnstarModal(app, starredRepos, repositoryStore, githubClient).open();
		} catch (error) {
			console.error("[GitHub Stargazer] Unstar command error:", error);
			new Notice(
				`Error loading repositories: ${error instanceof Error ? error.message : "Unknown error"}`,
			);
		}
	}
}
