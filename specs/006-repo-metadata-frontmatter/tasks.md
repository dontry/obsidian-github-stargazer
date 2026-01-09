# Tasks: Repository Metadata as Frontmatter

**Feature**: 006-repo-metadata-frontmatter
**Branch**: `006-repo-metadata-frontmatter`
**Input**: Design documents from `/specs/006-repo-metadata-frontmatter/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/ ✅

**Tests**: TDD approach - Tests MUST be written BEFORE implementation code (Constitution requirement). All test tasks are marked and should fail before implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Path Conventions

This is a single Obsidian plugin project:
- Source code: `src/`
- Tests: `tests/`
- Modified existing files and new files follow existing project structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type definitions

**Note**: This is an existing Obsidian plugin with TypeScript already configured. Minimal setup needed.

- [ ] T001 Add RepositoryMetadata interface to src/types.ts
- [ ] T002 Add FileOperationResult interface to src/types.ts
- [ ] T003 [P] Add RepositoryMetadataFile interface to src/types.ts
- [ ] T004 [P] Add MetadataSyncOptions interface to src/types.ts
- [ ] T005 Extend Repository interface with metadata tracking fields in src/types.ts
- [ ] T006 Add generateMetadataSha helper function to src/types.ts

**Checkpoint**: Type definitions ready - foundational implementation can begin

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core utility infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Tests for Foundational Components (TDD - Write First, Ensure Failure)

- [ ] T007 [P] Create test file structure for utilities in tests/unit/utils/
- [ ] T008 [P] Write unit tests for path sanitization in tests/unit/utils/path-utils.test.ts (must fail)
- [ ] T009 [P] Write unit tests for file path generation in tests/unit/utils/path-utils.test.ts (must fail)
- [ ] T010 [P] Write unit tests for file manager operations in tests/unit/utils/file-manager.test.ts (must fail)

### Foundational Implementation

- [ ] T011 Implement sanitizePathSegment function in src/utils/path-utils.ts
- [ ] T012 [P] Implement generateMetadataFilePath function in src/utils/path-utils.ts
- [ ] T013 [P] Implement generateReadmeFilePath function in src/utils/path-utils.ts
- [ ] T014 Implement createOrUpdateMetadataFile function in src/utils/file-manager.ts
- [ ] T015 [P] Implement deleteRepositoryFiles function in src/utils/file-manager.ts
- [ ] T016 Implement detectUnstarredRepos function in src/utils/file-manager.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Repository Metadata with Frontmatter (Priority: P1) 🎯 MVP

**Goal**: Create separate metadata files with YAML frontmatter for each synced repository, making metadata queryable via Obsidian Dataview

**Independent Test**: Sync a single repository and verify `owner-repository-metadata.md` file is created with valid YAML frontmatter containing all required metadata fields (name, description, stars, language, topics, etc.)

**Why This Priority**: This is the core value proposition - making repository metadata queryable and structured within Obsidian unlocks powerful organization and discovery capabilities.

### Tests for User Story 1 (TDD - Write First, Ensure Failure) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T017 [P] [US1] Write unit test for YAML escaping in tests/unit/sync/metadata-generator.test.ts (must fail)
- [ ] T018 [P] [US1] Write unit test for frontmatter generation in tests/unit/sync/metadata-generator.test.ts (must fail)
- [ ] T019 [P] [US1] Write unit test for frontmatter validation in tests/unit/sync/metadata-generator.test.ts (must fail)
- [ ] T020 [P] [US1] Write integration test for metadata file creation in tests/integration/metadata-sync.test.ts (must fail)
- [ ] T021 [P] [US1] Write integration test for metadata update preserving user edits in tests/integration/metadata-sync.test.ts (must fail)

### Implementation for User Story 1

- [ ] T022 [P] [US1] Implement escapeYaml function in src/sync/metadata-generator.ts
- [ ] T023 [P] [US1] Implement generateFrontmatter function in src/sync/metadata-generator.ts
- [ ] T024 [P] [US1] Implement validateFrontmatter function in src/sync/metadata-generator.ts
- [ ] T025 [US1] Implement extractMetadataFromGraphQL function in src/sync/metadata-generator.ts (depends on T022, T023)
- [ ] T026 [US1] Create MetadataGenerator class in src/sync/metadata-generator.ts (orchestrates T022-T025)
- [ ] T027 [US1] Integrate metadata generation into sync flow in src/sync/sync-service.ts
- [ ] T028 [US1] Implement user edit preservation logic in src/utils/file-manager.ts
- [ ] T029 [US1] Add metadata SHA tracking to checkpoint system in src/storage/checkpoint-manager.ts

**Checkpoint**: At this point, User Story 1 should be fully functional - syncing creates metadata files with valid frontmatter that can be queried via Dataview

---

## Phase 4: User Story 2 - Structured README File Organization (Priority: P2)

**Goal**: Organize README files in `owner/repository-name/` directory structure with unique naming to group repositories by owner and reduce vault clutter

**Independent Test**: Sync repositories from multiple owners (e.g., facebook/react, google/tensorflow) and verify both README and metadata files are created in `owner/repository-name/` directories with unique names (`owner-repo-readme.md` and `owner-repo-metadata.md`)

**Why This Priority**: This improves organization and reduces clutter in the vault. While valuable, it's secondary to having metadata available since the metadata itself enables better organization through queries.

### Tests for User Story 2 (TDD - Write First, Ensure Failure) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [ ] T030 [P] [US2] Write unit test for owner directory creation in tests/unit/utils/file-manager.test.ts (must fail)
- [ ] T031 [P] [US2] Write integration test for README path structure in tests/integration/metadata-sync.test.ts (must fail)
- [ ] T032 [P] [US2] Write integration test for repositories without README in tests/integration/metadata-sync.test.ts (must fail)
- [ ] T033 [P] [US2] Write integration test for unstar detection and deletion in tests/integration/metadata-sync.test.ts (must fail)

### Implementation for User Story 2

- [ ] T034 [P] [US2] Implement ensureOwnerDirectoryExists function in src/utils/file-manager.ts
- [ ] T035 [US2] Modify README fetcher to use new path structure in src/sync/readme-fetcher.ts (uses generateReadmeFilePath from T013)
- [ ] T036 [US2] Handle repositories without README files in src/sync/readme-fetcher.ts
- [ ] T037 [US2] Implement promptForDeletion modal in src/ui/deletion-modal.ts
- [ ] T038 [US2] Integrate unstar detection and cleanup flow in src/sync/sync-service.ts
- [ ] T039 [US2] Update checkpoint tracking for new path structure in src/storage/checkpoint-manager.ts

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - repositories sync with metadata files and READMEs in organized `owner/repository-name/` structure

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and ensure production readiness

### Testing & Validation

- [ ] T040 [P] Run all unit tests and verify 100% pass rate
- [ ] T041 [P] Run all integration tests and verify 100% pass rate
- [ ] T042 [P] Verify test coverage meets or exceeds baseline with pnpm test:coverage
- [ ] T043 [P] Run ESLint and fix any issues with pnpm lint
- [ ] T044 [P] Run TypeScript compiler check with tsc -noEmit

### Edge Cases & Error Handling

- [ ] T045 [P] Add handling for repositories with special characters in names in src/utils/path-utils.ts
- [ ] T046 [P] Add handling for very long repository names in src/utils/path-utils.ts
- [ ] T047 [P] Add handling for YAML frontmatter with special characters in src/sync/metadata-generator.ts
- [ ] T048 [P] Add handling for renamed repositories in src/sync/sync-service.ts
- [ ] T049 Add graceful error handling for GitHub API rate limits in src/sync/sync-service.ts

### Performance & Optimization

- [ ] T050 [P] Optimize batch metadata file creation in src/sync/sync-service.ts
- [ ] T051 [P] Implement efficient SHA comparison to avoid unnecessary file writes in src/utils/file-manager.ts
- [ ] T052 Profile sync performance with 500 repositories and verify under 2 minutes

### Documentation & Validation

- [ ] T053 [P] Update README.md with new metadata file feature documentation
- [ ] T054 [P] Add inline code comments for complex logic in src/sync/metadata-generator.ts
- [ ] T055 [P] Verify all functions follow constitutional limits (<50 lines per function, <300 lines per file)
- [ ] T056 [P] Run quickstart.md validation steps and verify all work correctly
- [ ] T057 Final integration test: Sync real GitHub starred repositories and verify all functionality

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - Core MVP feature
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Can be parallel with US1, or done after
- **Polish (Phase 5)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Can be parallel with US1, or sequential

**Note**: User stories 1 and 2 are largely independent and can be developed in parallel if team capacity allows. US1 focuses on metadata generation while US2 focuses on file organization and unstar cleanup.

### Within Each User Story

1. Tests MUST be written and FAIL before implementation (TDD - Constitution requirement)
2. Tests marked [P] can be written in parallel
3. Functions marked [P] can be implemented in parallel
4. Classes/orchestration tasks depend on component functions
5. Integration tasks depend on individual components being complete
6. Story complete before moving to polish phase

### Parallel Opportunities

#### Phase 1 - Setup
```bash
# All interface definitions can be created in parallel:
T003, T004  # RepositoryMetadataFile, MetadataSyncOptions (no dependencies)
```

#### Phase 2 - Foundational
```bash
# All test files can be created in parallel:
T008, T009, T010  # Path utils tests, file manager tests (different test files)

# Utility functions can be implemented in parallel:
T012, T013  # generateMetadataFilePath, generateReadmeFilePath (different functions)
```

#### Phase 3 - User Story 1
```bash
# All tests can be written in parallel:
T017, T018, T019, T020, T021  # All US1 tests (different test suites)

# Helper functions can be implemented in parallel:
T022, T023, T024  # escapeYaml, generateFrontmatter, validateFrontmatter (independent)
```

#### Phase 4 - User Story 2
```bash
# All tests can be written in parallel:
T030, T031, T032, T033  # All US2 tests (different test scenarios)

# Some implementations can be parallel:
T030, T036  # Owner directory creation, README handling (independent)
```

#### Phase 5 - Polish
```bash
# Most validation/edge case tasks can run in parallel:
T040, T041, T042, T043, T044  # All tests and validation (independent)
T045, T046, T047, T048  # Edge case handling (different functions)
T050, T051, T053, T054, T055  # Optimization and documentation (different files)
```

---

## Parallel Example: User Story 1 Implementation

### Step 1: Write All Tests in Parallel (TDD)
```bash
# Launch all test writing tasks together (they're independent test files):
Task T017: "Write unit test for YAML escaping"
Task T018: "Write unit test for frontmatter generation"
Task T019: "Write unit test for frontmatter validation"
Task T020: "Write integration test for metadata file creation"
Task T021: "Write integration test for metadata update preserving user edits"

# Verify all tests FAIL before proceeding
```

### Step 2: Implement Helper Functions in Parallel
```bash
# Launch all helper function implementations together:
Task T022: "Implement escapeYaml function"
Task T023: "Implement generateFrontmatter function"
Task T024: "Implement validateFrontmatter function"
```

### Step 3: Orchestrate and Integrate (Sequential)
```bash
# These depend on helper functions:
Task T025: "Implement extractMetadataFromGraphQL" (depends on T022-T024)
Task T026: "Create MetadataGenerator class" (depends on T025)
Task T027: "Integrate into sync flow" (depends on T026)
Task T028: "Implement user edit preservation" (depends on T027)
Task T029: "Add SHA tracking" (depends on T027)

# Run tests, verify they all PASS
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Recommended approach** for fastest time to value:

1. ✅ Complete Phase 1: Setup (T001-T006)
2. ✅ Complete Phase 2: Foundational (T007-T016)
3. ✅ Complete Phase 3: User Story 1 (T017-T029)
4. ✅ **STOP and VALIDATE**: Test User Story 1 independently
   - Sync a single repository
   - Verify metadata file created with valid frontmatter
   - Query metadata via Dataview
   - Verify user edits preserved on update
5. ✅ Deploy/demo MVP

**Value Delivered**: Users can now query and organize their starred repositories using Obsidian Dataview - the core value proposition.

### Incremental Delivery

Build on MVP by adding more features incrementally:

1. **Setup + Foundational** → Foundation ready
2. **Add User Story 1** → Test independently → Deploy/Demo (MVP! ✅)
3. **Add User Story 2** → Test independently → Deploy/Demo (Better organization)
4. **Add Polish** → Production-ready feature (Performance, edge cases, documentation)

### Parallel Team Strategy

With multiple developers (or efficient parallel work):

1. **Foundation Phase** (T001-T016): Team completes together
2. **Once Foundation is done**:
   - **Developer A**: User Story 1 (T017-T029) - Metadata generation
   - **Developer B**: User Story 2 (T030-T039) - File organization and unstar cleanup
3. **Stories complete and integrate independently**
4. **Polish Phase** (T040-T057): Team completes together

**Note**: US1 and US2 are designed to be independent - they can be developed in parallel after foundation is complete.

---

## Testing Strategy

### TDD Approach (Constitution Requirement)

The constitution **REQUIRES** TDD for this feature:

1. **Write test FIRST** for each component
2. **Run test** and verify it FAILS (red)
3. **Write implementation** to make test pass (green)
4. **Refactor** if needed (cleanup)
5. **Commit** after each test-implementation cycle

### Test Coverage Requirements

- **Unit Tests**: REQUIRED for all utility functions and service methods
  - Path sanitization edge cases
  - YAML escaping for special characters
  - Frontmatter generation and validation
  - File operations (create, update, delete)

- **Integration Tests**: REQUIRED for end-to-end flows
  - Metadata file creation during sync
  - Metadata update preserving user edits
  - README file organization
  - Unstar detection and deletion flow

- **Test Coverage**: MUST NOT decrease from baseline (measure with `pnpm test:coverage`)

### Test Validation Checklist

Before marking a user story complete:

- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] Coverage at or above baseline
- [ ] Manual testing completes successfully (per quickstart.md)
- [ ] No regressions in existing functionality

---

## Validation Checklist

### Pre-Implementation

- [ ] Constitution reviewed and no violations found
- [ ] All design documents read and understood
- [ ] Project structure cloned to test environment
- [ ] Development tools configured (pnpm, vitest, eslint)

### During Implementation

- [ ] Each task marked complete only after verification
- [ ] Tests written first and verified to fail (TDD)
- [ ] Implementation makes tests pass
- [ ] Code reviewed against constitution (readability, modularity, etc.)
- [ ] Commits made frequently with descriptive messages

### Post-Implementation (Per User Story)

- [ ] All tests for story pass
- [ ] Manual testing per quickstart.md successful
- [ ] Story independently testable
- [ ] Documentation updated (if story has user-facing changes)
- [ ] No regressions in existing functionality

### Final Validation

- [ ] All user stories complete
- [ ] All tests pass (unit + integration)
- [ ] Coverage meets or exceeds baseline
- [ ] ESLint passes with no errors
- [ ] TypeScript compilation passes
- [ ] Performance benchmark met (500 repos < 2 minutes)
- [ ] Edge cases tested and handled
- [ ] Documentation complete and accurate
- [ ] Ready for code review and merge

---

## Notes

- **[P] tasks** = different files or functions, no dependencies on incomplete work
- **[Story] label** maps task to specific user story for traceability
- Each user story should be independently completable and testable
- **TDD is REQUIRED**: Tests must fail before implementation (constitution)
- Commit after each task or logical group of related tasks
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- All functions must be <50 lines (constitution)
- All files must be <300 lines (constitution)
- Type safety with TypeScript strict mode (constitution)

---

## Task Count Summary

- **Total Tasks**: 57
- **Setup Phase**: 6 tasks
- **Foundational Phase**: 10 tasks
- **User Story 1 Phase**: 13 tasks (MVP)
- **User Story 2 Phase**: 10 tasks
- **Polish Phase**: 18 tasks

**Parallel Opportunities Identified**: 35 tasks marked [P] can run in parallel with other [P] tasks in their phase

**Independent Test Criteria**:
- **US1**: Sync single repo, verify metadata file with valid YAML frontmatter
- **US2**: Sync multiple owners, verify organized structure and unique filenames

**Suggested MVP Scope**: User Story 1 only (T001-T029) - delivers core value of queryable metadata
