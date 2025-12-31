import { Plugin, Notice } from 'obsidian';
import { SettingsStore } from '@/storage/settings-store';
import { RepositoryStore } from '@/storage/repository-store';
import { SyncStateStore } from '@/storage/sync-state-store';
import { SyncCommand } from '@/commands/sync-command';
import { GitHubStargazerSettingTab } from '@/ui/settings-tab';
import { COMMAND_IDS, COMMAND_NAMES } from '@/utils/constants';
import { PluginSettings } from '@/types';

/**
 * GitHub Stargazer Plugin
 * Sync and manage GitHub starred repositories in Obsidian
 */
export default class GitHubStargazerPlugin extends Plugin {
	private settingsStore: SettingsStore;
	private repositoryStore: RepositoryStore;
	private syncStateStore: SyncStateStore;
	private syncCommand: SyncCommand;
	private settings: PluginSettings;

	async onload() {
		console.log('Loading GitHub Stargazer plugin');

		// Initialize stores
		this.settingsStore = new SettingsStore(this.app);
		this.repositoryStore = new RepositoryStore(this.app);
		this.syncStateStore = new SyncStateStore(this.app);

		// Load settings
		await this.settingsStore.loadSettings();
		this.settings = this.settingsStore.getAll() as PluginSettings;

		// Initialize sync command
		this.syncCommand = new SyncCommand();

		// Register commands
		this.registerCommands();

		// Register settings tab
		this.addSettingTab(new GitHubStargazerSettingTab(this.app, this));

		// Add ribbon icon
		this.addRibbonIcon('star', 'GitHub Stargazer', (evt: MouseEvent) => {
			this.syncRepositories();
		});

		// Auto-sync if enabled
		if (this.settings.autoSyncEnabled) {
			// Perform initial sync after a short delay
			setTimeout(() => {
				this.syncRepositories();
			}, 5000);
		}
	}

	onunload() {
		console.log('Unloading GitHub Stargazer plugin');
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
				this.syncRepositories('incremental');
			},
		});

		// Force full sync command
		this.addCommand({
			id: COMMAND_IDS.SYNC + '-force',
			name: COMMAND_NAMES.SYNC + ' (Force Full Sync)',
			callback: () => {
				this.syncRepositories('initial');
			},
		});

		// Open repository view command
		this.addCommand({
			id: COMMAND_IDS.OPEN_VIEW,
			name: COMMAND_NAMES.OPEN_VIEW,
			callback: () => {
				new Notice('Repository view coming soon!');
			},
		});

		// Batch un-star repositories command
		this.addCommand({
			id: COMMAND_IDS.BATCH_UNSTAR,
			name: COMMAND_NAMES.BATCH_UNSTAR,
			callback: () => {
				new Notice('Batch un-star coming soon!');
			},
		});
	}

	/**
	 * Sync repositories from GitHub
	 */
	private async syncRepositories(mode: 'initial' | 'incremental' = 'incremental') {
		if (!this.settings.githubToken || this.settings.githubToken.trim() === '') {
			new Notice(
				'Please configure your GitHub token in settings first. Open Settings → Community plugins → GitHub Stargazer.'
			);
			return;
		}

		try {
			await this.syncCommand.execute(
				this.settings.githubToken,
				this.repositoryStore,
				this.syncStateStore,
				mode
			);
		} catch (error) {
			// Error is already handled by syncCommand, but we can add additional logging here
			console.error('[GitHub Stargazer] Sync error:', error);
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
		await this.settingsStore.saveAll(this.settings);
	}
}
