#!/usr/bin/env node
/**
 * Backfill script: adds `metadataFilePath` and `readmeVaultFilePath` to every
 * repository in github-starred-repos.json that is missing those fields.
 *
 * Uses the same sanitization + path-generation logic as:
 *   src/utils/path-utils.ts  →  sanitizePathSegment / generateMetadataFilePath / generateReadmeFilePath
 *
 * Usage:
 *   node scripts/backfill-file-paths.mjs [path/to/github-starred-repos.json]
 *
 * If no argument is supplied the script defaults to the known vault location.
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Path-utils logic (mirrors src/utils/path-utils.ts exactly)
// ---------------------------------------------------------------------------

const MAX_PATH_SEGMENT_LENGTH = 200;

function sanitizePathSegment(segment) {
	let sanitized = segment.replace(/[\\/:*?"<>|\s]/g, "-");
	sanitized = sanitized.replace(/-+/g, "-");
	sanitized = sanitized.replace(/^-+|-+$/g, "");
	if (sanitized.length === 0) sanitized = "unnamed";
	if (sanitized.length > MAX_PATH_SEGMENT_LENGTH) {
		sanitized = sanitized.substring(0, MAX_PATH_SEGMENT_LENGTH);
	}
	return sanitized;
}

function generateMetadataFilePath(owner, repo) {
	const o = sanitizePathSegment(owner);
	const r = sanitizePathSegment(repo);
	return `${o}/${r}/${o}-${r}-metadata.md`;
}

function generateReadmeFilePath(owner, repo) {
	const o = sanitizePathSegment(owner);
	const r = sanitizePathSegment(repo);
	return `${o}/${r}/${o}-${r}-readme.md`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const DEFAULT_JSON_PATH =
	"/Volumes/external-storage/obsidian-notes/Github Repo/github-starred-repos.json";

const jsonPath = path.resolve(process.argv[2] ?? DEFAULT_JSON_PATH);

if (!fs.existsSync(jsonPath)) {
	console.error(`❌  File not found: ${jsonPath}`);
	process.exit(1);
}

console.log(`📂  Reading: ${jsonPath}`);
const raw = fs.readFileSync(jsonPath, "utf8");
const data = JSON.parse(raw);

if (!Array.isArray(data.repositories)) {
	console.error("❌  JSON does not have a top-level `repositories` array.");
	process.exit(1);
}

let backfilledMetadata = 0;
let backfilledReadme = 0;
let skipped = 0;
let malformed = 0;

for (const repo of data.repositories) {
	const parts = (repo.nameWithOwner ?? "").split("/");
	if (parts.length !== 2 || !parts[0] || !parts[1]) {
		console.warn(`⚠️   Skipping malformed nameWithOwner: "${repo.nameWithOwner}" (id: ${repo.id})`);
		malformed++;
		continue;
	}

	const [owner, repoName] = parts;
	let changed = false;

	if (!repo.metadataFilePath) {
		repo.metadataFilePath = generateMetadataFilePath(owner, repoName);
		backfilledMetadata++;
		changed = true;
	}

	if (!repo.readmeVaultFilePath) {
		repo.readmeVaultFilePath = generateReadmeFilePath(owner, repoName);
		backfilledReadme++;
		changed = true;
	}

	if (!changed) skipped++;
}

// Write back with same formatting (2-space indent)
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2) + "\n", "utf8");

console.log(`\n✅  Done!`);
console.log(`   Backfilled metadataFilePath  : ${backfilledMetadata} repos`);
console.log(`   Backfilled readmeVaultFilePath: ${backfilledReadme} repos`);
console.log(`   Already complete (skipped)   : ${skipped} repos`);
if (malformed > 0) {
	console.log(`   Malformed nameWithOwner      : ${malformed} repos (check warnings above)`);
}
console.log(`\n   Saved to: ${jsonPath}`);
