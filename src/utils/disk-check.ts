import { Notice } from "obsidian";
import type { App } from "obsidian";
import { error, warn } from "./logger";

/**
 * Minimum disk space required for checkpoint operations (10MB)
 */
const MIN_DISK_SPACE_BYTES = 10 * 1024 * 1024;

/**
 * Test file name for disk space check
 */
const DISK_CHECK_TEST_FILE = ".disk-space-test.tmp";

/**
 * Check if sufficient disk space is available for checkpoint operations
 *
 * This function tests disk availability by attempting to write a 10MB test file.
 * If the write succeeds, there is sufficient space. If it fails, the disk may
 * be full or the user may not have write permissions.
 *
 * @param app - Obsidian App instance for vault adapter access
 * @returns true if sufficient disk space (>= 10MB), false otherwise
 */
export async function checkDiskSpace(app: App): Promise<boolean> {
	try {
		// Generate 10MB of dummy data
		const testData = "x".repeat(MIN_DISK_SPACE_BYTES);

		// Attempt to write test file
		await app.vault.adapter.write(DISK_CHECK_TEST_FILE, testData);

		// Clean up test file
		try {
			await app.vault.adapter.remove(DISK_CHECK_TEST_FILE);
		} catch {
			warn("Failed to clean up disk space test file");
			// Continue - test was successful even if cleanup failed
		}

		return true;
	} catch (err) {
		error("Disk space check failed - insufficient space or write permission denied", err);
		new Notice(
			`Insufficient disk space. At least ${MIN_DISK_SPACE_BYTES / (1024 * 1024)}MB required for sync operations.`,
		);
		return false;
	}
}
