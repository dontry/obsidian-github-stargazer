# Specification: Switch from npm to pnpm

## Metadata

- **Feature Number**: 002
- **Short Name**: switch-to-pnpm
- **Status**: Draft
- **Created**: 2025-12-31
- **Priority**: High

## Overview

Migrate the obsidian-github-stargazer project from npm to pnpm as the package manager. This change will improve disk space efficiency, installation speed, and provide better dependency management.

## Motivation

### Current State
- Project uses npm as the package manager
- `package.json` contains all dependencies
- `package-lock.json` locks dependency versions

### Problems with npm
- Slower installation times for larger projects
- Less efficient disk space usage (duplicate dependencies)
- Weaker dependency resolution compared to pnpm
- `package-lock.json` can become large and complex

### Benefits of pnpm
- **Disk space efficiency**: Uses hard links and content-addressable storage
- **Faster installations**: Parallel installation of packages
- **Strict dependency isolation**: Prevents phantom dependencies
- **Smaller lockfile**: `pnpm-lock.yaml` is more concise than `package-lock.json`

## Scope

### In Scope
- Convert `package.json` scripts to pnpm-compatible format
- Generate `pnpm-lock.yaml` from existing dependencies
- Remove `package-lock.json`
- Update CI/CD configuration (if any) to use pnpm
- Update documentation to reference pnpm commands
- Configure `.npmrc` for pnpm-specific settings
- Add `pnpm` as a required development tool

### Out of Scope
- Changing dependency versions
- Modifying the project structure
- Changes to the Obsidian plugin API integration

## Requirements

### Functional Requirements

#### FR1: Package Manager Configuration
- The project MUST use pnpm as the package manager
- A valid `pnpm-lock.yaml` file MUST exist in the project root
- The `package-lock.json` file MUST be removed after migration

#### FR2: Script Compatibility
- All npm scripts in `package.json` MUST work with pnpm
- Script behavior MUST remain identical to the npm implementation
- Scripts to migrate:
  - `dev`: Start development server
  - `build`: Build the plugin for production
  - `test`: Run tests with Vitest
  - `lint`: Run ESLint
  - `version`: Bump version using esbuild

#### FR3: Documentation Updates
- CLAUDE.md MUST reference pnpm commands instead of npm
- README.md (if exists) MUST show pnpm installation commands
- All documentation MUST reflect pnpm-specific workflows

#### FR4: pnpm Configuration
- `.npmrc` file MUST be created with pnpm-specific settings
- Configuration MUST include:
  - Strict peer dependencies enforcement
  - Shamefully-hoist setting (if needed for compatibility)

### Non-Functional Requirements

#### NFR1: Backward Compatibility
- Migration MUST NOT break existing functionality
- All dependencies MUST remain at compatible versions
- Development and build workflows MUST continue to work

#### NFR2: Performance
- Installation time SHOULD be faster than npm
- Disk space usage SHOULD be reduced

#### NFR3: Developer Experience
- Developers MUST be able to run `pnpm install` after migration
- All scripts MUST execute without errors
- Error messages MUST be clear if pnpm is not installed

## Implementation Plan

### Phase 1: Preparation
1. Verify pnpm is installed in the development environment
2. Backup current `package-lock.json` (reference)
3. Document current npm version and pnpm target version

### Phase 2: Migration
1. Create `.npmrc` with appropriate pnpm settings
2. Run `pnpm import` to generate `pnpm-lock.yaml` from `package-lock.json`
3. Verify `pnpm-lock.yaml` is correctly generated
4. Run `pnpm install` to verify all dependencies install correctly
5. Remove `package-lock.json`
6. Test all scripts (`dev`, `build`, `test`, `lint`)

### Phase 3: Documentation Updates
1. Update CLAUDE.md Commands section to use pnpm
2. Update README.md installation instructions (if exists)
3. Add pnpm installation instructions to getting started guide

### Phase 4: Validation
1. Clean install: Delete `node_modules` and run `pnpm install`
2. Run full test suite: `pnpm test`
3. Build the plugin: `pnpm build`
4. Verify no npm artifacts remain

## Success Criteria

- [ ] `pnpm-lock.yaml` exists and is valid
- [ ] `package-lock.json` is removed
- [ ] All scripts run successfully with pnpm
- [ ] All tests pass with `pnpm test`
- [ ] Build completes successfully with `pnpm build`
- [ ] No npm-specific artifacts remain in the project
- [ ] Documentation references pnpm commands

## Risks and Mitigations

### Risk 1: Dependency Compatibility
- **Risk**: Some dependencies may not work well with pnpm's strict isolation
- **Mitigation**: Use `shamefully-hoist=true` in `.npmrc` if compatibility issues arise
- **Fallback**: Revert to npm if critical issues cannot be resolved

### Risk 2: CI/CD Pipeline Breaking
- **Risk**: CI/CD pipelines may be configured to use npm
- **Mitigation**: Update CI configuration files to use pnpm
- **Note**: No CI/CD files detected in current project

### Risk 3: Developer Onboarding
- **Risk**: Developers unfamiliar with pnpm may face learning curve
- **Mitigation**: Provide clear documentation on pnpm installation and usage

## Open Questions

1. Should we use `shamefully-hoist=true` by default?
   - **Recommendation**: Start without it, enable only if compatibility issues arise

2. Should we add an `engines` field to `package.json`?
   - **Recommendation**: Yes, specify `"pnpm": ">=8.0.0"` to ensure consistent behavior

## References

- [pnpm Documentation](https://pnpm.io/)
- [pnpm vs npm Comparison](https://pnpm.io/comparison)
- [Migrating from npm](https://pnpm.io/npm-vs-pnpm)
