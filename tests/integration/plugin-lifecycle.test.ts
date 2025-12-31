import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from 'obsidian';
import GitHubStargazerPlugin from '@/main';

// Mock Obsidian App
const createMockApp = (): App => {
	return {
		vault: {} as any,
		workspace: {} as any,
		metadataCache: {} as any,
		loadData: vi.fn(),
		saveData: vi.fn(),
	} as unknown as App;
};

describe('Plugin Lifecycle', () => {
	let plugin: GitHubStargazerPlugin;
	let mockApp: App;

	beforeEach(() => {
		mockApp = createMockApp();
		plugin = new GitHubStargazerPlugin(mockApp, {} as any);
	});

	describe('onload', () => {
		it('should initialize settings store', async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);

			await plugin.onload();

			const settingsStore = plugin.getSettingsStore();
			expect(settingsStore).toBeDefined();
		});

		it('should register plugin commands', async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);

			const addCommandSpy = vi.spyOn(plugin, 'addCommand');

			await plugin.onload();

			expect(addCommandSpy).toHaveBeenCalledTimes(3);
		});

		it('should register ribbon icon', async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);

			const addRibbonIconSpy = vi.spyOn(plugin, 'addRibbonIcon');

			await plugin.onload();

			expect(addRibbonIconSpy).toHaveBeenCalledWith(
				'star',
				'GitHub Stargazer',
				expect.any(Function)
			);
		});

		it('should load existing settings from app data', async () => {
			const mockSettings = {
				githubToken: 'ghp_test_token_123456789012345678901234567890',
				autoSyncEnabled: true,
				autoSyncIntervalMinutes: 45,
				lastSyncAt: '2025-12-30T12:00:00Z',
				maxRepositoryCacheSize: 500,
			};

			vi.mocked(mockApp.loadData).mockResolvedValue(mockSettings);

			await plugin.onload();

			const settingsStore = plugin.getSettingsStore();
			const settings = settingsStore.getSettings();
			expect(settings.githubToken).toBe('ghp_test_token_123456789012345678901234567890');
			expect(settings.autoSyncEnabled).toBe(true);
		});
	});

	describe('onunload', () => {
		it('should log unloading message', async () => {
			const consoleSpy = vi.spyOn(console, 'log');

			await plugin.onload();
			plugin.onunload();

			expect(consoleSpy).toHaveBeenCalledWith('Unloading GitHub Stargazer plugin');
		});
	});

	describe('getSettingsStore', () => {
		it('should return settings store instance', async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);

			await plugin.onload();

			const settingsStore = plugin.getSettingsStore();
			expect(settingsStore).toBeDefined();
			expect(settingsStore).toHaveProperty('getSettings');
			expect(settingsStore).toHaveProperty('set');
			expect(settingsStore).toHaveProperty('update');
		});
	});
});
