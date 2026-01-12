import { Notice, Plugin } from "obsidian";
import { SyncCommand } from "@/commands/sync-command";
import { UnstarCommand } from "@/commands/unstar-command";
import { RepositoryStore } from "@/storage/repository-store";
import { SettingsStore } from "@/storage/settings-store";
import { SyncStateStore } from "@/storage/sync-state-store";
import type { PluginSettings } from "@/types";
import { CommandMenuModal, type CommandMenuItem } from "@/ui/command-menu";
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
		this.addRibbonIcon("star", "GitHub Stargazer", (evt: MouseEvent) => {
			this.showRibbonMenu();
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
		// T064: Updated to pass force flag which deletes checkpoint before syncing
		this.addCommand({
			id: COMMAND_IDS.FORCE_FULL_SYNC,
			name: COMMAND_NAMES.FORCE_FULL_SYNC,
			callback: () => {
				this.syncRepositories("initial", { force: true }).catch(err => console.error(err));
			},
		});

		// Batch un-star repositories command
		this.addCommand({
			id: COMMAND_IDS.UNSTAR,
			name: COMMAND_NAMES.UNSTAR,
			callback: () => {
				const unstarCommand = new UnstarCommand();
				unstarCommand.execute(
					this.app,
					this.settings.githubToken,
					this.repositoryStore,
				).catch(err => console.error(err));
			},
		});
	}

	/**
	 * Show ribbon icon menu with all available commands
	 */
	private showRibbonMenu() {
		const items = this.getCommandMenuItems();
		new CommandMenuModal(this.app, items).open();
	}

	private getCommandMenuItems(): CommandMenuItem[] {
		return [
			{
				id: COMMAND_IDS.SYNC,
				name: `GitHub Stargazer: ${COMMAND_NAMES.SYNC}`,
				icon: "sync",
				action: () => {
					this.syncRepositories("incremental").catch((err) => console.error(err));
				},
			},
			{
				id: COMMAND_IDS.FORCE_FULL_SYNC,
				name: `GitHub Stargazer: ${COMMAND_NAMES.FORCE_FULL_SYNC}`,
				icon: "refresh-cw",
				action: () => {
					this.syncRepositories("initial", { force: true }).catch((err) => console.error(err));
				},
			},
			{
				id: COMMAND_IDS.UNSTAR,
				name: `GitHub Stargazer: ${COMMAND_NAMES.UNSTAR}`,
				icon: "star-off",
				action: () => {
					const unstarCommand = new UnstarCommand();
					unstarCommand
						.execute(this.app, this.settings.githubToken, this.repositoryStore)
						.catch((err) => console.error(err));
				},
			},
		];
	}

	/**
	 * Sync repositories from GitHub
	 * T066: Modified to accept options parameter with force flag
	 */
	private async syncRepositories(
		mode: "initial" | "incremental" = "incremental",
		options?: { force?: boolean },
	) {
		if (!this.settings.githubToken || this.settings.githubToken.trim() === "") {
			new Notice(
				"Please configure your GitHub token in settings first. Open Settings Community plugins → GitHub Stargazer.",
			);
			return;
		}

		try {
			// T066: Pass force option to sync command
			if (options?.force) {
				await this.syncCommand.executeForceSync(
					this.app,
					this.settings.githubToken,
					this.repositoryStore,
					this.syncStateStore,
					this.settings.pageSize,
				);
			} else {
				await this.syncCommand.execute(
					this.app,
					this.settings.githubToken,
					this.repositoryStore,
					this.syncStateStore,
					mode,
					this.settings.pageSize,
				);
			}
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
