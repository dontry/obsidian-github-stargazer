import { describe, expect, it } from "vitest";
import {
	synchronizeReleaseMetadata,
	validateReleaseMetadata,
} from "../scripts/versioning.mjs";

describe("release metadata versioning", () => {
	it("syncs manifest and versions.json from package.json.version", () => {
		const packageJson = { version: "1.2.3" };
		const manifest = { version: "1.2.2", minAppVersion: "1.8.0" };
		const versions = { "1.2.2": "1.7.0" };

		const synced = synchronizeReleaseMetadata(packageJson, manifest, versions);

		expect(synced.manifest.version).toBe("1.2.3");
		expect(synced.versions).toMatchObject({
			"1.2.2": "1.7.0",
			"1.2.3": "1.8.0",
		});
	});

	it("reports mismatched package and manifest versions", () => {
		const errors = validateReleaseMetadata(
			{ version: "1.2.3" },
			{ version: "1.2.2", minAppVersion: "1.8.0" },
			{ "1.2.3": "1.8.0" },
		);

		expect(errors).toContain(
			"package.json.version (1.2.3) must match manifest.json.version (1.2.2)",
		);
	});

	it("reports missing versions.json mapping for the release version", () => {
		const errors = validateReleaseMetadata(
			{ version: "1.2.3" },
			{ version: "1.2.3", minAppVersion: "1.8.0" },
			{ "1.2.2": "1.8.0" },
		);

		expect(errors).toContain(
			"versions.json must contain an entry for release version 1.2.3",
		);
	});

	it("reports mismatched minAppVersion mapping", () => {
		const errors = validateReleaseMetadata(
			{ version: "1.2.3" },
			{ version: "1.2.3", minAppVersion: "1.8.0" },
			{ "1.2.3": "1.7.0" },
		);

		expect(errors).toContain(
			"versions.json entry for 1.2.3 must match manifest.json.minAppVersion (1.8.0)",
		);
	});
});
