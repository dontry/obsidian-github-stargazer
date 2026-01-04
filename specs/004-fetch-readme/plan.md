# Implementation Plan: Parallel README Fetching During Sync

**Branch**: `004-fetch-readme` | **Date**: 2025-01-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-fetch-readme/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Fetch README files from GitHub starred repositories in parallel with repository metadata, using SHA-based change detection to minimize unnecessary downloads. README content is stored as individual markdown files in the vault root (`{owner}-{repo}-README.md`), making them immediately accessible and editable within Obsidian. The system processes up to 5 concurrent requests to balance performance with GitHub API rate limit safety.

**Key Technical Approach**:
- Parallel fetching with 5 concurrent GitHub REST API calls to `api.github.com/repos/{owner}/{repo}/readme`
- SHA-based change detection (comparing stored README SHA vs current GitHub API SHA)
- Vault file storage with local modification tracking
- User prompt for conflict resolution when both local and remote READMEs change

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode (already configured in tsconfig.json)
**Primary Dependencies**:
  - Obsidian API (latest)
  - Existing GitHub GraphQL client (`src/sync/github-client.ts`)
  - Vitest for testing (already configured)

**Storage**:
  - README content: Individual markdown files in vault root (`{owner}-{repo}-README.md`)
  - README metadata: Extended in `Repository` interface (README SHA, vault file path, local modification state)
  - Checkpoint: Extended `SyncCheckpoint` to include README metadata (SHA, file path, fetch status)

**Testing**: Vitest (already configured)
  - Unit tests for README fetch service, SHA comparison, file operations
  - Integration tests for parallel fetching with mocked GitHub API
  - File system tests for vault file creation and conflict detection

**Target Platform**: Obsidian desktop and mobile (plugin runs in Obsidian Electron app)
**Project Type**: Obsidian plugin (TypeScript single project)
**Performance Goals**:
  - 50% faster sync than sequential README fetching for 100+ repos
  - 100% skip rate for unchanged READMEs
  - <30% additional sync time vs metadata-only sync
  - 5 concurrent README fetches

**Constraints**:
  - GitHub API rate limits (5,000 requests/hour authenticated)
  - Vault file system access (Obsidian adapter API)
  - Memory: constant regardless of repo count (streaming)
  - README size limit: 5MB maximum

**Scale/Scope**:
  - Typical users: <1,000 starred repositories
  - README files: ~100KB average size
  - Vault storage: ~100MB for 1,000 repos (README content only)
  - Parallel requests: 5 concurrent

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Pre-Implementation Assessment**:

- **✅ I. Code Quality**: TypeScript strict mode is enabled (`"strict": true` in tsconfig.json). ESLint is configured (`npm run lint`). No `any` types without justification.

- **⚠️ II. Testing Standards (NON-NEGOTIABLE)**: Vitest is configured. Tests MUST be written BEFORE implementation (TDD). Test coverage MUST NOT decrease. All tests MUST pass before commits.

- **✅ III. User Experience Consistency**: Command IDs will be stable. Settings documented (if any new settings added). Error messages use `Notice` for user feedback. Arrow notation used for navigation.

- **✅ IV. Readability**: Functions must be <50 lines, files <300 lines. Descriptive names required. Existing codebase follows this pattern.

- **✅ V. Modularity**: `main.ts` minimal. Code organized into modules (src/sync/, src/ui/, src/utils/, src/storage/, src/commands/). No circular dependencies. README fetching will be in new `src/sync/readme-fetcher.ts`.

- **✅ VI. Security & Privacy (NON-NEGOTIABLE)**:
  - No remote code execution
  - No telemetry/analytics
  - Network calls only to GitHub API (documented in README)
  - File access limited to vault root (README files)
  - GitHub token stored using Obsidian's data API
  - README content from public repos stored locally (user's vault)

**Action Items Before Implementation**:
1. ⚠️ Ensure TDD workflow: Write tests BEFORE code
2. Document GitHub API network calls in README.md
3. Verify no circular dependencies introduced by README fetcher module

## Project Structure

### Documentation (this feature)

```text
specs/004-fetch-readme/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── github-readme-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── sync/
│   ├── github-client.ts          # Existing: GraphQL client, extend with REST API
│   ├── sync-service.ts           # Existing: orchestrates sync, integrate README fetching
│   ├── sync-page-fetcher.ts      # Existing: fetches repo pages
│   ├── checkpoint-manager.ts     # Existing: manages checkpoint file
│   ├── rate-limiter.ts           # Existing: rate limit handling
│   ├── readme-fetcher.ts         # NEW: parallel README fetching with SHA detection
│   └── readme-conflict-detector.ts # NEW: detects local vs remote changes
├── storage/
│   ├── repository-store.ts       # Extend: README file path tracking
│   └── vault-file-manager.ts     # NEW: README vault file operations
├── ui/
│   └── conflict-resolution-modal.ts # NEW: user prompt for local/remote conflicts
├── types.ts                      # Extend: Repository, SyncCheckpoint interfaces
└── main.ts                       # Existing: minimal lifecycle

tests/
├── unit/
│   ├── sync/
│   │   ├── readme-fetcher.test.ts      # NEW: README fetching logic
│   │   └── readme-conflict-detector.test.ts # NEW: conflict detection
│   └── storage/
│       └── vault-file-manager.test.ts  # NEW: file operations
└── integration/
    └── sync/
        └── parallel-readme-sync.test.ts # NEW: end-to-end README sync
```

**Structure Decision**: Single Obsidian plugin project with modular structure. README fetching integrated into existing sync infrastructure under `src/sync/`. New `readme-fetcher.ts` module handles parallel fetching, SHA comparison, and concurrency management. Vault file operations in `src/storage/vault-file-manager.ts`. UI conflict resolution modal in `src/ui/`.

## Complexity Tracking

> **No Constitution violations requiring justification**

All design decisions align with existing project structure and constitution principles. Parallel fetching and SHA-based change detection are standard patterns for API clients. Vault file storage follows Obsidian plugin conventions.

---

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **GitHub REST API for README endpoint**
   - Task: Research `api.github.com/repos/{owner}/{repo}/readme` endpoint
   - Decision needed: Base64 encoding handling, SHA field location, error responses
   - Deliverable: Document API contract in `contracts/github-readme-api.md`

2. **Obsidian file system adapter API**
   - Task: Research Obsidian's `vault.adapter` API for file operations
   - Decision needed: File creation, modification detection, conflict resolution patterns
   - Deliverable: Document vault file operations in `research.md`

3. **Parallel request patterns in TypeScript/Node.js**
   - Task: Research best practices for concurrency with rate limits
   - Decision needed: Promise pool implementation, backoff strategies
   - Deliverable: Document concurrency pattern in `research.md`

4. **Diff view implementation for conflict resolution**
   - Task: Research Obsidian UI patterns for modal dialogs and diff display
   - Decision needed: Use native diff library or custom implementation
   - Deliverable: Document UI approach in `research.md`

### Unknowns to Resolve

- **NEEDS CLARIFICATION**: Does Obsidian API provide built-in diff view, or implement custom?
- **NEEDS CLARIFICATION**: How to handle README symlinks or git submodules?
- **NEEDS CLARIFICATION**: Should we use Obsidian's TFile API or vault.adapter for file operations?

**Phase 0 Output**: `research.md` with all decisions documented and unknowns resolved.

---

## Phase 1: Design & Contracts

### Data Model

**Entity Extensions** (to be detailed in `data-model.md`):

1. **Repository** interface extension:
   - Add `readmeSha: string | null` (SHA from GitHub README API)
   - Add `readmeVaultFilePath: string | null` (path in vault root)
   - Add `localReadmeModified: boolean` (track user edits)

2. **SyncCheckpoint** interface extension:
   - Add `readmeMetadata: Map<string, ReadmeMetadata>` (repo ID → README info)

3. **ReadmeMetadata** (new interface):
   - `sha: string` (GitHub README SHA)
   - `vaultFilePath: string` (absolute or relative path)
   - `fetchStatus: 'success' | 'failed' | 'not_available'`
   - `lastFetchedAt: string` (ISO8601 timestamp)
   - `localModified: boolean` (user edited flag)

### API Contracts

**GitHub README REST API** (`contracts/github-readme-api.md`):

```typescript
interface GitHubReadmeResponse {
  name: string;           // e.g., "README.md"
  path: string;           // e.g., "README.md"
  sha: string;            // Blob SHA for change detection
  size: number;           // File size in bytes
  encoding: string;       // Typically "base64"
  content: string;        // Base64-encoded README content
  html_url: string;       // URL to view on GitHub
}
```

**Vault File Manager API** (internal contract):

```typescript
interface VaultFileManager {
  createReadmeFile(owner: string, repo: string, content: string): Promise<string>;
  updateReadmeFile(filePath: string, content: string): Promise<void>;
  detectLocalModification(filePath: string, expectedSha: string): Promise<boolean>;
  checkFileCollision(filePath: string): Promise<boolean>;
  readFileContent(filePath: string): Promise<string>;
}
```

### Quickstart Guide

**Development Setup** (to be detailed in `quickstart.md`):

1. Clone repository and checkout `004-fetch-readme` branch
2. Run `pnpm install` to install dependencies
3. Run `pnpm run dev` for development watch mode
4. Run `pnpm test` to execute tests
5. Enable plugin in Obsidian settings for manual testing

**Test Command**:
```bash
pnpm test tests/unit/sync/readme-fetcher.test.ts
```

**Build Command**:
```bash
pnpm run build
# Output: main.js, manifest.json, styles.css
```

---

## Constitution Check (Post-Design)

*Re-verification after Phase 1 design*

- **✅ I. Code Quality**: New modules follow strict typing. No `any` types.
- **⚠️ II. Testing Standards**: Tests MUST be written for `readme-fetcher.ts`, `vault-file-manager.ts`, `conflict-detector.ts` BEFORE implementation.
- **✅ III. User Experience**: Conflict resolution modal uses Obsidian UI patterns. Error messages use `Notice`.
- **✅ IV. Readability**: `readme-fetcher.ts` will be <300 lines. Functions <50 lines.
- **✅ V. Modularity**: New modules integrate cleanly. No circular dependencies (verified via import analysis).
- **✅ VI. Security & Privacy**:
  - README files stored in user's vault (no external transmission)
  - GitHub API calls documented in README.md
  - No telemetry
  - File access limited to vault root only

**Ready for Phase 2**: Yes, proceed to `/speckit.tasks` to generate task breakdown.
