# Obsidian release metadata design

## Goal

Unify plugin release versioning around a single source of truth and automate GitHub releases from `main` without relying on manual tag pushes.

## Decisions

- `package.json.version` is the source of truth for the release version in this repository.
- `manifest.json.version` must always match `package.json.version` because Obsidian requires the release tag to match the manifest version.
- `versions.json` remains required Obsidian metadata and is derived from the release version plus `manifest.json.minAppVersion`.
- Release automation runs on pushes to `main`, but only publishes when the version value changes.
- The project continues to use `pnpm`.

## Resulting flow

1. Bump `package.json.version`.
2. Run the existing version script to sync `manifest.json.version` and `versions.json`.
3. Merge to `main`.
4. GitHub Actions validates the metadata, builds the plugin, and creates a GitHub release whose tag matches the version.

## Validation rules

- `package.json.version === manifest.json.version`
- `versions.json[package.json.version] === manifest.json.minAppVersion`
- A release is created only when the current version differs from the version on the previous `main` commit.

## Scope

- Add a reusable versioning helper and test coverage.
- Fix the current version drift in repository metadata.
- Add a release workflow using `pnpm`.
