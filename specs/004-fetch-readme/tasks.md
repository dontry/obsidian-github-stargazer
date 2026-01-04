# Tasks: Parallel README Fetching During Sync

**Input**: Design documents from `/specs/004-fetch-readme/`
**Prerequisites**: plan.md (required), spec.md (required for user stories)

**Tests**: ⚠️ TDD REQUIRED - This project follows Test-Driven Development. Tests MUST be written BEFORE implementation per the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single Obsidian plugin project**: `src/`, `tests/` at repository root
- Paths below follow plan.md structure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and type system extensions

- [X] T001 Add README configuration constants to src/config/readme-config.ts (concurrency limit 5, max file size 5MB, timeout 30s)
- [X] T002 [P] Create GitHub README API error types in src/types/errors.ts (ReadmeNotFoundError, RateLimitError, AccessDeniedError)
- [X] T003 [P] Create README metadata types in src/types/readme.ts (ReadmeMetadata, ReadmeFetchStatus, ReadmeConflictState)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Extend Repository interface in src/types.ts with readmeSha, readmeVaultFilePath, localReadmeModified fields
- [X] T005 Extend SyncCheckpoint interface in src/types.ts with readmeMetadata: Map<string, ReadmeMetadata> field
- [X] T006 Add README size validation utility in src/utils/validation.ts (validateReadmeSize, sanitizeFileName)
- [X] T007 Add SHA comparison utility in src/utils/sha.ts (compareShas, extractShaFromResponse)
- [X] T008 Setup rate limiter configuration for README endpoint in src/sync/rate-limiter.ts (extend existing limiter for REST API)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Conditional README Fetching (Priority: P1) 🎯 MVP

**Goal**: Fetch README files only when they have been updated using SHA-based change detection

**Independent Test**: Sync repositories twice - first sync fetches all READMEs, second sync only fetches READMEs for repositories where the README file has changed on GitHub

### Tests for User Story 1 (TDD - Write FIRST, Ensure They FAIL) ⚠️

- [X] T009 [P] [US1] Unit test for SHA comparison logic in tests/unit/sync/readme-fetcher.test.ts (compare same SHA, compare different SHA, handle null SHA)
- [X] T010 [P] [US1] Unit test for README size validation in tests/unit/utils/validation.test.ts (validate under limit, reject over limit, handle zero size)
- [X] T011 [P] [US1] Unit test for file name sanitization in tests/unit/utils/validation.test.ts (sanitize valid names, handle special characters, truncate long names)
- [X] T012 [P] [US1] Integration test for single README fetch with SHA change detection in tests/integration/sync/readme-fetch-integration.test.ts (fetch new README, skip unchanged README, detect SHA change)
- [X] T013 [P] [US1] Unit test for checkpoint README metadata in tests/unit/sync/checkpoint-manager.test.ts (save readme metadata to checkpoint, load readme metadata from checkpoint, handle missing metadata)

### Implementation for User Story 1

- [ ] T014 [P] [US1] Implement GitHub README REST API client in src/sync/github-client.ts (add fetchReadme method using api.github.com/repos/{owner}/{repo}/readme, handle base64 decoding, extract SHA)
- [ ] T015 [P] [US1] Implement vault file manager in src/storage/vault-file-manager.ts (createReadmeFile, updateReadmeFile, readFileContent, checkFileCollision, detectLocalModification using Obsidian vault.adapter API)
- [ ] T016 [US1] Implement README fetcher core logic in src/sync/readme-fetcher.ts (fetchReadmeIfChanged method: compare stored SHA vs API SHA, fetch only if changed, handle missing READMEs, enforce 5MB size limit)
- [ ] T017 [US1] Add README metadata tracking to checkpoint manager in src/sync/checkpoint-manager.ts (save ReadmeMetadata to checkpoint, load ReadmeMetadata from checkpoint, update SHA after successful fetch)
- [ ] T018 [US1] Integrate README fetching into sync service in src/sync/sync-service.ts (call readme-fetcher after each repo metadata fetch, pass checkpoint metadata, handle fetch failures gracefully)
- [ ] T019 [US1] Add error handling for README fetch failures in src/sync/sync-service.ts (log error, store failed fetch indicator, continue syncing other repos, display Notice to user)
- [ ] T020 [US1] Add logging for README fetch operations in src/sync/readme-fetcher.ts (log fetch started, SHA comparison result, fetch skipped, fetch completed, fetch failed)

**Checkpoint**: At this point, User Story 1 should be fully functional - READMEs fetch only when changed, with SHA-based change detection working

---

## Phase 4: User Story 2 - Parallel Fetching Performance (Priority: P2)

**Goal**: Fetch README files in parallel with repository metadata to minimize sync time

**Independent Test**: Measure sync time with parallel fetching enabled - should complete faster than sequential fetching for 100+ repositories

### Tests for User Story 2 (TDD - Write FIRST, Ensure They FAIL) ⚠️

- [ ] T021 [P] [US2] Unit test for concurrency pool management in tests/unit/sync/readme-fetcher.test.ts (create pool of 5 concurrent requests, respect concurrency limit, handle pool exhaustion)
- [ ] T022 [P] [US2] Integration test for parallel README fetching in tests/integration/sync/parallel-readme-sync.test.ts (fetch 10 repos in parallel, verify max 5 concurrent, verify all READMEs fetched, verify checkpoint includes all metadata)
- [ ] T023 [P] [US2] Unit test for rate limit handling in tests/unit/sync/rate-limiter.test.ts (handle 403 rate limit error, implement exponential backoff, resume after rate limit reset)
- [ ] T024 [P] [US2] Integration test for checkpoint resume with parallel fetching in tests/integration/sync/parallel-readme-sync.test.ts (interrupt sync during parallel fetch, resume from checkpoint, verify parallel fetching continues)

### Implementation for User Story 2

- [ ] T025 [P] [US2] Implement concurrency pool manager in src/sync/readme-fetcher.ts (createRequestPool method, limit to 5 concurrent requests, queue excess requests, process queue as slots free)
- [ ] T026 [P] [US2] Add parallel fetching orchestration in src/sync/readme-fetcher.ts (fetchReadmesInParallel method, start fetches for multiple repos, manage concurrency pool, collect results)
- [ ] T027 [US2] Integrate parallel README fetching into sync service in src/sync/sync-service.ts (call fetchReadmesInParallel after batch of repo metadata fetches, pass repos in batches, handle partial failures)
- [ ] T028 [US2] Extend rate limiter for parallel requests in src/sync/rate-limiter.ts (track parallel request count, implement backoff for rate limit errors, reset after cooldown)
- [ ] T029 [US2] Add checkpoint resume support for parallel fetching in src/sync/sync-service.ts (load in-progress README fetches from checkpoint, continue parallel fetching from checkpoint, update checkpoint incrementally)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - READMEs fetch in parallel with SHA-based change detection

---

## Phase 5: User Story 3 - README Content Storage & Display (Priority: P3)

**Goal**: Display README content in Obsidian vault with conflict resolution for user-edited files

**Independent Test**: Sync a repository, open the README markdown file in vault, verify content displays with proper formatting

### Tests for User Story 3 (TDD - Write FIRST, Ensure They FAIL) ⚠️

- [ ] T030 [P] [US3] Unit test for vault file creation in tests/unit/storage/vault-file-manager.test.ts (create new README file, handle file collision, write content with markdown formatting)
- [ ] T031 [P] [US3] Unit test for local modification detection in tests/unit/storage/vault-file-manager.test.ts (detect file unchanged, detect local modification, handle file not found)
- [ ] T032 [P] [US3] Unit test for conflict detection logic in tests/unit/sync/readme-conflict-detector.test.ts (both changed, only local changed, only remote changed, neither changed)
- [ ] T033 [P] [US3] Integration test for conflict resolution workflow in tests/integration/sync/conflict-resolution.test.ts (detect conflict, show modal, user chooses overwrite remote, user chooses keep local, user chooses view diff)
- [ ] T034 [P] [US3] Unit test for conflict resolution modal in tests/unit/ui/conflict-resolution-modal.test.ts (render modal with local and remote content, handle overwrite button, handle keep local button, handle view diff button)

### Implementation for User Story 3

- [ ] T035 [P] [US3] Implement README conflict detector in src/sync/readme-conflict-detector.ts (detectConflict method: compare local SHA vs remote SHA, check local modification flag, return conflict state)
- [ ] T036 [P] [US3] Implement conflict resolution modal UI in src/ui/conflict-resolution-modal.ts (create Obsidian Modal, display local and remote README previews, add "Overwrite with GitHub version" button, add "Keep local edits" button, add "View diff" button)
- [ ] T037 [US3] Implement diff view in src/ui/conflict-resolution-modal.ts (use diff library or custom implementation, show line-by-line differences between local and remote, highlight changes)
- [ ] T038 [US3] Integrate conflict detection into sync service in src/sync/sync-service.ts (call conflict detector before updating vault files, if conflict: show modal, await user choice, apply choice)
- [ ] T039 [US3] Add filename collision handling in src/storage/vault-file-manager.ts (checkFileCollision method before creating file, if collision: prompt user to resolve: rename existing file, choose different name, or skip)
- [ ] T040 [US3] Add README display integration in src/ui/ (if applicable: add README link to repo view, add README preview panel, or rely on Obsidian's default markdown rendering)

**Checkpoint**: All user stories should now be independently functional - conditional fetching, parallel execution, and vault storage with conflict resolution

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T041 [P] Update README.md with GitHub API network calls documentation
- [ ] T042 [P] Verify no circular dependencies introduced by new modules (readme-fetcher, readme-conflict-detector, vault-file-manager)
- [ ] T043 Add integration test for end-to-end sync with README fetching in tests/integration/sync/e2e-readme-sync.test.ts (sync 100 repos, verify all READMEs fetched, verify checkpoint complete, verify vault files created)
- [ ] T044 Add performance test for parallel fetching in tests/integration/sync/parallel-readme-sync.test.ts (measure sync time for 100 repos with parallel fetching, verify <50% sequential time, verify <30% additional time vs metadata-only)
- [ ] T045 [P] Add unit test for error edge cases in tests/unit/sync/readme-fetcher.test.ts (handle 404 not found, handle 403 access denied, handle network timeout, handle malformed base64)
- [ ] T046 [P] Add unit test for README encoding handling in tests/unit/sync/github-client.test.ts (decode UTF-8, handle encoding errors, fall back to safe encoding)
- [ ] T047 Run all tests with pnpm test and verify 100% pass rate
- [ ] T048 Run pnpm run lint and fix any issues
- [ ] T049 Run pnpm run build and verify no TypeScript errors
- [ ] T050 Manual testing: Enable plugin in Obsidian, perform full sync, verify README files appear in vault root, verify README content displays correctly

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Conditional Fetching**: Can start after Foundational (Phase 2) - No dependencies on other stories - **MVP SCOPE**
- **User Story 2 (P2) - Parallel Performance**: Can start after Foundational (Phase 2) - Extends US1 with parallel execution - Should be independently testable without breaking US1
- **User Story 3 (P3) - Storage & Display**: Can start after Foundational (Phase 2) - Integrates with US1/US2 for conflict detection - Should be independently testable

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD)
- Utilities and helpers before core logic
- Core logic before integration
- Integration before error handling
- Story complete before moving to next priority

### Parallel Opportunities

**Setup Phase**:
- T001, T002, T003 can run in parallel

**Foundational Phase**:
- T004, T005, T006, T007, T008 can run in parallel (except T004 must complete before T005 if T005 uses new Repository fields)

**User Story 1 Tests**:
- T009, T010, T011, T012, T013 can all run in parallel

**User Story 1 Implementation**:
- T014, T015 can run in parallel (different files)
- T016 must wait for T014, T015
- T017 must wait for T016
- T018 must wait for T017
- T019, T020 can run in parallel after T018

**User Story 2 Tests**:
- T021, T022, T023, T024 can all run in parallel

**User Story 2 Implementation**:
- T025, T026 can run in parallel (same file, but different methods)
- T027 must wait for T026
- T028 can run in parallel with T025, T026
- T029 must wait for T027, T028

**User Story 3 Tests**:
- T030, T031, T032, T033, T034 can all run in parallel

**User Story 3 Implementation**:
- T035, T036 can run in parallel
- T037 must wait for T036
- T038 must wait for T035, T037
- T039 can run in parallel with T035, T036, T037
- T040 must wait for T038

**Polish Phase**:
- T041, T042, T045, T046 can run in parallel
- T043, T044 can run in parallel after T001-T040 complete
- T047, T048, T049, T050 must run sequentially at end

---

## Parallel Example: User Story 1

```bash
# Phase 1: Launch all Setup tasks together:
Task T001: Add README configuration constants
Task T002: Create GitHub README API error types
Task T003: Create README metadata types

# Phase 2: Launch all Foundational tasks together (some may have dependencies):
Task T004: Extend Repository interface
Task T005: Extend SyncCheckpoint interface
Task T006: Add README size validation utility
Task T007: Add SHA comparison utility
Task T008: Setup rate limiter configuration

# Phase 3: User Story 1 - Launch all tests together (TDD - write FIRST):
Task T009: Unit test for SHA comparison
Task T010: Unit test for size validation
Task T011: Unit test for file name sanitization
Task T012: Integration test for single README fetch
Task T013: Unit test for checkpoint metadata

# User Story 1 - Launch implementations in parallel where possible:
Task T014: GitHub REST API client
Task T015: Vault file manager
# Then:
Task T016: README fetcher core logic (depends on T014, T015)
Task T017: Checkpoint metadata tracking (depends on T016)
Task T018: Sync service integration (depends on T017)
Task T019: Error handling (parallel with T020)
Task T020: Logging (parallel with T019)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

**Minimum Viable Product**: Conditional README fetching with SHA-based change detection

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T008) - CRITICAL, blocks everything
3. Complete Phase 3: User Story 1 (T009-T020)
4. **STOP and VALIDATE**: Test User Story 1 independently
   - Sync repositories twice
   - Verify first sync fetches all READMEs
   - Verify second sync skips unchanged READMEs
   - Verify README files appear in vault root
5. Deploy/demo MVP if ready

**Value Delivered**: READMEs fetch only when changed, minimizing bandwidth and sync time

### Incremental Delivery

1. **MVP (User Story 1)**: Conditional fetching
   - Test independently
   - Deploy/Demo
2. **Add User Story 2**: Parallel performance
   - Test independently (measure sync time improvement)
   - Deploy/Demo
3. **Add User Story 3**: Vault storage with conflict resolution
   - Test independently (verify user edit handling)
   - Deploy/Demo
4. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T008)
2. Once Foundational is done:
   - **Developer A**: User Story 1 (T009-T020) - MVP delivery
   - **Developer B**: User Story 2 (T021-T029) - Performance optimization
   - **Developer C**: User Story 3 (T030-T040) - UX enhancement
3. Stories complete and integrate independently
4. Final: Team completes Polish together (T041-T050)

---

## Notes

- **[P]** tasks = different files or independent operations, no blocking dependencies
- **[Story]** label maps task to specific user story for traceability
- **TDD is NON-NEGOTIABLE**: Tests MUST be written before implementation (constitution requirement)
- Each user story should be independently completable and testable
- Verify tests fail before implementing (red-green-refactor)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- **Constitution compliance**: All tasks follow strict TypeScript, modularity, and testing standards
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
