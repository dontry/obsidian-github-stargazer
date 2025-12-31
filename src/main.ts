import { Notice, Plugin } from "obsidian";
import { SyncCommand } from "@/commands/sync-command";
import { RepositoryStore } from "@/storage/repository-store";
import { SettingsStore } from "@/storage/settings-store";
import { SyncStateStore } from "@/storage/sync-state-store";
import type { PluginSettings } from "@/types";
import { GitHubStargazerSettingTab } from "@/ui/settings-tab";
import { COMMAND_IDS, COMMAND_NAMES } from "@/utils/constants";

/**
 * GitHub Stargazer Plugin
 * Sync and manage GitHub starred repositories in Obsidian
 */
export default class GitHubStargazerPlugin extends Plugin {
	private settingsStore!: SettingsStore;
	private repositoryStore!: RepositoryStore;
	private syncStateStore!: SyncStateStore;
	private syncCommand!: SyncCommand;
	settings!: PluginSettings;

	async onload() {
		console.debug("Loading GitHub Stargazer plugin");

		// Initialize stores
		this.settingsStore = new SettingsStore(this);
		this.repositoryStore = new RepositoryStore(this.app);
		this.syncStateStore = new SyncStateStore(this.app);

		// Load settings
		await this.settingsStore.loadSettings();
		this.settings = this.settingsStore.getSettings();

		// Initialize sync command
		this.syncCommand = new SyncCommand();

		// Register commands
		this.registerCommands();

		// Register settings tab
		this.addSettingTab(new GitHubStargazerSettingTab(this.app, this));

		// Add ribbon icon
		// eslint-disable-next-line obsidianmd/ui/sentence-case
		this.addRibbonIcon("star", "GitHub Stargazer", (evt: MouseEvent) => {
			this.syncRepositories().catch(err => console.error(err));
		});

		// Auto-sync if enabled
		if (this.settings.autoSyncEnabled) {
			// Perform initial sync after a short delay
			setTimeout(() => {
				this.syncRepositories().catch(err => console.error(err));
			}, 5000);
		}
	}

	onunload() {
		console.debug("Unloading GitHub Stargazer plugin");
	}

	/**
	 * Register all plugin commands
	 */
	private registerCommands() {
		// Sync starred repositories command (incremental)
		this.addCommand({
			id: COMMAND_IDS.SYNC,
			name: COMMAND_NAMES.SYNC,
			callback: () => {
				this.syncRepositories("incremental").catch(err => console.error(err));
			},
		});

		// Force full sync command
		this.addCommand({
			id: `${COMMAND_IDS.SYNC}-force`,
			name: `${COMMAND_NAMES.SYNC} (Force Full Sync)`,
			callback: () => {
				this.syncRepositories("initial").catch(err => console.error(err));
			},
		});

		// Open repository view command
		this.addCommand({
			id: COMMAND_IDS.OPEN_VIEW,
			name: COMMAND_NAMES.OPEN_VIEW,
			callback: () => {
				new Notice("Repository view coming soon!");
			},
		});

		// Batch un-star repositories command
		this.addCommand({
			id: COMMAND_IDS.BATCH_UNSTAR,
			name: COMMAND_NAMES.BATCH_UNSTAR,
			callback: () => {
				new Notice("Batch un-star coming soon!");
			},
		});
	}

	/**
	 * Sync repositories from GitHub
	 */
	private async syncRepositories(
		mode: "initial" | "incremental" = "incremental",
	) {
		if (!this.settings.githubToken || this.settings.githubToken.trim() === "") {
			new Notice(
				// eslint-disable-next-line obsidianmd/ui/sentence-case
				"Please configure your GitHub token in settings first. Open Settings Community plugins → GitHub Stargazer.",
			);
			return;
		}

		try {
			await this.syncCommand.execute(
				this.settings.githubToken,
				this.repositoryStore,
				this.syncStateStore,
				mode,
			);
		} catch (error) {
			// Error is already handled by syncCommand, but we can add additional logging here
			console.error("[GitHub Stargazer] Sync error:", error);
		}
	}

	/**
	 * Get settings store instance
	 */
	getSettingsStore(): SettingsStore {
		return this.settingsStore;
	}

	/**
	 * Get repository store instance
	 */
	getRepositoryStore(): RepositoryStore {
		return this.repositoryStore;
	}

	/**
	 * Get sync state store instance
	 */
	getSyncStateStore(): SyncStateStore {
		return this.syncStateStore;
	}

	/**
	 * Save settings
	 */
	async saveSettings(): Promise<void> {
		await this.settingsStore.update(this.settings);
	}
}
