import type { Plugin as ObsidianPlugin } from "obsidian";
import { Notice } from "obsidian";
import type { PluginSettings } from "@/types";

const isTestEnvironment = () =>
	typeof process !== "undefined" && process.env?.NODE_ENV === "test";

/**
 * Default plugin settings
 */
const DEFAULT_SETTINGS: PluginSettings = {
	githubToken: "",
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
	private plugin: ObsidianPlugin;
	private settings: PluginSettings;

	constructor(plugin: ObsidianPlugin) {
		this.plugin = plugin;
		this.settings = { ...DEFAULT_SETTINGS };
	}

	/**
	 * Load settings from Obsidian's data storage
	 */
	async loadSettings(): Promise<void> {
		try {
			// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
			const savedData = await this.plugin.loadData();
			if (savedData) {
				// Merge saved settings with defaults to handle new fields
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				this.settings = {
					...DEFAULT_SETTINGS,
					...savedData,
				};
			}
		} catch (error) {
			if (!isTestEnvironment()) {
				new Notice("Failed to load settings. Using defaults.");
				console.error("Failed to load settings:", error);
			}
			this.settings = { ...DEFAULT_SETTINGS };
		}
	}

	/**
	 * Save settings to Obsidian's data storage
	 */
	async saveSettings(): Promise<void> {
		try {
			await this.plugin.saveData(this.settings);
		} catch (error) {
			if (!isTestEnvironment()) {
				new Notice("Failed to save settings.");
				console.error("Failed to save settings:", error);
			}
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
		value: PluginSettings[K],
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
		if (!isTestEnvironment()) {
			new Notice("Settings reset to defaults.");
		}
	}

	/**
	 * Validate GitHub token format
	 */
	validateGitHubToken(token: string): { valid: boolean; error?: string } {
		if (!token) {
			return { valid: false, error: "GitHub token is required." };
		}

		if (token.length < 40) {
			return {
				valid: false,
				error: "GitHub token must be at least 40 characters.",
			};
		}

		if (!token.startsWith("ghp_")) {
			return { valid: false, error: 'GitHub token must start with "ghp_".' };
		}

		return { valid: true };
	}
}
