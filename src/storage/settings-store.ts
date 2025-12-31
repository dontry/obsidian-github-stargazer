import { App, Notice } from 'obsidian';
import { PluginSettings } from '@/types';

/**
 * Default plugin settings
 */
const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: '',
	autoSyncEnabled: false,
	autoSyncIntervalMinutes: 60,
	lastSyncAt: null,
	maxRepositoryCacheSize: 1000,
};

/**
 * Settings store for managing plugin settings
 * Uses Obsidian's data API for secure storage
 */
export class SettingsStore {
	private app: App;
	private settings: PluginSettings;

	constructor(app: App) {
		this.app = app;
		this.settings = { ...DEFAULT_SETTINGS };
	}

	/**
	 * Load settings from Obsidian's data storage
	 */
	async loadSettings(): Promise<void> {
		try {
			const savedData = await this.app.loadData();
			if (savedData) {
				// Merge saved settings with defaults to handle new fields
				this.settings = {
					...DEFAULT_SETTINGS,
					...savedData,
					// Ensure nested objects are properly merged if needed
				};
			}
		} catch (error) {
			new Notice('Failed to load settings. Using defaults.');
			console.error('Failed to load settings:', error);
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	/**
	 * Save settings to Obsidian's data storage
	 */
	async saveSettings(): Promise<void> {
		try {
			await this.app.saveData(this.settings);
		} catch (error) {
			new Notice('Failed to save settings.');
			console.error('Failed to save settings:', error);
			throw error;
		}
	}

	/**
	 * Get all settings
	 */
	getSettings(): PluginSettings {
		return { ...this.settings };
	}

	/**
	 * Get a specific setting value
	 */
	get<K extends keyof PluginSettings>(key: K): PluginSettings[K] {
		return this.settings[key];
	}

	/**
	 * Set a specific setting value
	 */
	async set<K extends keyof PluginSettings>(
		key: K,
		value: PluginSettings[K]
	): Promise<void> {
		this.settings[key] = value;
		await this.saveSettings();
	}

	/**
	 * Update multiple settings at once
	 */
	async update(updates: Partial<PluginSettings>): Promise<void> {
		this.settings = {
			...this.settings,
			...updates,
		};
		await this.saveSettings();
	}

	/**
	 * Reset all settings to defaults
	 */
	async resetToDefaults(): Promise<void> {
		this.settings = { ...DEFAULT_SETTINGS };
		await this.saveSettings();
		new Notice('Settings reset to defaults.');
	}

	/**
	 * Validate GitHub token format
	 */
	validateGitHubToken(token: string): { valid: boolean; error?: string } {
		if (!token) {
			return { valid: false, error: 'GitHub token is required.' };
		}

		if (token.length < 40) {
			return { valid: false, error: 'GitHub token must be at least 40 characters.' };
		}

		if (!token.startsWith('ghp_')) {
			return { valid: false, error: 'GitHub token must start with "ghp_".' };
		}

		return { valid: true };
	}
}
