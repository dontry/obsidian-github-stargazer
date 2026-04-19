# Obsidian Release Automation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make `package.json.version` the release source of truth, keep Obsidian metadata in sync, and publish a GitHub release automatically when the version changes on `main`.

**Architecture:** A small ESM helper in `scripts/` will own release metadata synchronization and validation. The existing `version-bump.mjs` script will call that helper, a Vitest file will lock the behavior down, and a GitHub Actions workflow will validate/build/release on `main`.

**Tech Stack:** Node.js, pnpm, Vitest, GitHub Actions

---

### Task 1: Add failing tests for release metadata rules

**Files:**

- Create: `tests/versioning.test.ts`
- Create: `scripts/versioning.mjs`

**Step 1: Write the failing test**

Add tests that expect:

- sync copies `package.json.version` into `manifest.json.version`
- sync adds the correct `versions.json` entry
- validation rejects mismatched package and manifest versions
- validation rejects missing `versions.json` mapping

**Step 2: Run test to verify it fails**

Run: `pnpm vitest run tests/versioning.test.ts`
Expected: FAIL because `scripts/versioning.mjs` does not exist yet.

### Task 2: Implement reusable version metadata helpers

**Files:**

- Create: `scripts/versioning.mjs`
- Modify: `version-bump.mjs`

**Step 1: Write minimal implementation**

Add pure helpers to:

- synchronize release metadata from `package.json.version`
- validate release metadata consistency

Update `version-bump.mjs` to use the helper and persist the synced files.

**Step 2: Run targeted test**

Run: `pnpm vitest run tests/versioning.test.ts`
Expected: PASS

### Task 3: Align repository metadata to the chosen source of truth

**Files:**

- Modify: `package.json`
- Modify: `manifest.json`
- Modify: `versions.json`

**Step 1: Update metadata**

- Set `package.json.version` to the current plugin release version
- keep `engines.pnpm`
- add a `packageManager` field for pnpm
- ensure `manifest.json.version` matches `package.json.version`
- ensure `versions.json` contains the current version mapping

**Step 2: Re-run targeted test**

Run: `pnpm vitest run tests/versioning.test.ts`
Expected: PASS

### Task 4: Add automated release workflow

**Files:**

- Create: `.github/workflows/release.yml`

**Step 1: Implement workflow**

Add a workflow that:

- triggers on pushes to `main`
- uses `pnpm`
- checks whether the version changed
- validates version consistency
- builds the plugin
- creates a GitHub release only when needed

**Step 2: Verify workflow syntax locally as far as practical**

Run: `pnpm run build && pnpm vitest run tests/versioning.test.ts`
Expected: PASS
