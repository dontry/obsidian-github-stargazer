import { defineConfig } from 'vitest/config';
import { readFileSync } from 'fs';

// Get the TypeScript configuration
const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));

export default defineConfig({
	testEnvironment: 'node',
	resolve: {
		alias: {
			'@': tsconfig.compilerOptions.baseUrl,
		},
	},
 roots: ['./src', './tests'],
	testMatch: ['**/*.test.ts'],
	coverage: {
		provider: 'v8',
		reporter: ['text', 'json', 'html', 'lcov'],
		include: ['src/**/*.ts'],
		exclude: [
			'src/main.ts',
			'**/*.test.ts',
			'**/*.d.ts',
			'node_modules/',
		],
		thresholds: {
			lines: 80,
			functions: 80,
			branches: 80,
			statements: 80,
		},
	},
});
