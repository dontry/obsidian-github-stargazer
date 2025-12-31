import { Notice } from "obsidian";
import type { RepositoryStore } from "@/storage/repository-store";
import type { SyncStateStore } from "@/storage/sync-state-store";
import { SyncService } from "@/sync/sync-service";
import { ERROR_MESSAGES } from "@/utils/constants";

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
		githubToken: string,
		repositoryStore: RepositoryStore,
		syncStateStore: SyncStateStore,
		mode: "initial" | "incremental" = "incremental",
	): Promise<void> {
		// Validate GitHub token
		if (!githubToken || githubToken.trim() === "") {
			new Notice(ERROR_MESSAGES.INVALID_TOKEN);
			return;
		}

		try {
			// Initialize sync service
			this.syncService = new SyncService(
				githubToken,
				repositoryStore,
				syncStateStore,
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
				await this.syncService.performIncrementalSync();
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
		let message: (typeof ERROR_MESSAGES)[keyof typeof ERROR_MESSAGES] | `Sync failed: ${string}` | "Unknown Error" = "Unknown Error"

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
	plugin: any,
	repositoryStore: RepositoryStore,
	syncStateStore: SyncStateStore,
): void {
	const syncCommand = new SyncCommand();

	plugin.addCommand({
		id: "sync-repositories",
		name: "Sync Starred Repositories",
		callback: async () => {
			const settings = plugin.settings;
			await syncCommand.execute(
				settings.githubToken,
				repositoryStore,
				syncStateStore,
				"incremental",
			);
		},
	});

	// Also register a force initial sync command
	plugin.addCommand({
		id: "sync-repositories-force",
		name: "Sync Starred Repositories (Force Full Sync)",
		callback: async () => {
			const settings = plugin.settings;
			await syncCommand.execute(
				settings.githubToken,
				repositoryStore,
				syncStateStore,
				"initial",
			);
		},
	});
}
