import type { SyncCheckpoint } from "@/types";
import { CheckpointValidationError } from "@/types";
import { warn } from "@/utils/logger";

/**
 * Checkpoint validation utilities
 *
 * Validates checkpoint structure and data consistency using lenient validation.
 */
export class CheckpointValidator {
	/**
	 * Validate checkpoint structure and data consistency
	 *
	 * Lenient validation approach:
	 * - Required fields: cursor, repositories, totalCount, fetchedCount
	 * - Optional fields: timestamp, status, sessionId (warn if missing)
	 * - Type checks: Ensure correct data types
	 * - Consistency checks: fetchedCount === repositories.length
	 *
	 * @param checkpoint - Checkpoint data to validate (unknown type for safety)
	 * @returns Validated checkpoint data
	 * @throws CheckpointValidationError with reason and recoverable flag
	 */
	validate(checkpoint: unknown): SyncCheckpoint {
		// Check if object
		if (!checkpoint || typeof checkpoint !== "object" || checkpoint === null) {
			throw new CheckpointValidationError(
				"Checkpoint must be an object",
				"invalid_format",
				false,
			);
		}

		const data = checkpoint as Record<string, unknown>;

		// Validate required fields
		const requiredFields = [
			"cursor",
			"repositories",
			"totalCount",
			"fetchedCount",
		];
		const missingFields = requiredFields.filter((field) => !(field in data));

		if (missingFields.length > 0) {
			throw new CheckpointValidationError(
				`Checkpoint missing required fields: ${missingFields.join(", ")}`,
				"missing_required_field",
				false,
			);
		}

		// Type checks for required fields
		if (data.cursor !== null && typeof data.cursor !== "string") {
			throw new CheckpointValidationError(
				"Checkpoint cursor must be string or null",
				"invalid_format",
				false,
			);
		}

		if (!Array.isArray(data.repositories)) {
			throw new CheckpointValidationError(
				"Checkpoint repositories must be an array",
				"invalid_format",
				false,
			);
		}

		if (typeof data.totalCount !== "number" || data.totalCount < 0) {
			throw new CheckpointValidationError(
				"Checkpoint totalCount must be a non-negative number",
				"invalid_format",
				false,
			);
		}

		if (typeof data.fetchedCount !== "number" || data.fetchedCount < 0) {
			throw new CheckpointValidationError(
				"Checkpoint fetchedCount must be a non-negative number",
				"invalid_format",
				false,
			);
		}

		// Validate optional fields (warn if missing)
		const optionalFields = ["timestamp", "status", "sessionId"];
		const missingOptional = optionalFields.filter((field) => !(field in data));

		if (missingOptional.length > 0) {
			warn("Checkpoint missing optional fields", {
				missingFields: missingOptional,
			});
		}

		// Validate optional field: readmeMetadata
		if ("readmeMetadata" in data && data.readmeMetadata != null) {
			// readmeMetadata can be either a Map (after deserialization) or an object (from JSON)
			const isMap =
				data.readmeMetadata instanceof Map ||
				(typeof data.readmeMetadata === "object" &&
					!Array.isArray(data.readmeMetadata));

			if (!isMap) {
				throw new CheckpointValidationError(
					"Checkpoint readmeMetadata must be an object or Map",
					"invalid_format",
					true,
				);
			}

			// Transform SUCCESS to NOT_AVAILABLE when sha/vaultFilePath are empty (no README exists)
			if (data.readmeMetadata instanceof Map) {
				for (const [, metadata] of data.readmeMetadata.entries()) {
					if (
						metadata &&
						typeof metadata === "object" &&
						(metadata as Record<string, unknown>).fetchStatus === "success" &&
						!(metadata as Record<string, unknown>).sha &&
						!(metadata as Record<string, unknown>).vaultFilePath
					) {
						// Transform to NOT_AVAILABLE status
						(metadata as Record<string, unknown>).fetchStatus =
							"not_available";
					}
				}
			} else if (typeof data.readmeMetadata === "object") {
				for (const [, metadata] of Object.entries(data.readmeMetadata)) {
					if (
						metadata &&
						typeof metadata === "object" &&
						(metadata as Record<string, unknown>).fetchStatus === "success" &&
						!(metadata as Record<string, unknown>).sha &&
						!(metadata as Record<string, unknown>).vaultFilePath
					) {
						// Transform to NOT_AVAILABLE status
						(metadata as Record<string, unknown>).fetchStatus =
							"not_available";
					}
				}
			}
		}

		// Consistency check: fetchedCount vs repositories.length
		const repositories = data.repositories as unknown[];
		const fetchedCount = data.fetchedCount;

		if (fetchedCount !== repositories.length) {
			warn("Checkpoint data inconsistency", {
				fetchedCount,
				repositoriesLength: repositories.length,
			});
			// This is recoverable - we trust the actual array length
		}

		// Return validated checkpoint (cast to SyncCheckpoint)
		return data as unknown as SyncCheckpoint;
	}

	/**
	 * Check if checkpoint is older than 7 days
	 *
	 * @param checkpoint - Checkpoint to check
	 * @returns true if checkpoint is stale (> 7 days old), false otherwise
	 */
	isStale(checkpoint: SyncCheckpoint): boolean {
		const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

		// If no timestamp, treat as stale (cannot determine age)
		if (!checkpoint.timestamp) {
			return true;
		}

		try {
			const checkpointDate = new Date(checkpoint.timestamp);

			// Check if date is invalid
			if (isNaN(checkpointDate.getTime())) {
				warn("Checkpoint has invalid timestamp", {
					timestamp: checkpoint.timestamp,
				});
				return true;
			}

			const now = new Date();
			const ageMs = now.getTime() - checkpointDate.getTime();

			const isStale = ageMs > SEVEN_DAYS_MS;

			if (isStale) {
				warn("Checkpoint is stale", {
					timestamp: checkpoint.timestamp,
					ageDays: Math.floor(ageMs / (24 * 60 * 60 * 1000)),
				});
			}

			return isStale;
		} catch (err) {
			warn("Failed to parse checkpoint timestamp", { error: err });
			// Treat invalid timestamp as stale (cannot determine age)
			return true;
		}
	}
}
