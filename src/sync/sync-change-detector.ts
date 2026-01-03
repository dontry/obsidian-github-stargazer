import type { Repository } from "@/types";

/**
 * Change detection utilities for sync operations
 *
 * Compares existing and current repository sets to identify
 * added, updated, and removed repositories.
 */
export class SyncChangeDetector {
	/**
	 * Detect changes between existing and current repositories
	 */
	detectChanges(
		existing: Map<string, Repository>,
		current: Repository[],
	): {
		added: Repository[];
		updated: Repository[];
		removed: string[];
	} {
		const added: Repository[] = [];
		const updated: Repository[] = [];
		const currentIds = new Set<string>();
		const existingIds = new Set(existing.keys());

		for (const repo of current) {
			currentIds.add(repo.id);

			const existingRepo = existing.get(repo.id);

			if (!existingRepo) {
				// New repository
				added.push(repo);
			} else if (this.hasRepositoryChanged(existingRepo, repo)) {
				// Updated repository
				updated.push(repo);
			}
		}

		// Find removed repositories
		const removed: string[] = [];
		for (const id of existingIds) {
			if (!currentIds.has(id)) {
				removed.push(id);
			}
		}

		return { added, updated, removed };
	}

	/**
	 * Check if repository has changed
	 */
	private hasRepositoryChanged(
		existing: Repository,
		current: Repository,
	): boolean {
		return (
			existing.updatedAt !== current.updatedAt ||
			existing.starCount !== current.starCount ||
			existing.description !== current.description ||
			existing.primaryLanguage !== current.primaryLanguage ||
			existing.readme !== current.readme
		);
	}
}
