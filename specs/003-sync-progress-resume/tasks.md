# Tasks: Sync Progress Tracking & Resume

**Input**: Design documents from `/specs/003-sync-progress-resume/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: This project follows TDD (Test-Driven Development) per the constitution. Tests are written BEFORE implementation.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project structure**: `src/`, `tests/` at repository root
- Existing Obsidian plugin with TypeScript 5.3+ and Vitest testing
- No new project setup needed - extending existing codebase

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Feature setup and type definitions

- [X] T001 Add SyncCheckpoint, SyncStatus, SyncProgress, SyncPhase types to src/types.ts
- [X] T002 Add CheckpointValidationError class and ValidationReason type to src/types.ts
- [X] T003 [P] Add logging utility functions (logger.info, logger.warn, logger.error) to src/utils/logger.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T004 Create CheckpointManager service class structure in src/sync/checkpoint-manager.ts
- [X] T005 [P] Implement atomic file write pattern (write temp + rename) in CheckpointManager.saveCheckpoint()
- [X] T006 [P] Implement checkpoint file loading in CheckpointManager.loadCheckpoint()
- [X] T007 Implement lenient checkpoint validation logic in CheckpointManager.validateCheckpoint()
- [X] T008 [P] Implement stale checkpoint detection (> 7 days) in CheckpointManager.isStale()
- [X] T009 [P] Implement checkpoint deletion in CheckpointManager.deleteCheckpoint()
- [X] T010 Add disk space check function (10MB minimum) to src/utils/disk-check.ts

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Persist Sync Progress (Priority: P1) 🎯 MVP

**Goal**: Implement checkpoint persistence after each page fetch with atomic writes and retry logic

**Independent Test**: Start sync, force-quit app, restart - verify checkpoint file exists with valid cursor and repository data. Sync should resume from checkpoint.

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T011 [P] [US1] Unit test for CheckpointManager.saveCheckpoint() atomic write pattern in tests/unit/sync/checkpoint-manager.test.ts
- [X] T012 [P] [US1] Unit test for CheckpointManager.loadCheckpoint() file reading in tests/unit/sync/checkpoint-manager.test.ts
- [X] T013 [P] [US1] Unit test for CheckpointManager.validateCheckpoint() lenient validation in tests/unit/sync/checkpoint-manager.test.ts
- [X] T014 [P] [US1] Unit test for CheckpointManager.isStale() 7-day detection in tests/unit/sync/checkpoint-manager.test.ts
- [X] T015 [P] [US1] Integration test for checkpoint persistence during sync interruption in tests/integration/sync-workflow.test.ts
- [X] T016 [P] [US1] Integration test for checkpoint creation on sync start in tests/integration/sync-workflow.test.ts
- [X] T017 [P] [US1] Unit test for exponential backoff retry (3 retries, 1s/2s/4s delays) in tests/unit/sync/github-client.test.ts
- [X] T018 [P] [US1] Unit test for retry with transient errors vs fatal errors in tests/unit/sync/github-client.test.ts

### Implementation for User Story 1

- [X] T019 [US1] Implement fetchTotalCount() method in GitHubGraphQLClient (src/sync/github-client.ts) to query total starred repos
- [X] T020 [US1] Implement fetchWithRetry() internal method in GitHubGraphQLClient (src/sync/github-client.ts) with exponential backoff
- [X] T021 [US1] Modify fetchStarredRepositories() in GitHubGraphQLClient (src/sync/github-client.ts) to wrap fetch with retry logic
- [X] T022 [US1] Add syncCheckpoint() private method to SyncService (src/sync/sync-service.ts) to save checkpoint after each page
- [X] T023 [US1] Modify sync() method in SyncService (src/sync/sync-service.ts) to fetch total count at start and create initial checkpoint
- [X] T024 [US1] Add updateCheckpoint() private method to SyncService (src/sync/sync-service.ts) to append repositories and update cursor
- [X] T025 [US1] Add convertIncremental() private method to SyncService (src/sync/sync-service.ts) to convert repos to final storage after each page
- [X] T026 [US1] Integrate checkpoint writes into page fetch loop in SyncService (src/sync/sync-service.ts)
- [X] T027 [US1] Add checkpoint deletion on sync completion in SyncService (src/sync/sync-service.ts)
- [X] T028 [US1] Add lifecycle logging (sync started, page fetched, checkpoint written, sync completed) to SyncService (src/sync/sync-service.ts)
- [X] T029 [US1] Add error logging without sensitive data (no tokens, no full payloads) to SyncService (src/sync/sync-service.ts)
- [X] T030 [US1] Implement disk space check before sync start in SyncService (src/sync/sync-service.ts)

**Checkpoint**: At this point, User Story 1 should be fully functional - checkpoint is created, updated, and deleted through sync lifecycle

---

## Phase 4: User Story 2 - Resume from Checkpoint (Priority: P2)

**Goal**: Enable users to resume interrupted syncs from checkpoint with confirmation dialog

**Independent Test**: Interrupt sync, start new sync - confirmation modal appears. Select "Resume" - sync continues from checkpoint cursor without re-fetching repos.

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T031 [P] [US2] Unit test for ResumeConfirmationModal UI rendering in tests/unit/ui/checkpoint-modal.test.ts
- [X] T032 [P] [US2] Unit test for "Resume" button callback in ResumeConfirmationModal in tests/unit/ui/checkpoint-modal.test.ts
- [X] T033 [P] [US2] Unit test for "Start fresh sync" button callback in ResumeConfirmationModal in tests/unit/ui/checkpoint-modal.test.ts
- [X] T034 [P] [US2] Integration test for resume flow with valid checkpoint in tests/integration/sync-workflow.test.ts
- [X] T035 [P] [US2] Integration test for fresh sync flow ignoring checkpoint in tests/integration/sync-workflow.test.ts
- [X] T036 [P] [US2] Integration test for invalid cursor handling in tests/integration/sync-workflow.test.ts
- [X] T037 [P] [US2] Unit test for missing optional fields warning in tests/unit/sync/checkpoint-manager.test.ts

### Implementation for User Story 2

- [X] T038 [US2] Create ResumeConfirmationModal component class in src/ui/checkpoint-modal.ts
- [X] T039 [US2] Implement modal UI with checkpoint metadata (creation date, repository count) in ResumeConfirmationModal (src/ui/checkpoint-modal.ts)
- [X] T040 [US2] Add "Resume from checkpoint" primary button (CTA style) in ResumeConfirmationModal (src/ui/checkpoint-modal.ts)
- [X] T041 [US2] Add "Start fresh sync" secondary button in ResumeConfirmationModal (src/ui/checkpoint-modal.ts)
- [X] T042 [US2] Add onResume and onFreshSync callback parameters to ResumeConfirmationModal constructor (src/ui/checkpoint-modal.ts)
- [X] T043 [US2] Add syncWithResume() private method to SyncService (src/sync/sync-service.ts) to check for existing checkpoint
- [X] T044 [US2] Add loadCheckpointIfExists() private method to SyncService (src/sync/sync-service.ts) to load and validate checkpoint
- [X] T045 [US2] Add showResumeConfirmation() private method to SyncService (src/sync/sync-service.ts) to display modal and await user choice
- [X] T046 [US2] Add syncFresh() private method to SyncService (src/sync/sync-service.ts) to delete checkpoint and start fresh sync
- [X] T047 [US2] Modify sync() method in SyncService (src/sync/sync-service.ts) to call syncWithResume() and handle resume/fresh paths
- [X] T048 [US2] Add invalid cursor error handling in SyncService (src/sync/sync-service.ts) to catch GraphQL cursor errors and offer fresh sync
- [X] T049 [US2] Add warning for missing optional fields in checkpoint validation (lenient approach with user notification) in SyncService (src/sync/sync-service.ts)
- [X] T050 [US2] Add concurrent sync prevention (check sync-in-progress status) in SyncService (src/sync/sync-service.ts)
- [X] T051 [US2] Add "sync resumed" logging event to SyncService (src/sync/sync-service.ts)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work - users can persist progress and resume from checkpoints

---

## Phase 5: User Story 3 - Progress Visibility & Management (Priority: P3)

**Goal**: Display real-time sync progress and provide checkpoint management UI in settings

**Independent Test**: Start sync - notice shows "Syncing: 50/150 (33%) - Resuming from checkpoint". Check settings tab shows checkpoint info with "Reset Checkpoint" button.

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T052 [P] [US3] Unit test for real-time progress display calculation in tests/unit/ui/sync-progress.test.ts
- [X] T053 [P] [US3] Unit test for checkpoint metadata display in settings tab in tests/unit/ui/settings-tab.test.ts
- [X] T054 [P] [US3] Unit test for "Reset Checkpoint" button action in tests/unit/ui/settings-tab.test.ts
- [X] T055 [P] [US3] Unit test for "force full sync" command handler in tests/unit/commands/sync-command.test.ts
- [X] T056 [P] [US3] Integration test for progress visibility during sync in tests/integration/sync-workflow.test.ts

### Implementation for User Story 3

- [X] T057 [US3] Modify SyncProgress component (src/ui/sync-progress.ts) to display fetched count, converted count, and percentage
- [X] T058 [US3] Add "Resuming from checkpoint" vs "Starting fresh sync" status indicator to SyncProgress (src/ui/sync-progress.ts)
- [X] T059 [US3] Add real-time progress updates to SyncService (src/sync/sync-service.ts) after each page fetch
- [X] T060 [US3] Pass checkpoint info (fetchedCount, totalCount, isResuming) to SyncProgress component from SyncService (src/sync/sync-service.ts)
- [X] T061 [US3] Add "Reset Checkpoint" button to settings tab in SettingsTab (src/ui/settings-tab.ts)
- [X] T062 [US3] Add checkpoint metadata display (creation date, repository count, age) to settings tab in SettingsTab (src/ui/settings-tab.ts)
- [X] T063 [US3] Implement resetCheckpoint() action handler in SettingsTab (src/ui/settings-tab.ts) to delete checkpoint and show confirmation
- [X] T064 [US3] Add "force full sync" command registration in main.ts (src/main.ts) with command ID "force-full-sync"
- [X] T065 [US3] Implement force-full-sync command handler in commands/sync-command.ts (src/commands/sync-command.ts) to skip confirmation and delete checkpoint
- [X] T066 [US3] Modify sync() method in SyncService (src/sync/sync-service.ts) to accept options parameter with { force: boolean } flag
- [X] T067 [US3] Add stale checkpoint warning (> 7 days old) to resume confirmation modal in SyncService (src/sync/sync-service.ts)

**Checkpoint**: All user stories should now be independently functional - complete sync progress tracking with resume capability

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, documentation, and quality assurance

- [ ] T068 [P] Verify all checkpoint file operations complete in < 500ms (SC-010) - measure and optimize if needed
- [ ] T069 [P] Verify memory usage remains constant during sync (SC-011) - profile with large checkpoints
- [ ] T070 [P] Verify resume operation starts within 10 seconds (SC-001) - measure and optimize if needed
- [ ] T071 [P] Run all quickstart.md scenarios and verify pass/fail
- [ ] T072 [P] Add inline comments explaining retry logic exponential backoff in GitHubGraphQLClient (src/sync/github-client.ts)
- [ ] T073 [P] Add inline comments explaining atomic write pattern in CheckpointManager (src/sync/checkpoint-manager.ts)
- [ ] T074 [P] Ensure all functions are < 50 lines per constitution - split if needed
- [ ] T075 [P] Ensure all files are < 300 lines per constitution - split if needed
- [ ] T076 [P] Verify no `any` types without justification - run TypeScript strict mode check
- [ ] T077 [P] Run ESLint and fix all linting errors
- [ ] T078 Run full test suite and ensure 100% pass rate
- [ ] T079 Manually test in Obsidian desktop environment (smoke test)
- [ ] T080 Verify no sensitive data logged (check logs for tokens, full payloads)
- [ ] T081 Verify checkpoint file location is within plugin data directory (security validation)
- [ ] T082 Update README.md with checkpoint/resume feature documentation

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T003) - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational (T004-T010) completion
  - User stories can proceed sequentially: US1 (P1) → US2 (P2) → US3 (P3)
  - Or in parallel (if staffed) after Foundational completes
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (T004-T010) - No dependencies on other stories
- **User Story 2 (P2)**: Depends on User Story 1 (T019-T030) - Builds on checkpoint infrastructure from US1
- **User Story 3 (P3)**: Depends on User Story 2 (T038-T051) - Builds on resume functionality from US2

### Within Each User Story

1. **Tests (T011-T018 for US1, T031-T037 for US2, T052-T056 for US3)**: MUST be written and FAIL before implementation
2. **Implementation**: Follow task order (each task depends on previous within story)
3. **Integration**: Tasks integrate with previously completed stories
4. **Story Complete**: Move to next story only after current story passes all tests

### Parallel Opportunities

**Within Setup Phase**:
- T001 and T003 can run in parallel (different files)

**Within Foundational Phase**:
- T005, T006, T008, T009 can run in parallel (different methods in CheckpointManager)
- T010 can run in parallel with CheckpointManager tasks (different file)

**Within User Story 1 Tests**:
- T011-T018 can all run in parallel (different test files and test cases)

**Within User Story 1 Implementation**:
- T019 and T020 can run in parallel (different methods in GitHubGraphQLClient)
- T022-T024 can run in parallel (different private methods in SyncService)

**Within User Story 2 Tests**:
- T031-T037 can all run in parallel (different test files and test cases)

**Within User Story 2 Implementation**:
- T038-T042 can run sequentially (building ResumeConfirmationModal component)
- T043-T046 can run in parallel (different private methods in SyncService)

**Within User Story 3 Tests**:
- T052-T056 can all run in parallel (different test files and test cases)

**Within User Story 3 Implementation**:
- T057-T060 can run sequentially (SyncProgress modifications)
- T061-T063 can run sequentially (settings tab modifications)
- T064-T065 can run in parallel (different command/registration files)

**Within Polish Phase**:
- T068-T077 can all run in parallel (different validation tasks)
- T078-T082 run sequentially (build → test → validate → document)

---

## Parallel Example: User Story 1 Implementation

```bash
# After tests (T011-T018) are written and failing:

# Launch parallel tasks for GitHubGraphQLClient modifications:
Task T019: "Implement fetchTotalCount() method in GitHubGraphQLClient"
Task T020: "Implement fetchWithRetry() internal method in GitHubGraphQLClient"

# After T020 completes, continue with:
Task T021: "Modify fetchStarredRepositories() to use retry logic"

# In parallel with T021, start SyncService checkpoint methods:
Task T022: "Add syncCheckpoint() private method to SyncService"
Task T023: "Modify sync() method to fetch total count"
Task T024: "Add updateCheckpoint() private method"
Task T025: "Add convertIncremental() private method"

# After core methods complete, integrate:
Task T026: "Integrate checkpoint writes into page fetch loop"
# ... and so on
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T010) - **CRITICAL**
3. Complete Phase 3: User Story 1 (T011-T030)
4. **STOP and VALIDATE**: Test checkpoint persistence independently
   - Start sync, interrupt, verify checkpoint file exists
   - Restart, verify checkpoint can be loaded
   - Verify atomic write pattern prevents corruption
5. Deploy/demo if ready - **MVP delivers value immediately**

### Incremental Delivery

1. **MVP (US1)**: Complete Setup → Foundational → US1 → Test → Deploy
   - Users get checkpoint persistence and protection against data loss

2. **Add Resume Capability (US2)**: Complete US2 → Test → Deploy
   - Users can resume interrupted syncs without re-downloading

3. **Add Progress Visibility (US3)**: Complete US3 → Test → Deploy
   - Users see real-time progress and can manage checkpoints

4. **Polish**: Complete Phase 6 → Final validation → Release
   - Performance optimization, documentation, quality assurance

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers (after Foundational phase completes):

1. **Team completes Setup + Foundational together** (T001-T010)

2. **Once Foundational is done, stories can proceed in parallel**:
   - **Developer A**: User Story 1 (T011-T030) - Core persistence
   - **Developer B**: User Story 2 (T031-T051) - Resume capability (waits for T019-T030)
   - **Developer C**: User Story 3 (T052-T067) - Progress UI (waits for T038-T051)

3. **Recommended approach**: Sequential delivery (US1 → US2 → US3) due to story dependencies
   - Faster time-to-MVP
   - Less integration complexity
   - Story 2 depends on Story 1 checkpoint infrastructure
   - Story 3 depends on Story 2 resume functionality

---

## Notes

- **TDD is mandatory** per constitution (Principle II): Write tests FIRST, ensure they FAIL, then implement
- **[P] tasks** = different files or independent methods, can run in parallel
- **[Story] label** maps task to specific user story for traceability
- Each user story should be **independently completable and testable**
- **Verify tests fail before implementing** - this is critical for TDD
- Commit after each task or logical group (e.g., all tests for a story)
- **Stop at any checkpoint** to validate story independently before proceeding
- **Avoid**: vague tasks, same file conflicts, cross-story dependencies that break independence
- **Follow constitution**: TypeScript strict mode, ESLint, no `any` types, functions < 50 lines, files < 300 lines

---

## Success Criteria Verification

After completing all tasks, verify all success criteria from spec.md:

- [ ] **SC-001**: Resume starts within 10 seconds ✅
- [ ] **SC-002**: Zero duplicate fetches when resuming ✅
- [ ] **SC-003**: Checkpoint updated after each page ✅
- [ ] **SC-004**: Progress updates < 2 second delay ✅
- [ ] **SC-005**: Complete sync with 3 interruptions ✅
- [ ] **SC-006**: Corrupted checkpoint detected 100% ✅
- [ ] **SC-007**: Force full sync ignores checkpoint ✅
- [ ] **SC-008**: Reset checkpoint completes in < 2 seconds ✅
- [ ] **SC-009**: Stale checkpoint (> 7 days) warning shown ✅
- [ ] **SC-010**: Checkpoint operations < 500ms ✅
- [ ] **SC-011**: Memory usage constant (streaming writes) ✅
- [ ] **SC-012**: Check succeeds with 10MB available ✅

---

## Task Summary

- **Total Tasks**: 82
- **Setup Phase**: 3 tasks
- **Foundational Phase**: 7 tasks (BLOCKS all user stories)
- **User Story 1 (P1)**: 20 tasks (8 tests + 12 implementation) - **MVP**
- **User Story 2 (P2)**: 21 tasks (7 tests + 14 implementation)
- **User Story 3 (P3)**: 16 tasks (5 tests + 11 implementation)
- **Polish Phase**: 15 tasks

**Parallel Opportunities**: 35 tasks marked [P] can run in parallel within their phases

**Suggested MVP Scope**: Phases 1-3 (Tasks T001-T030) - Complete checkpoint persistence capability
