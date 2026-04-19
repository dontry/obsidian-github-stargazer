import { readFileSync, writeFileSync } from "node:fs";
import {
	synchronizeReleaseMetadata,
	validateReleaseMetadata,
} from "./scripts/versioning.mjs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(readFileSync("manifest.json", "utf8"));
const versions = JSON.parse(readFileSync("versions.json", "utf8"));

const synced = synchronizeReleaseMetadata(packageJson, manifest, versions);
const errors = validateReleaseMetadata(
	packageJson,
	synced.manifest,
	synced.versions,
);

if (errors.length > 0) {
	throw new Error(`Release metadata is invalid:\n- ${errors.join("\n- ")}`);
}

writeFileSync("manifest.json", `${JSON.stringify(synced.manifest, null, "\t")}\n`);
writeFileSync("versions.json", `${JSON.stringify(synced.versions, null, "\t")}\n`);
