/**
 * Unit Tests: SyncChangeDetector
 *
 * These tests verify that detectChanges() correctly identifies:
 *   - Added   — repos present in `current` but not in `existing`
 *   - Updated — repos present in both sets whose tracked fields changed
 *   - Removed — repos present in `existing` but not in `current`, or marked isUnstarred
 *
 * Run: pnpm test tests/unit/sync/sync-change-detector.test.ts
 */

import { describe, expect, it } from "vitest";
import { SyncChangeDetector } from "../../../src/sync/sync-change-detector.js";
import type { Repository } from "../../../src/types.js";

// ─── helpers ─────────────────────────────────────────────────────────────────

function makeRepo(overrides: Partial<Repository> & { id: string }): Repository {
	return {
		name: "repo",
		nameWithOwner: "owner/repo",
		description: "A description",
		url: "https://github.com/owner/repo",
		starCount: 100,
		primaryLanguage: "TypeScript",
		owner: "owner",
		createdAt: "2024-01-01T00:00:00Z",
		updatedAt: "2024-06-01T00:00:00Z",
		starredAt: "2024-07-01T00:00:00Z",
		topics: [],
		linkedResources: [],
		readmeSha: "abc123",
		// Extended metadata fields (feature 006)
		homepageUrl: null,
		license: null,
		forkCount: 0,
		openIssuesCount: 0,
		watchersCount: 0,
		...overrides,
	};
}

function makeExistingMap(repos: Repository[]): Map<string, Repository> {
	return new Map(repos.map((r) => [r.id, r]));
}

// ─── tests ───────────────────────────────────────────────────────────────────

describe("SyncChangeDetector.detectChanges", () => {
	const detector = new SyncChangeDetector();

	// ── added ──────────────────────────────────────────────────────────────

	describe("added", () => {
		it("returns a new repo as added when it is not in existing", () => {
			const current = [makeRepo({ id: "R_new" })];
			const { added, updated, removed } = detector.detectChanges(
				new Map(),
				current,
			);

			expect(added).toHaveLength(1);
			expect(added[0]!.id).toBe("R_new");
			expect(updated).toHaveLength(0);
			expect(removed).toHaveLength(0);
		});

		it("does not add a repo that already exists and is unchanged", () => {
			const repo = makeRepo({ id: "R_1" });
			const existing = makeExistingMap([repo]);
			const current = [{ ...repo }]; // identical copy

			const { added, updated } = detector.detectChanges(existing, current);

			expect(added).toHaveLength(0);
			expect(updated).toHaveLength(0);
		});
	});

	// ── updated ────────────────────────────────────────────────────────────
	// This section tests the bug fix: previously `updated` was always empty
	// because hasRepositoryChanged() was never called.

	describe("updated — core fields", () => {
		it("marks a repo as updated when updatedAt changes", () => {
			const existing = makeRepo({ id: "R_1", updatedAt: "2024-01-01T00:00:00Z" });
			const current = makeRepo({ id: "R_1", updatedAt: "2024-09-01T00:00:00Z" });

			const { added, updated } = detector.detectChanges(
				makeExistingMap([existing]),
				[current],
			);

			expect(added).toHaveLength(0);
			expect(updated).toHaveLength(1);
			expect(updated[0]!.id).toBe("R_1");
		});

		it("marks a repo as updated when starCount changes", () => {
			const existing = makeRepo({ id: "R_1", starCount: 100 });
			const current = makeRepo({ id: "R_1", starCount: 200 });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when description changes", () => {
			const existing = makeRepo({ id: "R_1", description: "old" });
			const current = makeRepo({ id: "R_1", description: "new" });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when primaryLanguage changes", () => {
			const existing = makeRepo({ id: "R_1", primaryLanguage: "JavaScript" });
			const current = makeRepo({ id: "R_1", primaryLanguage: "TypeScript" });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when readmeSha changes", () => {
			const existing = makeRepo({ id: "R_1", readmeSha: "sha_old" });
			const current = makeRepo({ id: "R_1", readmeSha: "sha_new" });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});
	});

	describe("updated — extended metadata fields (feature 006)", () => {
		it("marks a repo as updated when forkCount changes", () => {
			const existing = makeRepo({ id: "R_1", forkCount: 5 });
			const current = makeRepo({ id: "R_1", forkCount: 10 });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when openIssuesCount changes", () => {
			const existing = makeRepo({ id: "R_1", openIssuesCount: 3 });
			const current = makeRepo({ id: "R_1", openIssuesCount: 7 });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when watchersCount changes", () => {
			const existing = makeRepo({ id: "R_1", watchersCount: 20 });
			const current = makeRepo({ id: "R_1", watchersCount: 25 });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when homepageUrl changes", () => {
			const existing = makeRepo({ id: "R_1", homepageUrl: null });
			const current = makeRepo({ id: "R_1", homepageUrl: "https://example.com" });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("marks a repo as updated when license changes", () => {
			const existing = makeRepo({ id: "R_1", license: null });
			const current = makeRepo({ id: "R_1", license: "MIT" });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			expect(updated).toHaveLength(1);
		});

		it("does not mark a repo as updated when only extended fields are synced from undefined to 0 (existing undefined)", () => {
			// Repos synced before feature 006 have undefined extended fields.
			// undefined !== 0 must trigger an update so they get backfilled.
			const existing = makeRepo({ id: "R_1" });
			// Simulate a pre-006 repo that has never had forkCount stored
			delete (existing as Partial<Repository>).forkCount;
			const current = makeRepo({ id: "R_1", forkCount: 0 });

			const { updated } = detector.detectChanges(makeExistingMap([existing]), [current]);

			// undefined !== 0 → should be treated as a change and trigger a backfill
			expect(updated).toHaveLength(1);
		});
	});

	describe("updated — unchanged repo is not flagged", () => {
		it("does not flag a repo as updated when all tracked fields are identical", () => {
			const repo = makeRepo({
				id: "R_1",
				forkCount: 5,
				openIssuesCount: 3,
				watchersCount: 20,
				homepageUrl: "https://example.com",
				license: "MIT",
			});

			const { added, updated, removed } = detector.detectChanges(
				makeExistingMap([repo]),
				[{ ...repo }],
			);

			expect(added).toHaveLength(0);
			expect(updated).toHaveLength(0);
			expect(removed).toHaveLength(0);
		});
	});

	// ── removed ────────────────────────────────────────────────────────────

	describe("removed", () => {
		it("marks a repo as removed when it is no longer in current", () => {
			const existing = makeRepo({ id: "R_gone" });

			const { removed } = detector.detectChanges(
				makeExistingMap([existing]),
				[], // nothing current
			);

			expect(removed).toContain("R_gone");
		});

		it("marks an isUnstarred repo as removed even if it still appears in current", () => {
			const existing = makeRepo({ id: "R_1", isUnstarred: true });

			const { removed } = detector.detectChanges(
				makeExistingMap([existing]),
				[makeRepo({ id: "R_1" })],
			);

			expect(removed).toContain("R_1");
		});

		it("does not remove a repo that is still in current and not unstarred", () => {
			const repo = makeRepo({ id: "R_1" });

			const { removed } = detector.detectChanges(makeExistingMap([repo]), [repo]);

			expect(removed).toHaveLength(0);
		});
	});

	// ── mixed scenario ─────────────────────────────────────────────────────

	describe("mixed scenario", () => {
		it("correctly returns added, updated, and removed in a single call", () => {
			const unchanged = makeRepo({ id: "R_unchanged" });
			const toUpdate = makeRepo({ id: "R_update", forkCount: 5 });
			const toRemove = makeRepo({ id: "R_remove" });

			const existing = makeExistingMap([unchanged, toUpdate, toRemove]);

			const newRepo = makeRepo({ id: "R_new" });
			const updatedRepo = makeRepo({ id: "R_update", forkCount: 99 }); // changed

			const { added, updated, removed } = detector.detectChanges(existing, [
				unchanged,
				updatedRepo,
				newRepo,
				// toRemove deliberately absent
			]);

			expect(added.map((r) => r.id)).toEqual(["R_new"]);
			expect(updated.map((r) => r.id)).toEqual(["R_update"]);
			expect(removed).toContain("R_remove");
			expect(removed).not.toContain("R_unchanged");
			expect(removed).not.toContain("R_update");
		});
	});
});
