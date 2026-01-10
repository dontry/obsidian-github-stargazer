import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsStore } from "@/storage/settings-store";
import type { PluginSettings } from "@/types";

// Mock Obsidian App
const mockApp = {
	loadData: vi.fn(),
	saveData: vi.fn(),
} as any;

describe("SettingsStore", () => {
	let settingsStore: SettingsStore;

	beforeEach(() => {
		// Reset mocks before each test
		vi.clearAllMocks();
		settingsStore = new SettingsStore(mockApp);
	});

	describe("loadSettings", () => {
		it("should load settings from app data", async () => {
			const mockData: PluginSettings = {
				githubToken: "ghp_test_token_123456789012345678901234567890",
				autoSyncEnabled: true,
				autoSyncIntervalMinutes: 30,
				lastSyncAt: "2025-12-30T12:00:00Z",
				maxRepositoryCacheSize: 500,
				pageSize: 10,
			};

			vi.mocked(mockApp.loadData).mockResolvedValue(mockData);

			await settingsStore.loadSettings();

			expect(mockApp.loadData).toHaveBeenCalledOnce();
			const loadedSettings = settingsStore.getSettings();
			expect(loadedSettings).toEqual(mockData);
		});

		it("should use defaults when no saved data exists", async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);

			await settingsStore.loadSettings();

			const loadedSettings = settingsStore.getSettings();
			expect(loadedSettings.githubToken).toBe("");
			expect(loadedSettings.autoSyncEnabled).toBe(false);
			expect(loadedSettings.maxRepositoryCacheSize).toBe(1000);
		});

		it("should merge saved data with defaults", async () => {
			const partialData = {
				githubToken: "ghp_test_token_123456789012345678901234567890",
				autoSyncEnabled: true,
			};

			vi.mocked(mockApp.loadData).mockResolvedValue(partialData);

			await settingsStore.loadSettings();

			const loadedSettings = settingsStore.getSettings();
			expect(loadedSettings.githubToken).toBe(
				"ghp_test_token_123456789012345678901234567890",
			);
			expect(loadedSettings.autoSyncEnabled).toBe(true);
			// Should have default values for missing fields
			expect(loadedSettings.autoSyncIntervalMinutes).toBe(60);
			expect(loadedSettings.maxRepositoryCacheSize).toBe(1000);
		});

		it("should handle load errors gracefully", async () => {
			vi.mocked(mockApp.loadData).mockRejectedValue(new Error("Load failed"));

			await settingsStore.loadSettings();

			const loadedSettings = settingsStore.getSettings();
			expect(loadedSettings.githubToken).toBe("");
			expect(loadedSettings.autoSyncEnabled).toBe(false);
		});
	});

	describe("saveSettings", () => {
		it("should save settings to app data", async () => {
			vi.mocked(mockApp.saveData).mockResolvedValue(undefined);

			await settingsStore.set(
				"githubToken",
				"ghp_test_token_123456789012345678901234567890",
			);

			expect(mockApp.saveData).toHaveBeenCalled();
		});

		it("should handle save errors", async () => {
			vi.mocked(mockApp.saveData).mockRejectedValue(new Error("Save failed"));

			await expect(
				settingsStore.set(
					"githubToken",
					"ghp_test_token_123456789012345678901234567890",
				),
			).rejects.toThrow();
		});
	});

	describe("getSettings", () => {
		it("should return a copy of settings", async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);
			await settingsStore.loadSettings();

			const settings1 = settingsStore.getSettings();
			const settings2 = settingsStore.getSettings();

			expect(settings1).toEqual(settings2);
			expect(settings1).not.toBe(settings2); // Different object references
		});
	});

	describe("get", () => {
		it("should return specific setting value", async () => {
			vi.mocked(mockApp.loadData).mockResolvedValue(null);
			await settingsStore.loadSettings();

			const token = settingsStore.get("githubToken");
			expect(token).toBe("");
		});
	});

	describe("set", () => {
		it("should set and save a specific setting", async () => {
			vi.mocked(mockApp.saveData).mockResolvedValue(undefined);

			await settingsStore.set("autoSyncEnabled", true);

			expect(settingsStore.get("autoSyncEnabled")).toBe(true);
			expect(mockApp.saveData).toHaveBeenCalled();
		});
	});

	describe("update", () => {
		it("should update multiple settings at once", async () => {
			vi.mocked(mockApp.saveData).mockResolvedValue(undefined);

			await settingsStore.update({
				githubToken: "ghp_test_token_123456789012345678901234567890",
				autoSyncEnabled: true,
				autoSyncIntervalMinutes: 45,
			});

			expect(settingsStore.get("githubToken")).toBe(
				"ghp_test_token_123456789012345678901234567890",
			);
			expect(settingsStore.get("autoSyncEnabled")).toBe(true);
			expect(settingsStore.get("autoSyncIntervalMinutes")).toBe(45);
			expect(mockApp.saveData).toHaveBeenCalledOnce();
		});
	});

	describe("resetToDefaults", () => {
		it("should reset all settings to defaults", async () => {
			vi.mocked(mockApp.saveData).mockResolvedValue(undefined);

			await settingsStore.update({
				githubToken: "ghp_test_token_123456789012345678901234567890",
				autoSyncEnabled: true,
			});

			await settingsStore.resetToDefaults();

			expect(settingsStore.get("githubToken")).toBe("");
			expect(settingsStore.get("autoSyncEnabled")).toBe(false);
			expect(settingsStore.get("autoSyncIntervalMinutes")).toBe(60);
			expect(mockApp.saveData).toHaveBeenCalledTimes(2); // Once for update, once for reset
		});
	});

	describe("validateGitHubToken", () => {
		it("should validate a correct GitHub token", () => {
			const result = settingsStore.validateGitHubToken(
				"ghp_test_token_123456789012345678901234567890",
			);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
		});

		it("should reject empty token", () => {
			const result = settingsStore.validateGitHubToken("");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("required");
		});

		it("should reject token that is too short", () => {
			const result = settingsStore.validateGitHubToken("ghp_short");
			expect(result.valid).toBe(false);
			expect(result.error).toContain("40 characters");
		});

		it("should reject token without ghp_ prefix", () => {
			const result = settingsStore.validateGitHubToken(
				"github_token_123456789012345678901234567890",
			);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("ghp_");
		});
	});
});
