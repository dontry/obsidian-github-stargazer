# Implementation Plan: Sync Progress Tracking & Resume

**Branch**: `003-sync-progress-resume` | **Date**: 2025-01-02 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-sync-progress-resume/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature implements checkpoint-based progress tracking and resume capability for GitHub starred repositories sync. The system will persist sync progress to a JSON checkpoint file after each successful page fetch, storing repository metadata and GraphQL cursors. When sync is interrupted (network failure, app crash, etc.), users can resume from the last checkpoint without re-downloading repositories. The implementation includes atomic file writes, exponential backoff retry logic, lenient checkpoint validation, and user-friendly progress indicators.

**Technical Approach**:
- Extend existing `SyncService` with checkpoint management (read/write atomic operations)
- Create new `CheckpointManager` service for JSON file I/O and validation
- Add `SyncProgress` UI component to display real-time progress (fetched/total count, percentage)
- Implement retry logic in `GitHubGraphQLClient` with exponential backoff (1s, 2s, 4s)
- Create confirmation modal for resume/fresh sync user choice
- Incremental conversion from checkpoint to final repository storage (no batch processing at end)

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode enabled
**Primary Dependencies**: Obsidian API (latest), vitest (testing), esbuild (bundling)
**Storage**: JSON checkpoint file in plugin data directory (`.obsidian/plugins/obsidian-github-stargazer/`)
**Testing**: Vitest for unit tests, existing test infrastructure with mocks for Obsidian APIs
**Target Platform**: Obsidian desktop and mobile (TypeScript plugin running in Electron/Mobile)
**Project Type**: Single project (Obsidian plugin with modular source structure)
**Performance Goals**:
  - Checkpoint file operations < 500ms (FR-010, SC-010)
  - Resume from checkpoint within 10 seconds (FR-001, SC-001)
  - Real-time progress updates with < 2 second delay (FR-012, SC-004)
  - Constant memory usage regardless of checkpoint size (SC-011)
**Constraints**:
  - Maximum data loss of one page if interrupted (FR-003, SC-003)
  - Atomic file writes to prevent corruption (FR-005)
  - JSON streaming for large checkpoint files (1000+ repos)
  - Minimum 10MB disk space check before sync (SC-012)
  - GitHub API rate limits still apply during resumed syncs
**Scale/Scope**:
  - Average user: < 1,000 starred repositories (checkpoint file size manageable)
  - Checkpoint size: ~100KB-1MB depending on repository count and README content
  - Sync operations: Typically 10-100 pages (assuming 100 repos per page via GraphQL)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all principles from `.specify/memory/constitution.md`:

### Pre-Design Assessment

- **I. Code Quality**: ✅ PASS - TypeScript 5.3+ with strict mode already enabled in project. ESLint configured. Will ensure no `any` types without justification.
- **II. Testing Standards (NON-NEGOTIABLE)**: ✅ PASS - Tests written BEFORE implementation (TDD approach). Existing test infrastructure (vitest, mocks) will be extended. Test coverage will be maintained.
- **III. User Experience Consistency**: ✅ PASS - New command IDs will follow stable naming convention. Settings will have clear descriptions. Error messages will use `Notice` for user feedback.
- **IV. Readability**: ✅ PASS - Functions will be kept < 50 lines, files < 300 lines. Descriptive variable names. Complex retry logic will include explanatory comments.
- **V. Modularity**: ✅ PASS - New `CheckpointManager` service in `src/sync/`. New `SyncProgress` UI component in `src/ui/`. Extension of existing `SyncService`. No circular dependencies.
- **VI. Security & Privacy (NON-NEGOTIABLE)**: ✅ PASS - No remote code execution. Network calls only to GitHub GraphQL API (already documented in README). No telemetry. Minimal file system access (only checkpoint file in plugin data directory). No sensitive data logged.

### Post-Design Re-Check (After Phase 1)

✅ **ALL CHECKS PASSED**

- [x] Checkpoint file location respects plugin data directory boundaries
  - **Design**: Checkpoint stored in `.obsidian/plugins/obsidian-github-stargazer/` (plugin data directory)
  - **Validation**: CheckpointManager only accesses checkpoint file, no vault traversal

- [x] No sensitive GitHub tokens logged (FR-024)
  - **Design**: Logging strategy in research.md explicitly excludes tokens, full payloads
  - **Validation**: Logger implementation excludes error.stack (may contain tokens)

- [x] Atomic file writes prevent data corruption
  - **Design**: Temp file + rename pattern (POSIX atomic rename)
  - **Validation**: CheckpointManager.saveCheckpoint() uses atomic write pattern

- [x] Checkpoint validation prevents code injection vulnerabilities
  - **Design**: Lenient JSON validation, type checks on all fields
  - **Validation**: CheckpointValidationError thrown on malformed data, no eval()

- [x] File access minimized (checkpoint read/write only)
  - **Design**: Only checkpoint file accessed, no other filesystem operations
  - **Validation**: No traversal outside plugin data directory, no executable code execution

**Status**: ✅ **ALL GATES PASSED** - Design is constitution-compliant, ready for implementation

## Project Structure

### Documentation (this feature)

```text
specs/003-sync-progress-resume/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── types.ts                        # Extended with checkpoint types
├── main.ts                         # Plugin registration (no changes expected)
├── settings.ts                     # Extended with checkpoint reset option
├── commands/
│   └── sync-command.ts             # Modified: add force sync flag handling
├── sync/
│   ├── sync-service.ts             # Modified: checkpoint integration, retry logic
│   ├── github-client.ts            # Modified: exponential backoff retry
│   ├── checkpoint-manager.ts       # NEW: checkpoint I/O and validation
│   ├── graphql-queries.ts          # Existing: no changes
│   └── rate-limiter.ts             # Existing: no changes
├── storage/
│   ├── repository-store.ts         # Existing: incremental conversion
│   ├── sync-state-store.ts         # Existing: no changes
│   └── settings-store.ts           # Existing: no changes
└── ui/
    ├── sync-progress.ts            # Modified: real-time progress display
    ├── checkpoint-modal.ts         # NEW: resume/fresh sync confirmation
    └── settings-tab.ts             # Modified: checkpoint management UI

tests/
├── unit/
│   ├── sync/
│   │   ├── checkpoint-manager.test.ts  # NEW
│   │   ├── sync-service.test.ts       # Extended: checkpoint tests
│   │   └── github-client.test.ts      # Extended: retry tests
│   ├── ui/
│   │   └── checkpoint-modal.test.ts   # NEW
│   └── storage/
│       └── repository-store.test.ts  # Extended: incremental conversion tests
├── integration/
│   └── sync-workflow.test.ts         # Extended: resume scenarios
└── mocks/
    └── obsidian.ts                   # Extended: if needed
```

**Structure Decision**: Single project structure (Option 1) - This is an Obsidian plugin extending the existing codebase. The modular structure separates concerns (sync, storage, UI, commands) and aligns with the constitution's modularity principle. No backend/frontend separation needed as this is a client-side plugin.

## Complexity Tracking

> **No constitution violations requiring justification**

All design decisions align with core principles. No shortcuts or anti-patterns needed. Standard TypeScript/Obsidian plugin patterns are sufficient for this feature.
