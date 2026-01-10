import { type App, Notice } from "obsidian";
import type GitHubStargazerPlugin from "@/main";
import type { RepositoryStore } from "@/storage/repository-store";
import type { SyncStateStore } from "@/storage/sync-state-store";
import { CheckpointManager } from "@/sync/checkpoint-manager";
import { SyncService } from "@/sync/sync-service";
import { RepositoryDeletionModal } from "@/ui/repository-deletion-modal";
import { ERROR_MESSAGES } from "@/utils/constants";
import { info } from "@/utils/logger";

/**
 * Sync command handler
 *
 * Handles the execution of the sync repositories command, including
 * error handling and user notifications.
 */
export class SyncCommand {
	private syncService: SyncService | null = null;

	/**
	 * Execute the sync command
	 */
	async execute(
		app: App,
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
		mode: "initial" | "incremental" = "incremental",
		pageSize?: number,
	): Promise<void> {
		// Validate GitHub token
		if (!githubToken || githubToken.trim() === "") {
			new Notice(ERROR_MESSAGES.INVALID_TOKEN);
			return;
		}

		try {
			// Initialize sync service with app instance
			this.syncService = new SyncService(
				app,
				githubToken,
				repositoryStore,
				syncStateStore,
				pageSize,
			);

			// Check if this is an initial or incremental sync
			const syncState = await syncStateStore.loadSyncState();

			// Show progress indicator only in environments with window
			if (typeof window !== "undefined") {
				const { showSyncProgress } = await import("@/ui/sync-progress");
				showSyncProgress(syncStateStore, false);
			}

			if (mode === "initial" || !syncState.lastSync) {
				// Initial sync
				new Notice("Starting initial sync...");
				await this.syncService.performInitialSync();
			} else {
				// Incremental sync
				new Notice("Starting incremental sync...");
				const result =
					await this.syncService.performIncrementalSync();

				// Show deletion prompt if there are unstarred repositories
				if (result.removed.length > 0) {
					info(
						`Found ${result.removed.length} unstarred repository/repositories`,
					);
					new RepositoryDeletionModal(
						app,
						result.removed,
						repositoryStore,
					).open();
				}
			}

			new Notice("Sync completed successfully!");
		} catch (error) {
			this.handleError(error);
		}
	}

	/**
	 * Handle errors during sync
	 */
	private handleError(error: unknown): void {
		let message:
			| (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES]
			| `Sync failed: ${string}`
			| "Unknown Error" = "Unknown Error";

		if (error instanceof Error) {
			// Check for specific error types
			if (
				error.message.includes("401") ||
				error.message.includes("Authentication")
			) {
				message = ERROR_MESSAGES.AUTH_FAILED;
			} else if (
				error.message.includes("403") ||
				error.message.includes("rate limit")
			) {
				message = ERROR_MESSAGES.RATE_LIMIT_EXCEEDED;
			} else if (
				error.message.includes("fetch") ||
				error.message.includes("network")
			) {
				message = ERROR_MESSAGES.NETWORK_ERROR;
			} else {
				message = `Sync failed: ${error.message}`;
			}
		}
		new Notice(message);
		console.error("[GitHub Stargazer] Sync error:", error);
	}

	/**
	 * Execute force full sync - delete checkpoint and start fresh
	 * T065: Force sync command handler that skips confirmation
	 */
	async executeForceSync(
		app: App,
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
		pageSize?: number,
	): Promise<void> {
		// Validate GitHub token
		if (!githubToken || githubToken.trim() === "") {
			new Notice(ERROR_MESSAGES.INVALID_TOKEN);
			return;
		}

		try {
			// T065: Delete checkpoint before syncing
			const checkpointManager = new CheckpointManager(app);
			const checkpoint = await checkpointManager.loadCheckpoint();

			if (checkpoint) {
				await checkpointManager.deleteCheckpoint();
				new Notice("✓ Checkpoint deleted. Starting fresh sync...");
			} else {
				new Notice("No checkpoint found. Starting fresh sync...");
			}

			// Initialize sync service with app instance
			this.syncService = new SyncService(
				app,
				githubToken,
				repositoryStore,
				syncStateStore,
				pageSize,
			);

			// Show progress indicator only in environments with window
			if (typeof window !== "undefined") {
				const { showSyncProgress } = await import("@/ui/sync-progress");
				showSyncProgress(syncStateStore, false);
			}

			// Perform initial sync (fresh start)
			new Notice("Starting force full sync...");
			await this.syncService.performInitialSync();

			new Notice("Force sync completed successfully!");
		} catch (error) {
			this.handleError(error);
		}
	}

	/**
	 * Cancel ongoing sync
	 */
	cancel(): void {
		// Note: Implementing cancellation is complex and may require AbortController
		// For now, we'll just notify the user
		new Notice(
			"Sync cancellation requested. The current operation will complete.",
		);
	}
}

/**
 * Factory function to create and register the sync command
 */
export function registerSyncCommand(
	plugin: GitHubStargazerPlugin,
	repositoryStore: RepositoryStore,
	syncStateStore: SyncStateStore,
): void {
	const syncCommand = new SyncCommand();

	plugin.addCommand({
		id: "sync-repositories",
		name: "Sync starred repositories",
		callback: async () => {
			const settings = plugin.settings;
			await syncCommand.execute(
				plugin.app,
				settings.githubToken,
				repositoryStore,
				syncStateStore,
				"incremental",
				settings.pageSize,
			);
		},
	});

	// Also register a force initial sync command
	plugin.addCommand({
		id: "sync-repositories-force",
		name: "Sync starred repositories (force full sync)",
		callback: async () => {
			const settings = plugin.settings;
			await syncCommand.execute(
				plugin.app,
				settings.githubToken,
				repositoryStore,
				syncStateStore,
				"initial",
				settings.pageSize,
			);
		},
	});
}
