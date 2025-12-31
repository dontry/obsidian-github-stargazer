# Implementation Plan: GitHub Starred Repositories Manager

**Branch**: `001-github-starred-repos` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-github-starred-repos/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an Obsidian plugin that syncs GitHub starred repositories locally, enabling users to browse, search, tag, annotate, and manage their starred repos. Users provide a GitHub personal access token to authenticate with GitHub GraphQL API, fetch repository metadata and READMEs, and store data locally in Obsidian vault. The plugin provides a rich UI for repository management with note-taking and external resource linking (e.g., Google Code Wiki pages). Technical approach uses TypeScript with strict typing, Obsidian Plugin API, and GitHub GraphQL API for efficient data fetching.

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode enabled
**Primary Dependencies**:
- Obsidian Plugin API (latest)
- Obsidian TypeScript definitions
- esbuild (bundler)
- GitHub GraphQL API (via fetch)
- ESLint with TypeScript plugin
- Vitest (testing framework, see research.md)

**Storage**:
- Local JSON files in Obsidian vault (`.obsidian/plugins/github-stargazer/`)
- Markdown notes in user's vault for repository annotations
- Plugin data via Obsidian's `loadData()`/`saveData()` API

**Testing**:
- Vitest for unit and integration tests
- Contract tests for GitHub GraphQL API responses

**Target Platform**: Obsidian Desktop (Mac/Windows/Linux) and Obsidian Mobile (iOS/Android)

**Project Type**: Single project (Obsidian plugin)

**Performance Goals**:
- Initial sync of 100 repos in under 30 seconds
- Search/filter response under 100ms
- UI rendering under 200ms for 500+ repositories
- Incremental sync under 5 seconds for 10 updated repos

**Constraints**:
- Must work offline after initial sync (local data storage)
- GitHub GraphQL API rate limit: 5,000 points/hour (authenticated)
- Memory usage under 100MB for typical usage (500 repos)
- Mobile-compatible UI (responsive design)
- MUST NOT use Node.js-only APIs (must work in mobile Chromium environment)

**Scale/Scope**:
- Target users: Individual developers with 100-1000 starred repos
- Data volume: ~1-5KB per repo (metadata + notes)
- Network: Initial sync may fetch 100-1000 repos; incremental sync typically 10-20
- User growth: Single-user plugin (no backend or multi-user concerns)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all principles from `.specify/memory/constitution.md`:

**I. Code Quality**: ✅ PASS
- TypeScript strict mode enabled (`"strict": true`)
- ESLint configured and passing before commits
- No `any` types without explicit justification
- Async/await pattern enforced
- Error handling with try-catch blocks
- Constants for magic numbers/strings

**II. Testing Standards (NON-NEGOTIABLE)**: ✅ PASS
- TDD workflow: tests written before implementation
- Test structure mirrors `src/` in `tests/` directory
- Unit tests for all utility functions and services
- Integration tests for multi-step workflows (sync, browse, tag operations)
- Bug fixes include regression tests
- Test coverage monitored and maintained
- All tests pass before commits

**III. User Experience Consistency**: ✅ PASS
- Stable command IDs (e.g., `github-stargazer-sync`, `github-stargazer-open`)
- Sentence case command names (e.g., "Sync starred repositories", "Open repository")
- Sensible defaults for all settings (e.g., auto-sync disabled by default)
- Clear setting descriptions
- Consistent terminology (repository/repo, tag, note, resource)
- User-friendly error messages via `Notice`
- Obsidian-native UI components
- Arrow notation in docs (e.g., **Settings → Community plugins → GitHub Stargazer**)

**IV. Readability**: ✅ PASS
- Functions named with verbs (e.g., `fetchStarredRepositories`, `syncRepositoryData`)
- Descriptive variable names (e.g., `repositoryList`, `syncStatus`)
- Functions limited to 50 lines; split longer functions
- Files limited to 300 lines; split larger files
- Comments explain WHY, not WHAT
- No code duplication comments

**V. Modularity**: ✅ PASS
- `main.ts` minimal: only plugin lifecycle (onload, onunload, command registration)
- Feature logic delegated to modules: `src/sync/`, `src/ui/`, `src/storage/`, `src/types/`
- Each module has single responsibility
- Modules access internal state only via exposed interfaces
- Shared utilities in `src/utils/`
- Types centralized in `src/types.ts`
- No circular dependencies

**VI. Security & Privacy (NON-NEGOTIABLE)**: ✅ PASS
- No remote code execution
- No telemetry or analytics without opt-in
- Plugin operates offline after initial sync; network only for GitHub API
- File access limited to plugin data directory and user-created notes
- No access to files outside vault
- GitHub token stored securely via Obsidian's encrypted data API
- Network requests documented in README (GitHub GraphQL API only)
- User controls sync frequency (manual trigger by default)
- README will document data sent to GitHub: authentication token, GraphQL queries for starred repos

## Project Structure

### Documentation (this feature)

```text
specs/001-github-starred-repos/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── github-graphql.graphql  # GitHub GraphQL queries and mutations
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── main.ts                    # Plugin entry point (onload, onunload, commands)
├── types.ts                   # TypeScript interfaces and types
├── sync/                      # Repository synchronization logic
│   ├── github-client.ts       # GitHub GraphQL API client
│   ├── sync-service.ts        # Orchestrate sync operations
│   └── rate-limiter.ts        # Handle GitHub API rate limits
├── storage/                   # Data persistence layer
│   ├── repository-store.ts    # Read/write repo data to disk
│   ├── note-store.ts          # Manage repository notes
│   ├── tag-store.ts           # Manage tags
│   └── settings-store.ts      # Plugin settings (token, preferences)
├── ui/                        # User interface components
│   ├── repository-view.ts     # Main repository list view
│   ├── repository-detail.ts   # Single repository detail view
│   ├── notes-panel.ts         # Note editor panel
│   ├── tag-manager.ts         # Tag creation and management UI
│   └── settings-tab.ts        # Plugin settings interface
├── commands/                  # Obsidian command handlers
│   ├── sync-command.ts        # Sync command handler
│   ├── open-view-command.ts   # Open repository view command
│   └── batch-unstar-command.ts # Batch un-star command handler
├── utils/                     # Shared utilities
│   ├── date-utils.ts          # Date formatting and comparison
│   ├── url-validator.ts       # URL validation for external resources
│   ├── search-filter.ts       # Search and filter logic
│   └── constants.ts           # Magic numbers and strings
└── models/                    # Data models
    ├── repository.ts          # Repository entity
    ├── tag.ts                 # Tag entity
    ├── note.ts                # Note entity
    └── linked-resource.ts     # External resource entity

tests/
├── unit/                      # Unit tests
│   ├── sync/
│   │   ├── github-client.test.ts
│   │   ├── sync-service.test.ts
│   │   └── rate-limiter.test.ts
│   ├── storage/
│   │   ├── repository-store.test.ts
│   │   ├── note-store.test.ts
│   │   └── tag-store.test.ts
│   ├── utils/
│   │   ├── date-utils.test.ts
│   │   ├── url-validator.test.ts
│   │   └── search-filter.test.ts
│   └── models/
│       ├── repository.test.ts
│       ├── tag.test.ts
│       └── note.test.ts
├── integration/               # Integration tests
│   ├── sync-workflow.test.ts  # Full sync workflow test
│   ├── browse-filter.test.ts  # Browse and filter test
│   └── notes-tags.test.ts     # Notes and tags integration test
└── contract/                  # Contract tests
    └── github-api.test.ts     # Verify GitHub GraphQL contract

manifest.json                  # Obsidian plugin manifest
package.json                   # npm dependencies
tsconfig.json                  # TypeScript config (strict mode)
esbuild.config.mjs             # Build configuration
eslint.config.mts              # ESLint configuration
vitest.config.ts               # Vitest test configuration
```

**Structure Decision**: Single project (Obsidian plugin) with modular architecture. Source code organized by feature area (sync, storage, ui, commands, utils, models) to maintain modularity per Principle V. Testing structure mirrors source with unit, integration, and contract test separation.

## Complexity Tracking

> **No constitution violations requiring justification**

All design decisions align with constitution principles:
- TypeScript strict mode (Principle I: Code Quality)
- TDD with comprehensive test coverage (Principle II: Testing Standards)
- Stable command IDs and Obsidian-native UI (Principle III: UX Consistency)
- Functions < 50 lines, files < 300 lines (Principle IV: Readability)
- Modular architecture with clear boundaries (Principle V: Modularity)
- Local-first with documented network calls (Principle VI: Security & Privacy)
