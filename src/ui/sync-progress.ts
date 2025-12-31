import { App, Notice, Modal } from 'obsidian';
import { SyncStateStore } from '@/storage/sync-state-store';

/**
 * Extended SyncState interface for UI display
 * (This matches the actual structure used by SyncStateStore)
 */
interface SyncProgressState {
	isSyncing: boolean;
	lastSync: string | null;
	currentStep: string;
	repositoriesProcessed: number;
	totalRepositories: number;
	percentageComplete: number;
	error: string | null;
	startTime: string | null;
	endTime: string | null;
	duration: number | null;
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
	private progressEl: HTMLElement;
	private statusEl: HTMLElement;
	private statsEl: HTMLElement;

	constructor(app: App, syncStateStore: SyncStateStore) {
		super(app);
		this.syncStateStore = syncStateStore;
		this.titleEl.setText('GitHub Sync Progress');
	}

	/**
	 * Open the modal and start polling for updates
	 */
	onOpen(): void {
		const { contentEl } = this;

		// Create container
		const container = contentEl.createDiv({ cls: 'sync-progress-container' });

		// Status message
		this.statusEl = container.createEl('p', { cls: 'sync-status' });
		this.statusEl.setText('Initializing...');

		// Progress bar container
		const progressBarContainer = container.createDiv({
			cls: 'sync-progress-bar-container',
		});
		this.progressEl = progressBarContainer.createDiv({ cls: 'sync-progress-bar' });

		// Statistics
		this.statsEl = container.createEl('p', { cls: 'sync-stats' });
		this.statsEl.setText('');

		// Add styles
		this.addStyles();

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
		this.updateDisplay();

		// Poll every 500ms
		this.pollInterval = window.setInterval(() => {
			this.updateDisplay();
		}, 500);
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

			// Update status
			this.statusEl.setText(state.currentStep || 'Initializing...');

			// Update progress bar
			const percentage = state.percentageComplete || 0;
			this.progressEl.style.width = `${percentage}%`;

			// Update stats
			const processed = state.repositoriesProcessed || 0;
			const total = state.totalRepositories || 0;
			this.statsEl.setText(`${processed} / ${total} repositories (${percentage}%)`);

			// If not syncing, close modal after a brief delay
			if (!state.isSyncing) {
				this.stopPolling();

				// Show completion message
				if (state.error) {
					this.statusEl.setText('Sync failed!');
					new Notice(`Sync failed: ${state.error}`);
				} else {
					this.statusEl.setText('Sync completed!');
					new Notice('Sync completed successfully!');
				}

				// Auto-close after 2 seconds
				setTimeout(() => {
					this.close();
				}, 2000);
			}
		} catch (error) {
			console.error('[SyncProgressModal] Error updating display:', error);
		}
	}

	/**
	 * Add CSS styles for the progress modal
	 */
	private addStyles(): void {
		// Styles are injected into the document
		if (!document.getElementById('sync-progress-styles')) {
			const style = document.createElement('style');
			style.id = 'sync-progress-styles';
			style.textContent = `
				.sync-progress-container {
					padding: 20px;
					min-width: 400px;
				}

				.sync-status {
					font-size: 16px;
					font-weight: 500;
					margin-bottom: 15px;
					text-align: center;
				}

				.sync-progress-bar-container {
					width: 100%;
					height: 24px;
					background-color: var(--background-modifier-border);
					border-radius: 12px;
					overflow: hidden;
					margin-bottom: 15px;
				}

				.sync-progress-bar {
					height: 100%;
					background: linear-gradient(90deg, var(--interactive-accent) 0%, var(--interactive-accent-hover) 100%);
					transition: width 0.3s ease;
					width: 0%;
				}

				.sync-stats {
					font-size: 14px;
					color: var(--text-muted);
					text-align: center;
					margin: 0;
				}
			`;
			document.head.appendChild(style);
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
		this.updateNotice();

		// Poll every 2 seconds (less frequent than modal to avoid spam)
		this.pollInterval = window.setInterval(() => {
			this.updateNotice();
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

			let message = '';

			if (state.isSyncing) {
				message = `Syncing: ${state.currentStep} (${processed}/${total} - ${percentage}%)`;
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
			console.error('[SyncProgressNotice] Error updating notice:', error);
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
	useModal: boolean = false
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
