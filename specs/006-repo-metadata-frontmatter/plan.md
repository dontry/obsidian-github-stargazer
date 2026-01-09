# Implementation Plan: Repository Metadata as Frontmatter

**Branch**: `006-repo-metadata-frontmatter` | **Date**: 2025-01-05 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-repo-metadata-frontmatter/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds repository metadata files with YAML frontmatter alongside existing README files. Each synced GitHub repository will have two files in an `owner/repository-name/` directory structure:
- `owner-repository-metadata.md` - Contains YAML frontmatter with GitHub repository metadata (name, description, stars, language, topics, URL, etc.)
- `owner-repository-readme.md` - Contains the raw README markdown content (existing feature, path structure changed)

The metadata files enable users to query repositories using Obsidian Dataview plugin and organize their starred repositories programmatically. Unique file naming prevents confusion in Obsidian's search, autocomplete, graph view, and backlinks.

**Key Changes**:
1. Create separate metadata files with YAML frontmatter
2. Change README storage path to `owner/repository-name/owner-repository-readme.md`
3. Implement file cleanup on unstar with user confirmation
4. Preserve user manual edits during metadata updates
5. Handle edge cases (special characters, long names, renamed repos)

## Technical Context

**Language/Version**: TypeScript 5.3+ with strict mode enabled (existing)
**Primary Dependencies**: Obsidian API (latest), existing sync infrastructure
**Storage**: Obsidian vault filesystem (markdown files)
**Testing**: Vitest (existing), need to add new tests
**Target Platform**: Obsidian desktop + mobile (existing plugin)
**Project Type**: Obsidian plugin (single project)
**Performance Goals**: 500 repositories synced in under 2 minutes
**Constraints**:
- Must preserve backward compatibility with existing data
- Must handle GitHub API rate limits gracefully
- Must support offline operation (metadata files readable without network)
- Must sanitize filesystem paths for cross-platform compatibility
**Scale/Scope**:
- Users may have hundreds to thousands of starred repositories
- Each repository has 15+ metadata fields in frontmatter
- Files organized by owner/repository-name directory structure

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all principles from `.specify/memory/constitution.md`:

### Pre-Implementation Assessment

- **I. Code Quality**: ✅ PASS
  - TypeScript strict mode already enabled in existing project
  - ESLint configured and passing for existing code
  - No `any` types without explicit justification (existing pattern)
  - Will follow async/await pattern (existing standard)
  - Error handling with explicit try-catch blocks (existing pattern)

- **II. Testing Standards (NON-NEGOTIABLE)**: ✅ PASS (with implementation plan)
  - Tests MUST be written BEFORE implementation code (TDD)
  - Test files will mirror `src/` structure in `tests/` directory (existing pattern)
  - Unit tests REQUIRED for new utility functions:
    - File path sanitization utilities
    - YAML frontmatter generation
    - File name generation (owner-repo format)
  - Integration tests REQUIRED for:
    - End-to-end metadata file creation
    - Metadata update flow preserving user edits
    - Unstar detection and deletion prompt flow
  - Test coverage MUST NOT decrease (current baseline to be measured)
  - ALL tests MUST pass before commits (existing pre-commit check)

- **III. User Experience Consistency**: ✅ PASS
  - No new commands added (this is a backend sync feature)
  - Existing command IDs remain stable
  - No new settings (this is internal file organization)
  - User-facing strings consistent with existing plugin
  - Error messages use Obsidian Notice API (existing pattern)

- **IV. Readability**: ✅ PASS (with implementation guidelines)
  - Functions MUST be < 50 lines (will split frontmatter generation if needed)
  - Files MUST be < 300 lines (will split if needed)
  - Variable names descriptive (e.g., `generateMetadataFilePath`, not `path`)
  - Single-letter variables only for loop iterators
  - Complex logic includes WHY comments

- **V. Modularity**: ✅ PASS (with planned structure)
  - `main.ts` minimal (existing pattern, no changes)
  - Feature logic delegated to separate modules:
    - New: `src/sync/metadata-generator.ts` (YAML frontmatter generation)
    - New: `src/utils/path-utils.ts` (file path sanitization and generation)
    - New: `src/utils/file-manager.ts` (metadata file operations)
    - Modify: Existing `src/sync/readme-fetcher.ts` (change path structure)
    - Modify: Existing `src/sync/sync-service.ts` (integrate metadata creation)
  - Types centralized in `src/types.ts` (add new interfaces)
  - No circular dependencies (will audit imports)

- **VI. Security & Privacy (NON-NEGOTIABLE)**: ✅ PASS
  - No remote code execution
  - No telemetry or analytics (existing standard maintained)
  - Network calls only to GitHub API for repository data (existing pattern)
  - File system access limited to vault directories (Obsidian API sandbox)
  - No files accessed outside vault (Obsidian TFile API)
  - Network requests documented in existing README.md (GitHub API GraphQL)
  - No external services (GitHub API only, existing pattern)
  - User data (GitHub token) stored securely via Obsidian data API (existing)
  - No user data transmitted except to GitHub API for repository metadata (existing)

### Post-Design Re-Check (Phase 1)

Will re-verify after design phase:
- [ ] Test plan comprehensive for all edge cases
- [ ] File path sanitization handles all OS-specific restrictions
- [ ] YAML escaping prevents injection attacks
- [ ] No circular dependencies in new modules
- [ ] All functions under 50 lines threshold
- [ ] All files under 300 lines threshold

## Project Structure

### Documentation (this feature)

```text
specs/006-repo-metadata-frontmatter/
├── plan.md              # This file
├── research.md          # Phase 0 output (TBD)
├── data-model.md        # Phase 1 output (TBD)
├── quickstart.md        # Phase 1 output (TBD)
├── contracts/           # Phase 1 output (TBD - may not be needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── commands/            # (existing, no changes)
├── config/              # (existing, no changes)
├── models/              # (existing, no changes)
├── settings.ts          # (existing, no changes)
├── storage/             # (existing, minimal changes)
├── sync/                # MODIFIED and NEW files
│   ├── checkpoint-manager.ts         # (existing, may need updates for metadata tracking)
│   ├── github-client.ts              # (existing, no changes)
│   ├── metadata-generator.ts         # NEW - YAML frontmatter generation
│   ├── readme-fetcher.ts             # MODIFIED - change path structure
│   ├── sync-service.ts               # MODIFIED - integrate metadata creation
│   └── [other existing files]        # (no changes)
├── types.ts             # MODIFIED - add new interfaces
├── ui/                  # (existing, no changes)
└── utils/               # NEW files
    ├── path-utils.ts    # NEW - file path sanitization and generation
    ├── file-manager.ts  # NEW - metadata file operations
    └── [existing files] # (no changes)

tests/
├── unit/
│   ├── utils/
│   │   ├── path-utils.test.ts        # NEW
│   │   └── file-manager.test.ts      # NEW
│   └── sync/
│       └── metadata-generator.test.ts # NEW
└── integration/
    └── metadata-sync.test.ts         # NEW - end-to-end flow
```

**Structure Decision**: Single Obsidian plugin project with modular sync service. Existing `src/` structure preserved. New modules follow existing patterns (utils for utilities, sync for sync logic). Tests mirror source structure.

## Complexity Tracking

> **No Constitution violations requiring justification**

This feature enhances existing sync functionality without violating any constitutional principles. The implementation follows established patterns and maintains the project's modular architecture. All new code will be tested before implementation (TDD), and no security/privacy violations exist.

## Phase 0: Research & Technical Decisions

### Research Tasks

1. **YAML Frontmatter Best Practices in Obsidian**
   - **Decision**: Use Obsidian's built-in YAML frontmatter parser
   - **Rationale**: Native support, no additional dependencies, proven reliability
   - **Alternatives Considered**: js-yaml (heavier, unnecessary), custom parsing (error-prone)
   - **Output**: Document frontmatter format and escaping rules in `research.md`

2. **File Path Sanitization for Cross-Platform Compatibility**
   - **Decision**: Implement custom sanitization replacing: `/\\:*?"<>|` with `-`, handle spaces, truncate long paths
   - **Rationale**: Obsidian runs on Windows, macOS, Linux; each has different restrictions
   - **Alternatives Considered**: slugify library (unnecessary dependency), OS-specific checks (complex)
   - **Output**: Document sanitization rules and edge cases in `research.md`

3. **GitHub API Metadata Fields**
   - **Decision**: Use existing GitHub GraphQL API query from `graphql-queries.ts`, extract additional fields
   - **Rationale**: GraphQL already efficient, existing infrastructure, single API call per repo
   - **Alternatives Considered**: REST API (multiple calls, less efficient), add new GraphQL query (unnecessary)
   - **Output**: Document all required fields from FR-002 and their GraphQL mappings

4. **User Edit Preservation Strategy**
   - **Decision**: Detect frontmatter boundaries (between `---` markers), preserve content below, replace frontmatter only
   - **Rationale**: User may add notes below frontmatter; this preserves them while updating metadata
   - **Alternatives Considered**: Full file replacement (loses user edits), append mode (duplicates metadata)
   - **Output**: Document update strategy and edge cases in `research.md`

5. **Unstar Detection and Cleanup Flow**
   - **Decision**: Compare current starred list with local state, show Obsidian modal confirmation, delete if confirmed
   - **Rationale**: Obsidian Notice API for modals is user-friendly, prevents accidental data loss
   - **Alternatives Considered**: Silent deletion (unsafe), auto-delete with undo (complex UX)
   - **Output**: Document user interaction flow and edge cases in `research.md`

### Research Output

All findings will be consolidated in `research.md` with:
- Decision made for each unknown
- Rationale for the choice
- Alternatives considered and rejected
- Code examples where applicable
- References to Obsidian API documentation

## Phase 1: Design

### Data Model

**Entities** (to be detailed in `data-model.md`):

1. **RepositoryMetadataFile** (new interface in `types.ts`)
   - File path: `owner/repo/owner-repo-metadata.md`
   - Frontmatter fields (from FR-002):
     - `name`: string
     - `fullName`: string (e.g., "facebook/react")
     - `description`: string | null
     - `starCount`: number
     - `language`: string | null
     - `primaryLanguage`: string | null
     - `topics`: string[]
     - `url`: string
     - `ownerLogin`: string
     - `createdAt`: string (ISO8601)
     - `updatedAt`: string (ISO8601)
     - `homepageUrl`: string | null
     - `license`: string | null
     - `forkCount`: number
     - `openIssuesCount`: number
     - `watchersCount`: number
   - Content body: User notes (preserved during updates)

2. **FileOperationResult** (new interface)
   - `success`: boolean
   - `filePath`: string
   - `error`: Error | null
   - `action`: 'created' | 'updated' | 'deleted' | 'skipped'

3. **Extended Repository Interface** (modify existing)
   - Add: `metadataFilePath?: string`
   - Add: `metadataSha?: string` (for change detection)

### Contracts

**Internal API Contracts** (to be documented in `contracts/`):

1. `MetadataGenerator.generateFrontmatter(repository: Repository): string`
   - **Input**: Repository object from GitHub API
   - **Output**: YAML frontmatter block as string
   - **Error Handling**: Throws on invalid repository data

2. `PathUtils.generateMetadataFilePath(owner: string, repo: string): string`
   - **Input**: Owner login, repository name
   - **Output**: Relative path `owner/repo/owner-repo-metadata.md` (sanitized)
   - **Error Handling**: Returns safe path, never throws

3. `PathUtils.generateReadmeFilePath(owner: string, repo: string): string`
   - **Input**: Owner login, repository name
   - **Output**: Relative path `owner/repo/owner-repo-readme.md` (sanitized)
   - **Error Handling**: Returns safe path, never throws

4. `FileManager.createOrUpdateMetadataFile(filePath: string, frontmatter: string): Promise<FileOperationResult>`
   - **Input**: File path, YAML frontmatter content
   - **Output**: Operation result with action taken
   - **Error Handling**: Catches file system errors, returns in result object

5. `FileManager.deleteRepositoryFiles(owner: string, repo: string): Promise<FileOperationResult[]>`
   - **Input**: Owner login, repository name
   - **Output**: Array of operation results (metadata + readme)
   - **Error Handling**: Continues on error, returns all results

### Quickstart Guide

**For Developers** (to be documented in `quickstart.md`):

1. **Prerequisites**
   - Node.js 18+
   - pnpm 9+
   - Obsidian desktop (for testing)

2. **Setup**
   ```bash
   git clone <repo>
   cd obsidian-github-stargazer
   pnpm install
   ```

3. **Development**
   ```bash
   pnpm dev          # Watch mode with hot reload
   pnpm test         # Run tests
   pnpm lint         # ESLint check
   ```

4. **Testing the Feature**
   - Open test vault in Obsidian
   - Configure GitHub token in plugin settings
   - Run "Sync Starred Repositories" command
   - Verify metadata files created in `owner/repo/` directories
   - Check YAML frontmatter is valid and queryable via Dataview

5. **Key Files to Review**
   - `src/sync/metadata-generator.ts` - Frontmatter generation
   - `src/utils/path-utils.ts` - Path sanitization
   - `src/utils/file-manager.ts` - File operations
   - `src/sync/sync-service.ts` - Orchestration

## Next Steps

1. **Phase 0**: Execute research tasks and document in `research.md`
2. **Phase 1**: Create detailed data model, contracts, and quickstart guide
3. **Agent Context Update**: Run `.specify/scripts/bash/update-agent-context.sh claude`
4. **Phase 2**: Generate task breakdown via `/speckit.tasks` command
