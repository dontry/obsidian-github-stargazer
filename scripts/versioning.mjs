export function synchronizeReleaseMetadata(packageJson, manifest, versions) {
	const releaseVersion = packageJson?.version;
	const minAppVersion = manifest?.minAppVersion;

	if (!releaseVersion) {
		throw new Error("package.json must define a release version");
	}

	if (!minAppVersion) {
		throw new Error("manifest.json must define minAppVersion");
	}

	return {
		manifest: {
			...manifest,
			version: releaseVersion,
		},
		versions: {
			...versions,
			[releaseVersion]: minAppVersion,
		},
	};
}

export function validateReleaseMetadata(packageJson, manifest, versions) {
	const releaseVersion = packageJson?.version;
	const manifestVersion = manifest?.version;
	const minAppVersion = manifest?.minAppVersion;
	const mappedMinAppVersion = versions?.[releaseVersion];
	const errors = [];

	if (!releaseVersion) {
		errors.push("package.json.version is required");
	}

	if (!manifestVersion) {
		errors.push("manifest.json.version is required");
	}

	if (!minAppVersion) {
		errors.push("manifest.json.minAppVersion is required");
	}

	if (releaseVersion && manifestVersion && releaseVersion !== manifestVersion) {
		errors.push(
			`package.json.version (${releaseVersion}) must match manifest.json.version (${manifestVersion})`,
		);
	}

	if (releaseVersion && mappedMinAppVersion === undefined) {
		errors.push(
			`versions.json must contain an entry for release version ${releaseVersion}`,
		);
	}

	if (
		releaseVersion &&
		minAppVersion &&
		mappedMinAppVersion !== undefined &&
		mappedMinAppVersion !== minAppVersion
	) {
		errors.push(
			`versions.json entry for ${releaseVersion} must match manifest.json.minAppVersion (${minAppVersion})`,
		);
	}

	return errors;
}
