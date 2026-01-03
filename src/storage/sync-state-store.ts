import type { App } from "obsidian";
import type { SyncState } from "@/types";

/**
 * Storage layer for sync state
 *
 * Manages loading, saving, and updating sync state including progress tracking
 * and last sync information.
 */
export class SyncStateStore {
	private readonly STATE_FILE = "github-sync-state.json";
	private app: App;

	constructor(app: App) {
		this.app = app;
	}

	/**
	 * Load sync state from storage
	 */
	async loadSyncState(): Promise<SyncState> {
		try {
			const data = await this.app.vault.adapter.read(this.STATE_FILE);

			if (!data) {
				// Return default state if file doesn't exist
				const defaultState = this.getDefaultState();
				return defaultState;
			}

			const parsed = JSON.parse(data) as SyncState;
			return parsed;
		} catch {
			// File doesn't exist or is invalid
			return this.getDefaultState();
		}
	}

	/**
	 * Save sync state to storage
	 */
	async saveSyncState(state: SyncState): Promise<void> {
		const content = JSON.stringify(state, null, 2);
		await this.app.vault.adapter.write(this.STATE_FILE, content);
	}

	/**
	 * Update sync progress
	 */
	async updateProgress(progress: {
		currentStep: string;
		repositoriesProcessed: number;
		totalRepositories: number;
		isResuming?: boolean;
		fetchedCount?: number;
		convertedCount?: number;
	}): Promise<void> {
		const state = await this.loadSyncState();

		state.currentStep = progress.currentStep;
		state.repositoriesProcessed = progress.repositoriesProcessed;
		state.totalRepositories = progress.totalRepositories;
		state.percentageComplete =
			progress.totalRepositories > 0
				? Math.floor(
						(progress.repositoriesProcessed / progress.totalRepositories) * 100,
					)
				: 0;

		// T060: Save checkpoint info if provided
		if (progress.isResuming !== undefined) {
			state.isResuming = progress.isResuming;
		}
		if (progress.fetchedCount !== undefined) {
			state.fetchedCount = progress.fetchedCount;
		}
		if (progress.convertedCount !== undefined) {
			state.convertedCount = progress.convertedCount;
		}

		await this.saveSyncState(state);
	}

	/**
	 * Mark sync as started
	 */
	async markSyncStarted(): Promise<void> {
		const state = await this.loadSyncState();

		state.isSyncing = true;
		state.currentStep = "Initializing";
		const now = new Date().toISOString();
		state.startTime = now;
		state.lastSync = now;
		state.error = null;

		await this.saveSyncState(state);
	}

	/**
	 * Mark sync as completed
	 */
	async markSyncCompleted(repositoryCount: number): Promise<void> {
		const state = await this.loadSyncState();

		state.isSyncing = false;
		const completedAt = new Date().toISOString();
		state.lastSync = completedAt;
		state.currentStep = "Completed";
		state.repositoriesProcessed = repositoryCount;
		state.totalRepositories = repositoryCount;
		state.percentageComplete = 100;
		state.endTime = completedAt;
		state.error = null;

		if (state.startTime) {
			const duration =
				new Date(state.endTime).getTime() - new Date(state.startTime).getTime();
			state.duration = Math.floor(duration / 1000); // Duration in seconds
		}

		await this.saveSyncState(state);
	}

	/**
	 * Mark sync as failed
	 */
	async markSyncFailed(error: string): Promise<void> {
		const state = await this.loadSyncState();

		state.isSyncing = false;
		state.error = error;
		state.currentStep = "Failed";
		state.endTime = new Date().toISOString();

		await this.saveSyncState(state);
	}

	/**
	 * Reset sync state
	 */
	async resetSyncState(): Promise<void> {
		const defaultState = this.getDefaultState();
		await this.saveSyncState(defaultState);
	}

	/**
	 * Clear the internal cache
	 */
	clearCache(): void {
	}

	/**
	 * Get default sync state
	 */
	private getDefaultState(): SyncState {
		return {
			isSyncing: false,
			lastSync: null,
			currentStep: "idle",
			repositoriesProcessed: 0,
			totalRepositories: 0,
			percentageComplete: 0,
			error: null,
			startTime: null,
			endTime: null,
			duration: null,
		};
	}
}
