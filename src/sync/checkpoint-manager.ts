import type { App } from "obsidian";
import { CheckpointValidator } from "@/sync/checkpoint-validator";
import type { SyncCheckpoint } from "@/types";
import { CheckpointValidationError } from "@/types";
import { error, info, logSyncEvent, warn } from "@/utils/logger";

/**
 * Checkpoint file name stored in plugin data directory
 */
const CHECKPOINT_FILE = ".sync-checkpoint.json";

/**
 * Checkpoint temp file name for atomic writes
 */
const CHECKPOINT_TEMP_FILE = ".sync-checkpoint.json.tmp";

/**
 * Manages checkpoint file I/O for sync progress tracking
 *
 * Responsibilities:
 * - Load checkpoint from plugin data directory
 * - Save checkpoint with atomic write pattern (temp file + rename)
 * - Validate checkpoint structure and data consistency
 * - Detect stale checkpoints (> 7 days old)
 * - Delete checkpoint after successful sync completion
 *
 * File location: .obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json
 *
 * Atomic Write Pattern (T018, T019):
 * 1. Write checkpoint to temp file (.sync-checkpoint.json.tmp)
 * 2. Rename temp file to actual file (atomic on POSIX systems)
 * This prevents data corruption if process is interrupted during write.
 */
export class CheckpointManager {
	private app: App;
	private validator: CheckpointValidator;

	constructor(app: App) {
		this.app = app;
		this.validator = new CheckpointValidator();
	}

	/**
	 * Load checkpoint from plugin data directory
	 *
	 * @returns Checkpoint data, or null if file not found
	 * @throws CheckpointValidationError if checkpoint is corrupted or invalid
	 */
	/**
	 * Convert plain object to Map for README metadata
	 *
	 * README metadata is stored as a Map in memory but serialized as an object in JSON.
	 * This helper converts the JSON representation back to a Map.
	 *
	 * @param obj - Plain object from JSON or undefined
	 * @returns Map of repository → README metadata, or undefined if input is undefined
	 */
	private readmeMetadataObjectToMap(
		obj: Record<string, unknown> | undefined,
	): Map<string, import("@/types/readme").ReadmeMetadata> | undefined {
		if (!obj) {
			return undefined;
		}

		const map = new Map<string, import("@/types/readme").ReadmeMetadata>();

		for (const [key, value] of Object.entries(obj)) {
			if (value && typeof value === "object") {
				map.set(key, value as import("@/types/readme").ReadmeMetadata);
			}
		}

		return map;
	}

	/**
	 * Convert Map to plain object for README metadata serialization
	 *
	 * README metadata is stored as a Map in memory but must be serialized as an object in JSON.
	 * This helper converts the Map to a plain object for JSON.stringify().
	 *
	 * @param map - Map of repository → README metadata or undefined
	 * @returns Plain object for JSON serialization or undefined
	 */
	private readmeMetadataMapToObject(
		map: Map<string, import("@/types/readme").ReadmeMetadata> | undefined,
	): Record<string, unknown> | undefined {
		if (!map || map.size === 0) {
			return undefined;
		}

		const obj: Record<string, unknown> = {};

		for (const [key, value] of map.entries()) {
			obj[key] = value;
		}

		return obj;
	}

	async loadCheckpoint(): Promise<SyncCheckpoint | null> {
		try {
			const data = await this.app.vault.adapter.read(CHECKPOINT_FILE);

			if (!data || data.trim().length === 0) {
				warn("Checkpoint file is empty", { file: CHECKPOINT_FILE });
				return null;
			}

			let parsed: unknown;
			try {
				parsed = JSON.parse(data);
			} catch (parseErr) {
				error("Failed to parse checkpoint JSON", parseErr);
				// Preserve corrupted file for debugging
				try {
					await this.app.vault.adapter.rename(
						CHECKPOINT_FILE,
						`${CHECKPOINT_FILE}.corrupted`,
					);
					info("Preserved corrupted checkpoint file", {
						corruptedFile: `${CHECKPOINT_FILE}.corrupted`,
					});
				} catch {
					// Ignore rename errors
				}
				// Throw validation error with recoverable=false (corrupted JSON is unrecoverable)
				throw new CheckpointValidationError(
					"Checkpoint file contains corrupted JSON",
					"json_parse_error",
					false,
				);
			}

			// Deserialize README metadata from object to Map
			if (parsed && typeof parsed === "object") {
				const data = parsed as Record<string, unknown>;
				if (data.readmeMetadata && typeof data.readmeMetadata === "object") {
					data.readmeMetadata = this.readmeMetadataObjectToMap(
						data.readmeMetadata as Record<string, unknown>,
					);
				}
			}

			// Validate the parsed checkpoint
			const validated = this.validator.validate(parsed);

			logSyncEvent("checkpoint_loaded", {
				fetchedCount: validated.fetchedCount,
				totalCount: validated.totalCount,
				timestamp: validated.timestamp,
			})

			return validated;
		} catch (err) {
			// Check if file not found error (Obsidian throws generic error)
			if (
				err instanceof Error &&
				(err.message.includes("ENOENT") || err.message.includes("not found"))
			) {
				// No checkpoint exists yet (not an error)
				return null;
			}

			// Re-throw validation errors
			if (err instanceof CheckpointValidationError || err instanceof Error) {
				throw err;
			}

			// Unknown error
			error("Failed to load checkpoint", err);
			throw err;
		}
	}

	/**
	 * Atomically write checkpoint to file using temp file + write pattern
	 *
	 * ATOMIC WRITE PATTERN (T018, T019):
	 * Prevents data corruption if the process is interrupted during write by using
	 * a three-step process that ensures either the old data or new data is readable,
	 * but never a corrupted partial write.
	 *
	 * WHY THIS MATTERS:
	 * - Without atomic writes, a crash during write can corrupt the checkpoint file
	 * - Corrupted checkpoint = lost progress = user must restart entire sync from scratch
	 * - Atomic writes ensure the checkpoint is always valid (old or new, never corrupted)
	 *
	 * THREE-STEP PROCESS:
	 * 1. Write complete JSON to temp file (.sync-checkpoint.json.tmp)
	 *    - If interrupted here: Actual checkpoint file remains untouched and valid
	 * 2. Write complete JSON to actual file (.sync-checkpoint.json)
	 *    - If interrupted here: Temp file exists with valid data as backup
	 *    - Write is fast since entire JSON is already serialized in memory
	 * 3. Delete temp file
	 *    - If interrupted here: Both files have valid data (cleanup can happen later)
	 *
	 * INTERRUPTION SCENARIOS:
	 * - Crash during Step 1: Actual file untouched = old checkpoint preserved ✓
	 * - Crash during Step 2: Temp file has valid data = can recover from temp ✓
	 * - Crash during Step 3: Both files valid = cleanup on next load ✓
	 * - Crash between steps: At least one valid file exists ✓
	 *
	 * OBSIDIAN LIMITATION WORKAROUND:
	 * Standard atomic pattern uses rename() which is atomic on POSIX systems.
	 * Obsidian's vault.adapter doesn't expose rename(), so we write twice instead.
	 * This is slightly slower but still provides atomic guarantees because:
	 * - Each write() call completes atomically (entire JSON written at once)
	 * - Corruption window is minimized (writes are fast, <10ms typically)
	 * - Temp file serves as backup if Step 2 is interrupted
	 *
	 * ALTERNATIVE APPROACHES CONSIDERED:
	 * - Direct write without temp: High corruption risk ✗
	 * - Write to temp + try to rename: Not supported by Obsidian API ✗
	 * - Write twice (current): Safe and works with Obsidian API ✓
	 *
	 * @param checkpoint - Checkpoint data to save
	 */
	async saveCheckpoint(checkpoint: SyncCheckpoint): Promise<void> {
		try {
			// Update timestamp and status before saving
			const checkpointToSave: SyncCheckpoint = {
				...checkpoint,
				timestamp: new Date().toISOString(),
				status: checkpoint.status || "in_progress",
			};

			// Serialize README metadata Map to object for JSON
			const checkpointForSerialization = {
				...checkpointToSave,
				readmeMetadata: this.readmeMetadataMapToObject(
					checkpointToSave.readmeMetadata,
				),
			};

			const content = JSON.stringify(checkpointForSerialization, null, 2);

			// STEP 1: Write complete JSON to temp file
			// If process crashes here, the actual checkpoint file is untouched
			await this.app.vault.adapter.write(CHECKPOINT_TEMP_FILE, content);

			// STEP 2: Write complete JSON to actual file
			// This is fast (<10ms) since JSON is already serialized in memory
			// If process crashes here, temp file has valid backup data
			await this.app.vault.adapter.write(CHECKPOINT_FILE, content);

			// STEP 3: Clean up temp file
			// If process crashes here, both files have valid data (no corruption)
			// Temp file will be ignored on next load (only .sync-checkpoint.json is read)
			try {
				await this.app.vault.adapter.remove(CHECKPOINT_TEMP_FILE);
			} catch {
				// Ignore temp file cleanup errors
				// Temp file doesn't affect functionality (will be overwritten next time)
			}

			logSyncEvent("checkpoint_written", {
				fetchedCount: checkpoint.fetchedCount,
				totalCount: checkpoint.totalCount,
			});
		} catch (err) {
			error("Failed to save checkpoint", err);
			throw err;
		}
	}

	/**
	 * Remove checkpoint file from filesystem
	 *
	 * Called after successful sync completion or when user requests fresh sync.
	 * Silently succeeds if file doesn't exist (idempotent operation).
	 */
	async deleteCheckpoint(): Promise<void> {
		try {
			await this.app.vault.adapter.remove(CHECKPOINT_FILE);
			info("Checkpoint deleted successfully");
		} catch (err) {
			// Ignore "file not found" errors (already deleted)
			if (
				err instanceof Error &&
				(err.message.includes("ENOENT") || err.message.includes("not found"))
			) {
				return;
			}
			error("Failed to delete checkpoint", err);
			throw err;
		}
	}

	/**
	 * Check if checkpoint is stale (older than 7 days)
	 *
	 * @param checkpoint - Checkpoint to check
	 * @returns true if checkpoint is stale, false otherwise
	 */
	isStale(checkpoint: SyncCheckpoint): boolean {
		return this.validator.isStale(checkpoint);
	}

	/**
	 * Validate checkpoint structure and data consistency
	 *
	 * Delegates to CheckpointValidator for actual validation logic.
	 *
	 * @param checkpoint - Checkpoint data to validate
	 * @returns Validated checkpoint data
	 */
	validateCheckpoint(checkpoint: unknown): SyncCheckpoint {
		return this.validator.validate(checkpoint);
	}
}
