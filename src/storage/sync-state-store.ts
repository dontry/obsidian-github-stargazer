import type { App } from "obsidian";
import type { SyncState } from "@/types";

/**
 * Event types emitted by SyncStateStore
 */
export type SyncStateEvent = "progress" | "started" | "completed" | "failed";

/**
 * Listener callback for sync state events
 */
export type SyncStateListener = (state: SyncState) => void;

/**
 * Storage layer for sync state
 *
 * Manages loading, saving, and updating sync state including progress tracking
 * and last sync information. Emits events when state changes for reactive updates.
 */
export class SyncStateStore {
	private readonly STATE_FILE = "github-sync-state.json";
	private app: App;
	private listeners: Map<SyncStateEvent, Set<SyncStateListener>>;

	constructor(app: App) {
		this.app = app;
		this.listeners = new Map();
	}

	/**
	 * Subscribe to sync state events
	 * @param event - The event type to listen for
	 * @param listener - Callback function that receives the updated state
	 * @returns Unsubscribe function
	 */
	on(event: SyncStateEvent, listener: SyncStateListener): () => void {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(listener);

		// Return unsubscribe function
		return () => {
			this.listeners.get(event)?.delete(listener);
		};
	}

	/**
	 * Emit an event to all listeners
	 */
	private emit(event: SyncStateEvent, state: SyncState): void {
		this.listeners.get(event)?.forEach((listener) => {
			try {
				listener(state);
			} catch (error) {
				console.error(`[SyncStateStore] Error in ${event} listener:`, error);
			}
		});
	}

	/**
	 * Remove all event listeners
	 */
	removeAllListeners(): void {
		this.listeners.clear();
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
		this.emit("progress", state);
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
		this.emit("started", state);
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
		this.emit("completed", state);
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
		this.emit("failed", state);
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
