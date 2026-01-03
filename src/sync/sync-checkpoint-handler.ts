import { Notice } from "obsidian";
import type { App } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import { CheckpointManager } from "@/sync/checkpoint-manager";
import type { SyncCheckpoint, Repository } from "@/types";
import { info, error } from "@/utils/logger";

/**
 * Checkpoint management for sync operations
 *
 * Handles saving, loading, and updating checkpoints during sync.
 */
export class SyncCheckpointHandler {
	private checkpointManager: CheckpointManager;
	private repositoryStore: RepositoryStore;

	constructor(app: App, repositoryStore: RepositoryStore) {
		this.checkpointManager = new CheckpointManager(app);
		this.repositoryStore = repositoryStore;
	}

	/**
	 * Save checkpoint to disk
	 * Wraps CheckpointManager.saveCheckpoint() with error handling
	 */
	async syncCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
		try {
			await this.checkpointManager.saveCheckpoint(checkpoint);
			info("Checkpoint saved", {
				fetchedCount: checkpoint.fetchedCount,
				totalCount: checkpoint.totalCount,
			});
		} catch (err) {
			error("Failed to save checkpoint", err);
			// Non-fatal error - sync can continue
		}
	}

	/**
	 * Update checkpoint with new repositories and cursor
	 * Creates new checkpoint object with updated state
	 */
	async updateCheckpoint(
		existingCheckpoint: SyncCheckpoint,
		newRepositories: Repository[],
		newCursor: string | null,
	): Promise<SyncCheckpoint> {
		const updated: SyncCheckpoint = {
			...existingCheckpoint,
			repositories: [
				...existingCheckpoint.repositories,
				...newRepositories,
			],
			cursor: newCursor,
			fetchedCount:
				existingCheckpoint.fetchedCount + newRepositories.length,
			timestamp: new Date().toISOString(),
		};

		await this.syncCheckpoint(updated);
		return updated;
	}

	/**
	 * Convert repositories to final storage incrementally
	 * Adds repositories to RepositoryStore after each page fetch
	 */
	async convertIncremental(repositories: Repository[]): Promise<void> {
		if (repositories.length === 0) {
			return;
		}

		try {
			await this.repositoryStore.addRepositories(repositories);
			info("Repositories converted to storage", {
				count: repositories.length,
			});
		} catch (err) {
			error("Failed to convert repositories", err);
			throw err;
		}
	}

	/**
	 * Load checkpoint if it exists
	 * Returns null if no checkpoint found
	 */
	async loadCheckpointIfExists(): Promise<SyncCheckpoint | null> {
		try {
			const checkpoint = await this.checkpointManager.loadCheckpoint();

			if (checkpoint) {
				// Warning for missing optional fields
				const missingFields: string[] = [];
				if (!checkpoint.timestamp) missingFields.push("timestamp");
				if (!checkpoint.status) missingFields.push("status");
				if (!checkpoint.sessionId) missingFields.push("sessionId");

				if (missingFields.length > 0) {
					new Notice(
						`⚠️ Checkpoint missing fields: ${missingFields.join(", ")}`,
					);
				}

				// Check for concurrent sync (in_progress status)
				if (checkpoint.status === "in_progress") {
					new Notice(
						"⚠️ Previous sync was interrupted. You can resume from checkpoint.",
					);
				}

				return checkpoint;
			}

			return null;
		} catch (err) {
			error("Failed to load checkpoint", err);
			// If checkpoint is corrupted, treat as non-existent
			return null;
		}
	}

	/**
	 * Delete checkpoint from disk
	 */
	async deleteCheckpoint(): Promise<void> {
		await this.checkpointManager.deleteCheckpoint();
	}
}
