import { App, Modal, Setting } from "obsidian";
import type { SyncCheckpoint } from "@/types";

/**
 * Modal for confirming resume from checkpoint or starting fresh sync
 * Shows checkpoint metadata and allows user to choose resume or fresh sync
 */
export class ResumeConfirmationModal extends Modal {
	private checkpoint: SyncCheckpoint;
	private onResume: () => void;
	private onFreshSync: () => void;

	constructor(
		app: App,
		checkpoint: SyncCheckpoint,
		onResume: () => void,
		onFreshSync: () => void,
	) {
		super(app);
		this.checkpoint = checkpoint;
		this.onResume = onResume;
		this.onFreshSync = onFreshSync;
	}

	/**
	 * Format timestamp to human-readable age
	 * T039: Display checkpoint metadata
	 */
	private formatCheckpointAge(): string {
		if (!this.checkpoint.timestamp) {
			return "Unknown";
		}

		const checkpointDate = new Date(this.checkpoint.timestamp);
		const now = new Date();
		const ageMs = now.getTime() - checkpointDate.getTime();

		// Calculate age in appropriate units
		const seconds = Math.floor(ageMs / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);
		const days = Math.floor(hours / 24);

		if (days > 0) {
			return `${days} day${days !== 1 ? "s" : ""} ago`;
		}
		if (hours > 0) {
			return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
		}
		if (minutes > 0) {
			return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
		}
		return "Just now";
	}

	/**
	 * Calculate completion percentage
	 * T039: Display checkpoint metadata
	 */
	private calculateProgress(): string {
		const { fetchedCount, totalCount } = this.checkpoint;
		const percentage = Math.floor((fetchedCount / totalCount) * 100);
		return `${fetchedCount}/${totalCount} (${percentage}%)`;
	}

	/**
	 * Check if checkpoint is stale (> 7 days)
	 * T039: Display checkpoint metadata
	 */
	private isStale(): boolean {
		if (!this.checkpoint.timestamp) {
			return true;
		}

		const checkpointDate = new Date(this.checkpoint.timestamp);
		const now = new Date();
		const ageMs = now.getTime() - checkpointDate.getTime();
		const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

		return ageMs > SEVEN_DAYS_MS;
	}

	/**
	 * Open and display the modal
	 * T039: Implement modal UI with checkpoint metadata
	 */
	override onOpen() {
		const { contentEl } = this;

		contentEl.empty();

		// T039: Modal title
		contentEl.createEl("h2", { text: "Resume Sync from Checkpoint?" });

		// T039: Display checkpoint metadata
		const metadataEl = contentEl.createDiv();
		metadataEl.addClass("checkpoint-modal-metadata");

		// Creation date
		new Setting(metadataEl)
			.setName("Checkpoint created")
			.setDesc(this.formatCheckpointAge())
			.setHeading();

		// Progress
		new Setting(metadataEl)
			.setName("Progress")
			.setDesc(this.calculateProgress())
			.setHeading();

		// T039: Stale checkpoint warning
		if (this.isStale()) {
			const warningEl = contentEl.createDiv();
			warningEl.addClass("checkpoint-modal-warning");
			warningEl.addClass("checkpoint-modal-warning-stale");
			warningEl.createEl("strong", {
				text: "⚠️ Warning: This checkpoint is old (> 7 days). The data may be outdated.",
			});
		}

		// T039: Missing optional fields warning
		const missingFields: string[] = [];
		if (!this.checkpoint.timestamp) missingFields.push("timestamp");
		if (!this.checkpoint.status) missingFields.push("status");
		if (!this.checkpoint.sessionId) missingFields.push("sessionId");

		if (missingFields.length > 0) {
			const warningEl = contentEl.createDiv();
			warningEl.addClass("checkpoint-modal-warning");
			warningEl.addClass("checkpoint-modal-warning-missing");
			warningEl.createEl("strong", {
				text: `⚠️ Note: Checkpoint is missing some fields: ${missingFields.join(", ")}. Resume will still work.`,
			});
		}

		// T040, T041: Buttons container
		const buttonContainer = contentEl.createDiv();
		buttonContainer.addClass("checkpoint-modal-button-container");

		// T040: "Resume from checkpoint" primary button (CTA style)
		const resumeButton = buttonContainer.createEl("button", {
			text: "Resume from Checkpoint",
			cls: "mod-cta",
		});
		resumeButton.addClass("checkpoint-modal-button");

		// T042: onResume callback
		resumeButton.onClickEvent(() => {
			this.onResume();
			this.close();
		});

		// T041: "Start fresh sync" secondary button
		const freshSyncButton = buttonContainer.createEl("button", {
			text: "Start Fresh Sync",
		});
		freshSyncButton.addClass("checkpoint-modal-button");

		// T042: onFreshSync callback
		freshSyncButton.onClickEvent(() => {
			this.onFreshSync();
			this.close();
		});
	}

	/**
	 * Clean up when modal is closed
	 */
	override onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}
