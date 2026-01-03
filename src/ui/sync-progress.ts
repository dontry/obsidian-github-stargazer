import { type App, Modal, Notice } from "obsidian";
import type { SyncStateStore } from "@/storage/sync-state-store";

// Extend Window interface to include app property (Obsidian global)
declare global {
	interface Window {
		app: App;
	}
}

/**
 * Sync progress indicator modal
 *
 * Displays real-time sync progress including current step,
 * progress bar, repositories processed, and estimated time remaining.
 */
export class SyncProgressModal extends Modal {
	private syncStateStore: SyncStateStore;
	private pollInterval: number | null = null;
	private progressEl: HTMLElement | null = null;
	private statusEl: HTMLElement | null = null;
	private statsEl: HTMLElement | null = null;

	constructor(app: App, syncStateStore: SyncStateStore) {
		super(app);
		this.syncStateStore = syncStateStore;
		this.titleEl.setText("GitHub Sync Progress");
	}

	/**
	 * Open the modal and start polling for updates
	 */
	onOpen(): void {
		const { contentEl } = this;

		// Create container
		const container = contentEl.createDiv({ cls: "sync-progress-container" });

		// Status message
		this.statusEl = container.createEl("p", { cls: "sync-status" });
		this.statusEl.setText("Initializing...");

		// Progress bar container
		const progressBarContainer = container.createDiv({
			cls: "sync-progress-bar-container",
		});
		this.progressEl = progressBarContainer.createDiv({
			cls: "sync-progress-bar",
		});

		// Statistics
		this.statsEl = container.createEl("p", { cls: "sync-stats" });
		this.statsEl.setText("");

		// Start polling
		this.startPolling();
	}

	/**
	 * Close the modal and stop polling
	 */
	onClose(): void {
		this.stopPolling();
		const { contentEl } = this;
		contentEl.empty();
	}

	/**
	 * Start polling for sync state updates
	 */
	private startPolling(): void {
		// Initial update
		void this.updateDisplay();

		// Poll every 1000ms
		this.pollInterval = window.setInterval(() => {
			void this.updateDisplay();
		}, 1000);
	}

	/**
	 * Stop polling for sync state updates
	 */
	private stopPolling(): void {
		if (this.pollInterval !== null) {
			window.clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	/**
	 * Update the display with current sync state
	 */
	private async updateDisplay(): Promise<void> {
		try {
			const state = await this.syncStateStore.loadSyncState();

			// T058: Add resume status indicator
			if (state.isResuming) {
				this.statusEl?.setText("Resuming from checkpoint");
			} else {
				this.statusEl?.setText(state.currentStep || "Initializing...");
			}

			// Update progress bar
			const percentage = state.percentageComplete || 0;
			if (this.progressEl) {
				this.progressEl.style.width = `${percentage}%`;
			}

			// T057: Display fetched count and converted count separately
			const fetched = state.fetchedCount || state.repositoriesProcessed || 0;
			const converted = state.convertedCount || 0;
			const total = state.totalRepositories || 0;

			let statsText = "";
			if (state.isResuming) {
				// Show both fetched and converted when resuming
				statsText = `Fetched: ${fetched}/${total} | Converted: ${converted} (${percentage}%)`;
			} else {
				// Show simple progress when starting fresh
				statsText = `${fetched} / ${total} repositories (${percentage}%)`;
			}
			this.statsEl?.setText(statsText);

			// If not syncing, close modal after a brief delay
			if (!state.isSyncing) {
				this.stopPolling();

				// Show completion message
				if (state.error) {
					this.statusEl?.setText("Sync failed!");
					new Notice(`Sync failed: ${state.error}`);
				} else {
					this.statusEl?.setText("Sync completed!");
					new Notice("Sync completed successfully!");
				}

				// Auto-close after 2 seconds
				setTimeout(() => {
					this.close();
				}, 2000);
			}
		} catch (error) {
			console.error("[SyncProgressModal] Error updating display:", error);
		}
	}
}

/**
 * Simple sync progress notice
 *
 * Shows a lightweight progress indicator using Obsidian's Notice system
 * with periodic updates instead of a modal.
 */
export class SyncProgressNotice {
	private syncStateStore: SyncStateStore;
	private notice: Notice | null = null;
	private pollInterval: number | null = null;

	constructor(syncStateStore: SyncStateStore) {
		this.syncStateStore = syncStateStore;
	}

	/**
	 * Start showing progress notices
	 */
	start(): void {
		// Initial notice
		void this.updateNotice();

		// Poll every 2 seconds (less frequent than modal to avoid spam)
		this.pollInterval = window.setInterval(() => {
			void this.updateNotice();
		}, 2000);
	}

	/**
	 * Stop showing progress notices
	 */
	stop(): void {
		if (this.pollInterval !== null) {
			window.clearInterval(this.pollInterval);
			this.pollInterval = null;
		}
	}

	/**
	 * Update the notice with current progress
	 */
	private async updateNotice(): Promise<void> {
		try {
			const state = await this.syncStateStore.loadSyncState();

			const processed = state.repositoriesProcessed || 0;
			const total = state.totalRepositories || 0;
			const percentage = state.percentageComplete || 0;

			let message = "";

			if (state.isSyncing) {
				// T058: Add resume status indicator to notice
				const statusPrefix = state.isResuming
					? "Resuming from checkpoint - "
					: "Syncing: ";
				message = `${statusPrefix}${state.currentStep} (${processed}/${total} - ${percentage}%)`;
			} else if (state.error) {
				message = `Sync failed: ${state.error}`;
				this.stop();
			} else if (state.lastSync) {
				message = `Sync completed: ${processed} repositories`;
				this.stop();
			}

			if (message) {
				// Create new notice (Obsidian automatically replaces old notices)
				this.notice = new Notice(message, 3000);
			}
		} catch (error) {
			console.error("[SyncProgressNotice] Error updating notice:", error);
		}
	}
}

/**
 * Factory function to show sync progress
 *
 * Automatically chooses between modal and notice based on user preference
 * or defaults to notice for simplicity.
 */
export function showSyncProgress(
	syncStateStore: SyncStateStore,
	useModal: boolean = false,
): SyncProgressModal | SyncProgressNotice {
	if (useModal) {
		const modal = new SyncProgressModal(window.app, syncStateStore);
		modal.open();
		return modal;
	} else {
		const notice = new SyncProgressNotice(syncStateStore);
		notice.start();
		return notice;
	}
}
