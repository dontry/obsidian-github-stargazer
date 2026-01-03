import { type App, PluginSettingTab, Setting, Notice } from "obsidian";
import type GitHubStargazerPlugin from "@/main";
import { CheckpointManager } from "@/sync/checkpoint-manager";

/**
 * Settings tab for GitHub Stargazer plugin
 *
 * Provides UI for configuring the plugin, including GitHub token input.
 */
export class GitHubStargazerSettingTab extends PluginSettingTab {
	plugin: GitHubStargazerPlugin;

	constructor(app: App, plugin: GitHubStargazerPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		// Header
		;

		// Description
		containerEl.createEl("p", {
			text: "Configure your GitHub token to sync your starred repositories.",
		});

		// GitHub Token Setting
		new Setting(containerEl)
			.setName("GitHub Personal Access Token")
			.setDesc(
				"Create a token at GitHub Settings > Developer settings > Personal access tokens. Required scopes: read:org, read:user, read:star",
			)
			.addText((text) =>
				text
					.setPlaceholder("ghp_xxxxxxxxxxxxxxxxxxxx")
					.setValue(this.plugin.settings.githubToken)
					.onChange(async (value) => {
						this.plugin.settings.githubToken = value;
						await this.plugin.saveSettings();
					}),
			);

		// Auto-sync Setting
		new Setting(containerEl)
			.setName("Enable Auto-sync")
			.setDesc("Automatically sync repositories when Obsidian starts")
			.addToggle((toggle) =>
				toggle
					.setValue(this.plugin.settings.autoSyncEnabled || false)
					.onChange(async (value) => {
						this.plugin.settings.autoSyncEnabled = value;
						await this.plugin.saveSettings();
					}),
			);

		// Auto-sync Interval Setting
		new Setting(containerEl)
			.setName("Auto-sync Interval (minutes)")
			.setDesc("How often to auto-sync (if enabled)")
			.addText((text) =>
				text
					.setPlaceholder("60")
					.setValue(
						this.plugin.settings.autoSyncIntervalMinutes
							? String(this.plugin.settings.autoSyncIntervalMinutes)
							: "60",
					)
					.onChange(async (value) => {
						const num = Number.parseInt(value,10);
						if (!Number.isNaN(num) && num > 0) {
							this.plugin.settings.autoSyncIntervalMinutes = num;
							await this.plugin.saveSettings();
						}
					}),
			);

		// Max Cache Size Setting
		new Setting(containerEl)
			.setName("Max Repository Cache Size")
			.setDesc(
				"Maximum number of repositories to cache locally (0 = unlimited)",
			)
			.addText((text) =>
				text
					.setPlaceholder("0")
					.setValue(
						this.plugin.settings.maxRepositoryCacheSize
							? String(this.plugin.settings.maxRepositoryCacheSize)
							: "0",
					)
					.onChange(async (value) => {
						const num = parseInt(value);
						if (!isNaN(num) && num >= 0) {
							this.plugin.settings.maxRepositoryCacheSize = num;
							await this.plugin.saveSettings();
						}
					}),
			);

		// Sync Status Section
		new Setting(containerEl).setName("Sync Status").setHeading();

		const syncInfo = containerEl.createDiv();
		syncInfo.createEl("p", { text: "Last sync: Checking..." });

		// Refresh button for sync status
		new Setting(containerEl)
			.setName("Refresh Sync Status")
			.setDesc("Check when the last sync was performed")
			.addButton((button) =>
				button.setButtonText("Refresh").onClick(async () => {
					// Update sync status display
					const syncState = await this.plugin.getSyncStateStore().loadSyncState();
					syncInfo.empty();
					syncInfo.createEl("p", {
						text: `Last sync: ${
							syncState.lastSync
								? new Date(syncState.lastSync).toLocaleString()
								: "Never"
						}`,
					});
					if (syncState.error) {
						syncInfo.createEl("p", {
							text: `Last error: ${syncState.error}`,
							cls: "sync-error",
						});
					}
				}),
			);

		// T062: Checkpoint Management Section
		new Setting(containerEl).setName("Checkpoint Management").setHeading();

		const checkpointInfo = containerEl.createDiv();
		checkpointInfo.createEl("p", { text: "Loading checkpoint info..." });

		// Function to load and display checkpoint info
		const loadCheckpointInfo = async () => {
			try {
				const checkpointManager = new CheckpointManager(this.app);
				const checkpoint = await checkpointManager.loadCheckpoint();

				checkpointInfo.empty();

				if (!checkpoint) {
					checkpointInfo.createEl("p", {
						text: "No checkpoint found. Sync is running normally.",
						cls: "checkpoint-empty",
					});
					return;
				}

				// T062: Display checkpoint metadata
				const age = this.formatCheckpointAge(checkpoint.timestamp);
				const progress = `${checkpoint.fetchedCount}/${checkpoint.totalCount} (${Math.floor((checkpoint.fetchedCount / checkpoint.totalCount) * 100)}%)`;

				checkpointInfo.createEl("p", {
					text: `Checkpoint created: ${age}`,
				});
				checkpointInfo.createEl("p", {
					text: `Progress: ${progress}`,
				});

				if (checkpoint.status === "in_progress") {
					const warningEl = checkpointInfo.createEl("p", {
						cls: "checkpoint-warning",
					});
					warningEl.createEl("strong", {
						text: "⚠️ Previous sync was interrupted. You can resume from checkpoint.",
					});
				}
			} catch (error) {
				checkpointInfo.empty();
				const errorMessage = error instanceof Error ? error.message : "Unknown error";
				checkpointInfo.createEl("p", {
					text: `Error loading checkpoint: ${errorMessage}`,
					cls: "checkpoint-error",
				});
			}
		};

		// Load checkpoint info on display
		void loadCheckpointInfo();

		// T061: Add "Reset Checkpoint" button
		new Setting(containerEl)
			.setName("Reset Checkpoint")
			.setDesc("Delete the checkpoint file and start fresh on next sync")
			.addButton((button) =>
				button
					.setButtonText("Reset Checkpoint")
					.setWarning() // Make button stand out as a destructive action
					.onClick(async () => {
						// T063: Implement resetCheckpoint action handler
						await this.resetCheckpoint(loadCheckpointInfo);
					}),
			);

		// Help Section
		new Setting(containerEl).setName("Help & Resources").setHeading();

		const helpDiv = containerEl.createDiv();
		helpDiv.createEl("p", {
			text: "Need help? Visit the plugin documentation or report issues on GitHub.",
		});

		new Setting(containerEl)
			.setName("View Documentation")
			.setDesc("Open the plugin documentation")
			.addButton((button) =>
				button.setButtonText("Open").onClick(() => {
					window.open(
						"https://github.com/yourusername/obsidian-github-stargazer",
						"_blank",
					);
				}),
			);
	}

	/**
	 * Format checkpoint timestamp to human-readable age
	 * T062: Helper method for checkpoint metadata display
	 */
	private formatCheckpointAge(timestamp?: string): string {
		if (!timestamp) {
			return "Unknown";
		}

		const checkpointDate = new Date(timestamp);
		const now = new Date();
		const ageMs = now.getTime() - checkpointDate.getTime();

		// Calculate age in appropriate units
		const seconds = Math.floor(ageMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days} day${days !== 1 ? "s" : ""} ago`;
		}
		if (hours > 0) {
			return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		}
		if (minutes > 0) {
			return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		}
		return "Just now";
	}

	/**
	 * Reset checkpoint - delete checkpoint file and refresh display
	 * T063: Action handler for "Reset Checkpoint" button
	 */
	private async resetCheckpoint(
		refreshCallback: () => Promise<void>,
	): Promise<void> {
		try {
			const checkpointManager = new CheckpointManager(this.app);

			// Check if checkpoint exists
			const checkpoint = await checkpointManager.loadCheckpoint();
			if (!checkpoint) {
				new Notice("No checkpoint found to reset.");
				return;
			}

			// Delete checkpoint
			await checkpointManager.deleteCheckpoint();

			// Show confirmation notice
			new Notice("✓ Checkpoint deleted successfully. Next sync will start fresh.");

			// Refresh display
			await refreshCallback();
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : "Unknown error";
			new Notice(`Failed to reset checkpoint: ${errorMessage}`);
			console.error("[SettingsTab] Failed to reset checkpoint:", error);
		}
	}
}
