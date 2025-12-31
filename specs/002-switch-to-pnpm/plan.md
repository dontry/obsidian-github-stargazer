# Implementation Plan: Switch from npm to pnpm

**Branch**: `002-switch-to-pnpm` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-switch-to-pnpm/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Migrate the obsidian-github-stargazer Obsidian plugin from npm to pnpm as the package manager. This migration will:
- Replace `package-lock.json` with `pnpm-lock.yaml`
- Create `.npmrc` with pnpm-specific configuration
- Update all documentation to reference pnpm commands
- Maintain backward compatibility for all scripts and dependencies
- Improve installation speed and disk space efficiency

This is a **tooling migration**, not a feature implementation. No new code functionality is added.

## Technical Context

**Language/Version**: TypeScript 5.3+
**Primary Dependencies**: obsidian, esbuild, vitest, eslint
**Storage**: N/A (Obsidian plugin uses vault storage)
**Testing**: Vitest
**Target Platform**: Obsidian Desktop & Mobile (TypeScript → JavaScript)
**Project Type**: Single project (TypeScript plugin)
**Performance Goals**: Maintain current performance; improve install time/space
**Constraints**: Must maintain all existing npm scripts behavior
**Scale/Scope**: Small plugin project (~10-20 dependencies)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify compliance with all principles from `.specify/memory/constitution.md`:

- **I. Code Quality**: ✅ TypeScript strict mode already enabled. ESLint configuration unchanged.
- **II. Testing Standards (NON-NEGOTIABLE)**: ✅ All existing tests remain compatible. No test changes required.
- **III. User Experience Consistency**: ✅ No user-facing changes. Commands and settings unchanged.
- **IV. Readability**: ✅ No code changes required.
- **V. Modularity**: ✅ No structural code changes. Package manager change only affects tooling.
- **VI. Security & Privacy (NON-NEGOTIABLE)**: ✅ No new network access or data handling. Package manager change does not affect security posture.

**Status**: ✅ PASS - No constitution violations. This is a pure tooling migration.

## Project Structure

### Documentation (this feature)

```text
specs/002-switch-to-pnpm/
├── plan.md              # This file
├── research.md          # Phase 0: pnpm migration research
├── data-model.md        # N/A - No data model changes
├── quickstart.md        # Phase 1: Developer migration guide
├── contracts/           # N/A - No API contracts
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
# Root directory changes only (no new code directories)

Root level:
├── .npmrc              # NEW: pnpm configuration
├── pnpm-lock.yaml      # NEW: pnpm lockfile (replaces package-lock.json)
├── package.json        # MODIFIED: Update scripts, add engines field
├── package-lock.json   # REMOVED: Replaced by pnpm-lock.yaml
├── CLAUDE.md           # MODIFIED: Update commands section
└── README.md           # MODIFIED: Update installation instructions (if exists)

# No changes to source code structure
src/                    # Unchanged
tests/                  # Unchanged
```

**Structure Decision**: Single project with root-level configuration changes only. No new source directories. This is a pure tooling migration.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

No constitution violations. This section not applicable.

## Phase 0: Research & Analysis

**Status**: ✅ COMPLETE

Research outcomes documented in [research.md](./research.md):

**Key Decisions**:
1. **pnpm Version**: Use pnpm 9.x (latest stable) with compatibility for Node.js 18+
2. **.npmrc Configuration**:
   - `strict-peer-dependencies=false` (for compatibility with Obsidian ecosystem)
   - No `shamefully-hoist` initially (enable only if issues arise)
3. **package.json engines field**: Add `"pnpm": ">=9.0.0"` enforcement
4. **CI/CD**: No CI/CD pipelines detected, no changes needed
5. **Migration Approach**: Use `pnpm import` to generate lockfile from existing npm state

**Alternatives Considered**:
- **Yarn**: Rejected due to less efficient disk usage vs pnpm
- **Bun**: Rejected due to newer ecosystem, less tooling maturity
- **Keep npm**: Rejected per user request and pnpm benefits

## Phase 1: Design & Contracts

**Status**: ✅ COMPLETE

### Data Model
**Status**: N/A - No data model changes for tooling migration

### API Contracts
**Status**: N/A - No API changes for tooling migration

### Quickstart Guide
See [quickstart.md](./quickstart.md) for developer migration instructions.

**Summary**:
1. Install pnpm: `npm install -g pnpm`
2. Run migration: `pnpm import` → generates `pnpm-lock.yaml`
3. Remove npm lockfile: `rm package-lock.json`
4. Install dependencies: `pnpm install`
5. Test scripts: `pnpm test && pnpm build`
6. Update documentation: CLAUDE.md, README.md
7. Commit changes with `pnpm-lock.yaml` included

### Agent Context Update

**Status**: ⏭️ SKIPPED - No new technologies introduced

Rationale: pnpm is a package manager, not a runtime technology. No agent context updates required.

## Re-evaluation: Constitution Check (Post-Design)

**Status**: ✅ PASS - No changes from initial check

This migration:
- Does not modify any TypeScript code
- Does not affect testing infrastructure
- Does not change user-facing functionality
- Does not introduce security concerns
- Maintains all existing quality standards

**Ready for Phase 2**: Task generation via `/speckit.tasks`
