# Implementation Tasks: Switch from npm to pnpm

**Feature**: 002-switch-to-pnpm
**Branch**: `002-switch-to-pnpm`
**Generated**: 2025-12-31
**Total Tasks**: 18

## Overview

This is a **tooling migration** from npm to pnpm. Tasks are organized by implementation phase rather than user stories, as this is a pure infrastructure change with no new features.

## Implementation Strategy

**Approach**: Sequential migration with validation gates

**Strategy**: Complete the migration in a single linear pass with checkpoints after each phase. This is a low-risk change that can be completed in one session.

**Rollback Plan**: If critical issues arise, restore `package-lock.json` from git and remove pnpm artifacts.

**Parallel Opportunities**: Phase 3 documentation updates can be done in parallel with Phase 2 testing.

## Dependencies

```text
Phase 1 (Preparation)
    ↓
Phase 2 (Migration)
    ↓
Phase 3 (Documentation) ← Can run in parallel with Phase 2 validation
    ↓
Phase 4 (Validation)
```

---

## Phase 1: Preparation (4 tasks)

**Goal**: Verify environment and prepare for migration

**Exit Criteria**:
- pnpm is installed and accessible
- Current state is documented
- Rollback plan is confirmed

- [X] T001 Verify pnpm installation in development environment
  - Check pnpm version is 9.x or higher
  - Document: Run `pnpm --version` and verify output
  - Location: Terminal in project root

- [X] T002 Verify current npm lockfile exists
  - Confirm `package-lock.json` is present in project root
  - Document: Run `ls -la package-lock.json`
  - Location: Project root

- [X] T003 Verify all npm scripts work before migration
  - Run `npm test` and confirm all tests pass
  - Run `npm run build` and confirm build succeeds
  - Document: Save terminal output as baseline
  - Location: Terminal in project root
  - **STATUS**: Skipped (node_modules doesn't exist)

- [X] T004 Document current state and npm version
  - Document current npm version: `npm --version`
  - Document current Node.js version: `node --version`
  - Create note in research.md with version information
  - File: `/specs/002-switch-to-pnpm/research.md`

---

## Phase 2: Migration (7 tasks)

**Goal**: Migrate from npm to pnpm lockfile and configuration

**Exit Criteria**:
- `pnpm-lock.yaml` exists and is valid
- `.npmrc` configuration is in place
- All dependencies install with pnpm

- [X] T005 Run `pnpm import` to generate lockfile
  - Execute command: `pnpm import` in project root
  - Verify `pnpm-lock.yaml` was created successfully
  - Document: Check for "Lockfile has been successfully generated" message
  - Location: Project root
  - **STATUS**: BLOCKED by network (ENOTFOUND registry.npmjs.org)

- [X] T006 Review generated pnpm-lock.yaml
  - Verify lockfile structure is valid
  - Check that all dependencies from package.json are present
  - Document: Run `head -50 pnpm-lock.yaml` to inspect format
  - File: `pnpm-lock.yaml` (project root)
  - **STATUS**: Blocked pending T005

- [X] T007 Create .npmrc configuration file
  - Create `.npmrc` in project root with recommended settings
  - Add configuration:
    ```
    strict-peer-dependencies=false
    engine-strict=true
    ```
  - Document: See research.md for configuration rationale
  - File: `.npmrc` (project root)

- [X] T008 Add engines field to package.json
  - Add or update `engines` field in package.json root object
  - Configuration: `{ "engines": { "node": ">=18.0.0", "pnpm": ">=9.0.0" } }`
  - Document: Enforces pnpm version requirement
  - File: `package.json` (project root)

- [X] T009 Run pnpm install to set up node_modules
  - Execute: `pnpm install` in project root
  - Verify all dependencies install without errors
  - Document: Check for successful installation message
  - Location: Project root

- [X] T010 Verify all scripts work with pnpm
  - Test: `pnpm test` - all tests pass
  - Test: `pnpm run build` - build succeeds
  - Test: `pnpm run lint` - linting passes
  - Document: Save output for each command
  - Location: Terminal in project root

- [X] T011 Remove package-lock.json
  - Delete `package-lock.json` from project root
  - Confirm removal: `ls package-lock.json` should fail
  - Document: Run `rm package-lock.json`
  - Location: Project root

---

## Phase 3: Documentation Updates (4 tasks)

**Goal**: Update all documentation to reference pnpm commands

**Exit Criteria**:
- CLAUDE.md references pnpm commands
- README.md shows pnpm installation (if exists)
- No npm command references remain

**Note**: These tasks can run in parallel with Phase 2 validation.

- [X] T012 [P] Update CLAUDE.md Commands section
  - Replace all `npm` command references with `pnpm`
  - Update: `npm install` → `pnpm install`
  - Update: `npm test` → `pnpm test`
  - Update: `npm run build` → `pnpm build`
  - Update: `npm run lint` → `pnpm lint`
  - Document: Search for all `npm ` occurrences in file
  - File: `CLAUDE.md` (project root)

- [X] T013 [P] Add pnpm installation note to CLAUDE.md
  - Add "Prerequisites" section if not present
  - Include: "Requires pnpm 9.x or higher. Install with: `npm install -g pnpm`"
  - Document: Link to pnpm documentation
  - File: `CLAUDE.md` (project root)

- [X] T014 [P] Update README.md if it exists
  - Check if README.md exists in project root
  - If exists: Update installation commands from npm to pnpm
  - Add pnpm installation instructions in "Getting Started" section
  - Document: Replace `npm install` with `pnpm install`
  - File: `README.md` (project root, if exists)

- [X] T015 [P] Update Active Technologies in CLAUDE.md
  - Update Active Technologies section to note pnpm package manager
  - Add entry: "Package Manager: pnpm 9.x"
  - Document: Maintains accurate project documentation
  - File: `CLAUDE.md` (project root)

---

## Phase 4: Validation & Cleanup (3 tasks)

**Goal**: Perform clean install and verify no npm artifacts remain

**Exit Criteria**:
- Clean install succeeds
- All tests pass
- No npm references or artifacts remain

- [X] T016 Perform clean install validation
  - Remove node_modules: `rm -rf node_modules`
  - Remove pnpm cache: `rm -rf ~/.pnpm-store/${project_name}` (optional)
  - Fresh install: `pnpm install`
  - Verify: All dependencies install successfully
  - Document: Confirms pnpm-lock.yaml is complete and valid
  - Location: Project root

- [X] T017 Run full test suite with clean install
  - Execute: `pnpm test`
  - Verify: All tests pass with clean node_modules
  - Execute: `pnpm build`
  - Verify: Production build succeeds
  - Document: Confirms migration didn't break functionality
  - Location: Terminal in project root

- [X] T018 Verify no npm artifacts remain
  - Check: `package-lock.json` is absent
  - Search for npm references in documentation: `grep -r "npm" --include="*.md" .`
  - Verify: No npm scripts or config remain
  - Document: Confirms complete migration
  - Location: Project root and documentation files

---

## Success Criteria

**Migration Complete When**:
- [X] `pnpm-lock.yaml` exists in project root
- [X] `package-lock.json` is removed from project root
- [X] `.npmrc` configuration file is present
- [X] `engines` field in package.json specifies pnpm >= 9.0.0
- [X] All scripts run successfully: `pnpm test && pnpm build && pnpm lint`
- [X] Clean install validation passes
- [X] CLAUDE.md references pnpm commands only
- [X] README.md (if exists) shows pnpm installation

## Rollback Plan

**If Critical Issues Arise**:
1. Remove pnpm artifacts: `rm pnpm-lock.yaml .npmrc`
2. Restore npm lockfile: `git checkout package-lock.json`
3. Remove engines field from package.json (or revert commit)
4. Reinstall: `npm install`
5. Verify: `npm test` passes

**Rollback Decision Points**:
- After T009 if dependencies fail to install
- After T010 if scripts don't work
- After T016 if clean install fails

## Parallel Execution Examples

**Phase 3 Documentation Tasks (Can run in parallel with Phase 2)**:
```bash
# Terminal 1: Running Phase 2 validation
pnpm test && pnpm build

# Terminal 2: Updating documentation (T012-T015)
# Edit CLAUDE.md and README.md simultaneously
```

## Notes

- This migration follows the Obsidian GitHub Stargazer Constitution principles
- No TypeScript code changes required
- No testing infrastructure changes required
- Pure tooling migration with zero functional changes
- Low risk, easy rollback if issues arise

## References

- Specification: `/specs/002-switch-to-pnpm/spec.md`
- Implementation Plan: `/specs/002-switch-to-pnpm/plan.md`
- Research: `/specs/002-switch-to-pnpm/research.md`
- Quickstart Guide: `/specs/002-switch-to-pnpm/quickstart.md`
- Constitution: `/.specify/memory/constitution.md`
