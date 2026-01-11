import type { App } from "obsidian";
import { Modal, Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { GitHubGraphQLClient } from "@/sync/github-client";
import type { Repository } from "@/types";
import { MAX_CONCURRENT_UNSTARS } from "@/utils/constants";
import { deleteRepositoryFiles } from "@/utils/file-manager";
import { error, info } from "@/utils/logger";

/**
 * Modal for selecting and unstarring repositories
 *
 * Shows a list of starred repositories with checkboxes allowing users to
 * select which repositories to unstar. This will:
 * 1. Remove the star from GitHub
 * 2. Delete repository files from the vault
 * 3. Remove the repository from the JSON store
 */
export class UnstarModal extends Modal {
	private starredRepos: Repository[];
	private repositoryStore: RepositoryStore;
	private githubClient: GitHubGraphQLClient;
	private selectedRepoIds: Set<string>;
	private checkboxes: Map<string, HTMLInputElement>;
	private repoItems: Map<string, HTMLDivElement>;

	constructor(
		app: App,
		starredRepos: Repository[],
		repositoryStore: RepositoryStore,
		githubClient: GitHubGraphQLClient,
	) {
		super(app);
		this.starredRepos = starredRepos;
		this.repositoryStore = repositoryStore;
		this.githubClient = githubClient;
		this.selectedRepoIds = new Set();
		this.checkboxes = new Map();
		this.repoItems = new Map();
	}

	onOpen() {
		const { contentEl } = this;

		contentEl.createEl("h2", {
			text: "Unstar Repositories",
		});

		info("Unstar modal opened", {
			count: this.starredRepos.length,
		});

		// Show warning about permanent action
		const warningEl = contentEl.createDiv({
			cls: "unstar-warning",
		});
		warningEl.createEl("strong", {
			text: "Warning: This action cannot be undone.",
		});
		warningEl.createEl("p", {
			text: "Unstarring will remove the star from GitHub and delete all local files (README, metadata) from your vault.",
		});

		// Show message about starred repos
		if (this.starredRepos.length === 0) {
			contentEl.createEl("p", {
				text: "No starred repositories found.",
			});
			return;
		}

		contentEl.createEl("p", {
			text: `Select repositories to unstar (${this.starredRepos.length} total):`,
		});

		// Search input
		const searchInput = contentEl.createEl("input", {
			type: "search",
			cls: "unstar-search",
			attr: {
				placeholder: "Search repositories...",
				"aria-label": "Search repositories",
			},
		});
		const resultsCountEl = contentEl.createEl("p", {
			text: `Showing ${this.starredRepos.length} of ${this.starredRepos.length}`,
			cls: "unstar-search-count",
		});

		// Select All / Select None buttons
		const buttonContainer = contentEl.createDiv({
			cls: "unstar-buttons",
		});


		const selectNoneButton = buttonContainer.createEl("button", {
			text: "Select None",
		});

		// Repository list with checkboxes
		const listContainer = contentEl.createDiv({
			cls: "unstar-list",
		});

		const noResultsEl = contentEl.createEl("p", {
			text: "No repositories match your search.",
			cls: "unstar-no-results",
		});
		// eslint-disable-next-line obsidianmd/no-static-styles-assignment
		noResultsEl.style.display = "none";

		for (const repo of this.starredRepos) {
			const repoItem = listContainer.createDiv({
				cls: "unstar-item",
			});

			// Checkbox
			const checkbox = repoItem.createEl("input", {
				type: "checkbox",
				attr: { id: `repo-${repo.id}` },
			});

			// Label with repo name and description
			const labelContainer = repoItem.createDiv({
				cls: "unstar-label-container",
			});

			labelContainer.createEl("label", {
				text: repo.nameWithOwner,
				cls: "unstar-name-label",
				attr: { for: `repo-${repo.id}` },
			});

			if (repo.description) {
				labelContainer.createEl("div", {
					text: repo.description,
					cls: "unstar-desc-label",
				});
			}

			// Store checkbox for programmatic access
			this.checkboxes.set(repo.id, checkbox);
			this.repoItems.set(repo.id, repoItem);
			repoItem.dataset.search = `${repo.nameWithOwner} ${repo.description ?? ""}`
				.trim()
				.toLowerCase();

			// Track selection changes
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.selectedRepoIds.add(repo.id);
				} else {
					this.selectedRepoIds.delete(repo.id);
				}
			});
		}

		const setVisibility = (el: HTMLElement, visible: boolean) => {
			el.style.display = visible ? "" : "none";
		};

		const isVisible = (el: HTMLElement) => el.style.display !== "none";

		const updateFilteredList = () => {
			const query = searchInput.value.trim().toLowerCase();
			let visibleCount = 0;

			this.repoItems.forEach((repoItem) => {
				const searchText = repoItem.dataset.search ?? "";
				const visible = query === "" || searchText.includes(query);
				setVisibility(repoItem, visible);
				if (visible) {
					visibleCount++;
				}
			});

			setVisibility(noResultsEl, visibleCount === 0);
			resultsCountEl.textContent = `Showing ${visibleCount} of ${this.starredRepos.length}`;
		};

		searchInput.addEventListener("input", updateFilteredList);
		updateFilteredList();

		// Select None button handler
		selectNoneButton.addEventListener("click", () => {
			this.repoItems.forEach((repoItem, repoId) => {
				if (!isVisible(repoItem)) {
					return;
				}
				const checkbox = this.checkboxes.get(repoId);
				if (!checkbox) {
					return;
				}
				checkbox.checked = false;
				this.selectedRepoIds.delete(repoId);
			});
		});

		// Action buttons container
		const actionContainer = contentEl.createDiv({
			cls: "modal-button-container",
		});

		const unstarButton = actionContainer.createEl("button", {
			text: "Unstar Selected",
			cls: "mod-warning",
		});

		const cancelButton = actionContainer.createEl("button", {
			text: "Cancel",
		});

		// Unstar button handler - close immediately and process in background
		unstarButton.addEventListener("click", () => {
			this.close();
			this.processSelectedUnstars().catch((err) => console.error(err));
		});

		// Cancel button handler
		cancelButton.addEventListener("click", () => {
			info("Unstar cancelled by user", {
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
	 * Process unstar operations in background after modal closes
	 */
	private async processSelectedUnstars(): Promise<void> {
		if (this.selectedRepoIds.size === 0) {
			info("No repositories selected for unstar");
			return;
		}

		info("Starting batch unstar operation", {
			count: this.selectedRepoIds.size,
		});

		// Show initial notice
		new Notice(`Unstarring ${this.selectedRepoIds.size} repository/ies...`);

		let successCount = 0;
		let failureCount = 0;
		const repoIds = Array.from(this.selectedRepoIds);

		// Process repositories in batches for rate limiting
		for (let i = 0; i < repoIds.length; i += MAX_CONCURRENT_UNSTARS) {
			const batch = repoIds.slice(i, i + MAX_CONCURRENT_UNSTARS);

			await Promise.allSettled(
				batch.map((repoId) => this.unstarRepository(repoId)),
			);

			// Update progress notice
			const processed = Math.min(i + MAX_CONCURRENT_UNSTARS, repoIds.length);
			new Notice(`Processing ${processed}/${repoIds.length}...`);
		}

		// Count final results
		for (const repoId of repoIds) {
			const repo = this.starredRepos.find((r) => r.id === repoId);
			if (!repo) {
				continue;
			}

			try {
				// Unstar on GitHub
				info("Unstarring repository on GitHub", {
					repo: repo.nameWithOwner,
				});
				await this.githubClient.unstarRepository(repo.id);

				// Delete local files
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

				// Remove from repository store
				await this.repositoryStore.deleteRepositories([repo.id]);
				info("Removed repository from store", {
					repo: repo.nameWithOwner,
				});

				successCount++;
			} catch (err) {
				error("Error during repository unstar", err);
				failureCount++;
			}
		}

		info("Batch unstar completed", {
			total: this.selectedRepoIds.size,
			success: successCount,
			failed: failureCount,
		});

		// Show final notice to user
		if (failureCount === 0) {
			new Notice(`Successfully unstarred ${successCount} repository/ies`);
		} else if (successCount === 0) {
			new Notice("Failed to unstar selected repositories");
		} else {
			new Notice(
				`Unstarred ${successCount} repository/ies, ${failureCount} failed`,
			);
		}
	}

	/**
	 * Unstar a single repository
	 */
	private async unstarRepository(repoId: string): Promise<void> {
		const repo = this.starredRepos.find((r) => r.id === repoId);
		if (!repo) {
			throw new Error(`Repository not found: ${repoId}`);
		}

		try {
			// Unstar on GitHub
			await this.githubClient.unstarRepository(repo.id);

			// Delete local files
			const deleteResults = await deleteRepositoryFiles(this.app, repo);

			if (deleteResults.some((r) => !r.success)) {
				throw new Error(
					`Failed to delete some files for ${repo.nameWithOwner}`,
				);
			}

			// Remove from repository store
			await this.repositoryStore.deleteRepositories([repo.id]);
		} catch (err) {
			error("Error during repository unstar", {
				repo: repo.nameWithOwner,
				error: err instanceof Error ? err.message : "Unknown error",
			});
			throw err;
		}
	}
}
