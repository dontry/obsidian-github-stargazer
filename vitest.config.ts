import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Get the TypeScript configuration
const tsconfig = JSON.parse(readFileSync('./tsconfig.json', 'utf-8'));
const baseUrl = tsconfig?.compilerOptions?.baseUrl ?? 'src';
const normalizedBaseUrl = baseUrl.startsWith('.') ? baseUrl : `./${baseUrl}`;
const aliasSrcPath = fileURLToPath(new URL(normalizedBaseUrl, import.meta.url));
const obsidianMockPath = fileURLToPath(
	new URL('./tests/mocks/obsidian.ts', import.meta.url),
);

console.log({
 aliasSrcPath,
 obsidianMockPath,
})

export default defineConfig({
	resolve: {
		alias: {
			'@': aliasSrcPath,
			obsidian: obsidianMockPath,
		},
	},
	test: {
		environment: 'node',
		dir: './',
		include: ['tests/**/*.test.ts'],
		exclude: ['node_modules/**'],
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
	},
});
