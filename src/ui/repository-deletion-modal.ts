import type { App } from "obsidian";
import { Modal, Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { Repository } from "@/types";
import { deleteRepositoryFiles } from "@/utils/file-manager";
import { error, info } from "@/utils/logger";

/**
 * Modal for selecting and deleting unstarred repositories
 *
 * Shows a list of unstarred repositories with checkboxes allowing users to
 * select which repository folders to delete from the vault.
 */
export class RepositoryDeletionModal extends Modal {
	private removedRepos: Repository[];
	private repositoryStore: RepositoryStore;
	private selectedRepoIds: Set<string>;
	private checkboxes: Map<string, HTMLInputElement>;

	constructor(
		app: App,
		removedRepos: Repository[],
		repositoryStore: RepositoryStore,
	) {
		super(app);
		this.removedRepos = removedRepos;
		this.repositoryStore = repositoryStore;
		this.selectedRepoIds = new Set();
		this.checkboxes = new Map();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: "Delete Unstarred Repositories",
		});

		info("Repository deletion modal opened", {
			count: this.removedRepos.length,
		});

		// Show message about unstarred repos
		if (this.removedRepos.length === 0) {
			contentEl.createEl("p", {
				text: "No repositories to delete.",
			});
			return;
		}

		contentEl.createEl("p", {
			text: `The following ${this.removedRepos.length} repository/repositories are no longer starred. Select which ones to delete:`,
		});

		// Select All / Select None buttons
		const buttonContainer = contentEl.createDiv({
			cls: "repo-deletion-buttons",
		});

		const selectAllButton = buttonContainer.createEl("button", {
			text: "Select All",
			cls: "mod-cta",
		});

		const selectNoneButton = buttonContainer.createEl("button", {
			text: "Select None",
		});

		// Repository list with checkboxes
		const listContainer = contentEl.createDiv({
			cls: "repo-deletion-list",
		});

		for (const repo of this.removedRepos) {
			const repoItem = listContainer.createDiv({
				cls: "repo-deletion-item",
			});

			// Checkbox
			const checkbox = repoItem.createEl("input", {
				type: "checkbox",
				attr: { id: `repo-${repo.id}` },
			});

			// Label with repo name
			const label = repoItem.createEl("label", {
				text: repo.nameWithOwner,
				attr: { for: `repo-${repo.id}` },
			});

			// Paths that will be deleted
			const pathsDiv = repoItem.createDiv({
				cls: "repo-deletion-paths",
			});

			if (repo.metadataFilePath) {
				pathsDiv.createEl("div", {
					text: `📄 ${repo.metadataFilePath}`,
					cls: "repo-deletion-path",
				});
			}

			if (repo.readmeVaultFilePath) {
				pathsDiv.createEl("div", {
					text: `📄 ${repo.readmeVaultFilePath}`,
					cls: "repo-deletion-path",
				});
			}

			// Store checkbox for programmatic access
			this.checkboxes.set(repo.id, checkbox);

			// Track selection changes
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.selectedRepoIds.add(repo.id);
				} else {
					this.selectedRepoIds.delete(repo.id);
				}
			});
		}

		// Select All button handler
		selectAllButton.addEventListener("click", () => {
			this.checkboxes.forEach((checkbox) => {
				checkbox.checked = true;
				const repo = this.removedRepos.find(
					(r) => this.checkboxes.get(r.id) === checkbox,
				);
				if (repo) {
					this.selectedRepoIds.add(repo.id);
				}
			});
		});

		// Select None button handler
		selectNoneButton.addEventListener("click", () => {
			this.checkboxes.forEach((checkbox) => {
				checkbox.checked = false;
			});
			this.selectedRepoIds.clear();
		});

		// Action buttons container
		const actionContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const deleteButton = actionContainer.createEl("button", {
			text: "Delete Selected",
			cls: "mod-cta",
		});

		const cancelButton = actionContainer.createEl("button", {
			text: "Cancel",
		});

		// Delete button handler - close immediately and process in background
		deleteButton.addEventListener("click", () => {
			this.close();
			this.processSelectedDeletions();
		});

		// Cancel button handler
		cancelButton.addEventListener("click", () => {
			info("Repository deletion cancelled by user", {
				selectedCount: this.selectedRepoIds.size,
			});
			this.close();
		});
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Process deletions in background after modal closes
	 */
	private async processSelectedDeletions(): Promise<void> {
		if (this.selectedRepoIds.size === 0) {
			info("No repositories selected for deletion");
			return;
		}

		info("Starting background deletion of selected repositories", {
			count: this.selectedRepoIds.size,
		});

		let successCount = 0;
		let failureCount = 0;

		for (const repoId of this.selectedRepoIds) {
			const repo = this.removedRepos.find((r) => r.id === repoId);
			if (!repo) {
				error("Repository not found for deletion", { repoId });
				failureCount++;
				continue;
			}

			try {
				info("Deleting repository files", {
					repo: repo.nameWithOwner,
				});

				const deleteResults = await deleteRepositoryFiles(this.app, repo);

				if (deleteResults.some((r) => !r.success)) {
					error("Failed to delete some repository files", {
						repo: repo.nameWithOwner,
						results: deleteResults,
					});
					failureCount++;
					continue;
				}

				info("Successfully deleted repository files", {
					repo: repo.nameWithOwner,
				});

				// Remove repository from JSON store only after successful file deletion
				await this.repositoryStore.deleteRepositories([repo.id]);
				info("Removed repository from store", {
					repo: repo.nameWithOwner,
				});

				successCount++;
			} catch (err) {
				error("Error during repository deletion", {
					repo: repo.nameWithOwner,
					error: err instanceof Error ? err.message : "Unknown error",
				});
				failureCount++;
			}
		}

		info("Repository deletion completed", {
			total: this.selectedRepoIds.size,
			success: successCount,
			failed: failureCount,
		});

		// Show notice to user
		if (failureCount === 0) {
			new Notice(`Successfully deleted ${successCount} repository/folder/s`);
		} else if (successCount === 0) {
			new Notice("Failed to delete selected repositories");
		} else {
			new Notice(
				`Deleted ${successCount} repository/folder/s, ${failureCount} failed`,
			);
		}
	}
}
