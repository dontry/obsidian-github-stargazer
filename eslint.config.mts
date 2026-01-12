import { globalIgnores } from "eslint/config";
import obsidianmd from "eslint-plugin-obsidianmd";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				project: ["./tsconfig.json"],
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: [".json"],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		rules: {
			"obsidianmd/ui/sentence-case": "off",
			"obsidianmd/sample-names": "off",
		},
	},
	globalIgnores([
		"node_modules",
		"dist",
		"build",
		"coverage",
		"esbuild.config.mjs",
		"eslint.config.mjs",
		"vitest.config.ts",
		"version-bump.mjs",
		"versions.json",
		"main.js",
		"**/*.test.ts",
	]),
);
