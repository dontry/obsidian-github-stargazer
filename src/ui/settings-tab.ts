import { type App, PluginSettingTab, Setting } from "obsidian";
import type GitHubStargazerPlugin from "@/main";

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
		containerEl.createEl("h2", { text: "GitHub Stargazer Settings" });

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
		containerEl.createEl("h3", { text: "Sync Status" });

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

		// Help Section
		containerEl.createEl("h3", { text: "Help & Resources" });

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
}
