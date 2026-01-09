# obsidian-github-stargazer Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-31

## Active Technologies
- TypeScript 5.3+ with strict mode enabled + Obsidian API (latest), vitest (testing), esbuild (bundling) (003-sync-progress-resume)
- JSON checkpoint file in plugin data directory (`.obsidian/plugins/obsidian-github-stargazer/`) (003-sync-progress-resume)
- TypeScript 5.3+ with strict mode enabled (existing) + Obsidian API (latest), existing sync infrastructure (006-repo-metadata-frontmatter)
- Obsidian vault filesystem (markdown files) (006-repo-metadata-frontmatter)

- TypeScript 5.3+ with strict mode enabled (001-github-starred-repos)

## Project Structure

```text
src/
tests/
```

## Commands

pnpm test && pnpm run lint

## Code Style

TypeScript 5.3+ with strict mode enabled: Follow standard conventions

## Recent Changes
- 006-repo-metadata-frontmatter: Added TypeScript 5.3+ with strict mode enabled (existing) + Obsidian API (latest), existing sync infrastructure
- 003-sync-progress-resume: Added TypeScript 5.3+ with strict mode enabled + Obsidian API (latest), vitest (testing), esbuild (bundling)

- 001-github-starred-repos: Added TypeScript 5.3+ with strict mode enabled

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
