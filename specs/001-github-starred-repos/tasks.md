# Tasks: GitHub Starred Repositories Manager

**Input**: Design documents from `/specs/001-github-starred-repos/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/github-graphql.graphql, research.md, quickstart.md

**Tests**: Test tasks are included as TDD is required by the project constitution (Principle II: Testing Standards)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Completion Status

✅ **Phase 1: Setup** - 8/8 tasks complete (100%)
✅ **Phase 2: Foundational** - 10/10 tasks complete (100%)
✅ **Phase 3: User Story 1 (Sync)** - 19/19 tasks complete (100%) 🎯 MVP COMPLETE
❌ **Phase 4: User Story 2 (Browse/Filter)** - 0/11 tasks complete (0%)
❌ **Phase 5: User Story 3 (Notes)** - 0/10 tasks complete (0%)
❌ **Phase 6: User Story 4 (Tags)** - 0/10 tasks complete (0%)
❌ **Phase 7: User Story 5 (Batch Un-Star)** - 0/11 tasks complete (0%)
🔄 **Phase 8: Polish** - 3/20 tasks complete (15%)

**Overall Progress**: 37/99 tasks complete (37%)

**Current Status**: MVP (User Story 1) is fully implemented and passing all tests! ✅
- All 83 tests passing
- Sync functionality working
- Settings UI implemented
- Progress tracking implemented
- Documentation started (README.md created)

**Next Steps**:
1. Fix ESLint errors (T094) - 94 issues to resolve
2. Create CHANGELOG.md (T081)
3. Begin User Story 2 (Browse and Filter Repositories) or address polish items

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [x] T001 Create project directory structure: src/, tests/unit/, tests/integration/, tests/contract/
- [x] T002 Initialize package.json with TypeScript 5.3+, Obsidian API, esbuild, Vitest, ESLint dependencies
- [x] T003 [P] Create tsconfig.json with strict mode enabled per TypeScript 5.3+ standards
- [x] T004 [P] Create esbuild.config.mjs for bundling Obsidian plugin
- [x] T005 [P] Create vitest.config.ts with test coverage thresholds (80%)
- [x] T006 [P] Create eslint.config.mts with TypeScript plugin
- [x] T007 [P] Create manifest.json for Obsidian plugin with metadata
- [x] T008 Create .gitignore for node_modules/, main.js, .obsidian/

**Checkpoint**: ✅ Project infrastructure ready for development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Core Types and Utilities

- [x] T009 [P] Create TypeScript interfaces for core entities in src/types.ts (Repository, Tag, RepositoryNote, LinkedResource, PluginSettings, SyncState)
- [x] T010 [P] Implement URL validation utility in src/utils/url-validator.ts with isValidUrl() function
- [x] T011 [P] Create constants file in src/utils/constants.ts with magic numbers and API endpoints
- [x] T012 [P] Implement date formatting utility in src/utils/date-utils.ts with formatDate() and compareDates() functions

### Data Model Tests

- [x] T013 [P] Write unit tests for URL validator in tests/unit/utils/url-validator.test.ts
- [x] T014 [P] Write unit tests for date utilities in tests/unit/utils/date-utils.test.ts

### Storage Layer Foundation

- [x] T015 Implement settings store in src/storage/settings-store.ts with loadSettings() and saveSettings() using Obsidian data API
- [x] T016 [P] Write unit tests for settings store in tests/unit/storage/settings-store.test.ts with mocking

### Base Plugin Structure

- [x] T017 Create main.ts plugin entry point with Plugin class, onload(), onunload(), and basic command registration skeleton
- [x] T018 [P] Write integration test for plugin loading in tests/integration/plugin-lifecycle.test.ts

**Checkpoint**: ✅ Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Sync Starred Repositories (Priority: P1) 🎯 MVP

**Goal**: Enable users to import all their GitHub starred repositories with metadata and README files

**Independent Test**: Configure GitHub token, trigger sync, verify repositories appear with metadata and READMEs

### Tests for User Story 1 ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T019 [P] [US1] Write contract test for GitHub GraphQL API in tests/contract/github-api.test.ts verifying query structure and response types
- [x] T020 [P] [US1] Write integration test for sync workflow in tests/integration/sync-workflow.test.ts covering full sync, incremental sync, error handling
- [x] T021 [P] [US1] Write unit tests for rate limiter in tests/unit/sync/rate-limiter.test.ts with backoff logic
- [x] T022 [P] [US1] Write unit tests for GitHub client in tests/unit/sync/github-client.test.ts with mocked API responses
- [x] T023 [P] [US1] Write unit tests for sync service in tests/unit/sync/sync-service.test.ts with mock data
- [x] T024 [P] [US1] Write unit tests for repository store in tests/unit/storage/repository-store.test.ts

### Implementation for User Story 1

#### GitHub API Client Layer

- [x] T025 [P] [US1] Implement rate limiter in src/sync/rate-limiter.ts with shouldThrottle(), waitForReset(), trackQuery() functions
- [x] T026 [P] [US1] Create GitHub GraphQL client in src/sync/github-client.ts with fetchStarredRepositories(), unstarRepository(), getRepositoryById() methods
- [x] T027 [US1] Create GraphQL query definitions in src/sync/graphql-queries.ts (GetStarredRepositories, UnstarRepository, GetRepositoryById)

#### Storage Layer

- [x] T028 [P] [US1] Implement repository store in src/storage/repository-store.ts with loadRepositories(), saveRepositories(), getRepositoryById(), updateRepository() methods
- [x] T029 [P] [US1] Create sync state manager in src/storage/sync-state-store.ts with loadSyncState(), saveSyncState(), updateProgress() methods

#### Sync Service

- [x] T030 [US1] Implement sync service in src/sync/sync-service.ts with performInitialSync(), performIncrementalSync(), handleRateLimit(), transformGitHubResponse() methods
- [x] T031 [US1] Implement incremental sync logic in src/sync/sync-service.ts with compareUpdatedDates(), detectNewRepos(), detectDeletedRepos() functions

#### Commands and UI

- [x] T032 [P] [US1] Create sync command handler in src/commands/sync-command.ts with command registration and error Notice display
- [x] T033 [US1] Create settings tab UI in src/ui/settings-tab.ts with GitHub token input field and save functionality
- [x] T034 [US1] Wire sync command to plugin in src/main.ts with addCommand() registration

#### Error Handling and Progress

- [x] T035 [US1] Add authentication error handling in src/sync/sync-service.ts with user-friendly Notice messages
- [x] T036 [US1] Add rate limit error handling in src/sync/sync-service.ts with exponential backoff and progress display
- [x] T037 [US1] Add sync progress indicator in src/ui/sync-progress.ts with status updates to user

**Checkpoint**: ✅ At this point, User Story 1 should be fully functional and testable independently. Users can sync their starred repositories.

---

## Phase 4: User Story 2 - Browse and Filter Repositories (Priority: P2)

**Goal**: Enable users to view, search, and filter their imported repositories

**Independent Test**: Import repositories, open repository view, verify list displays and filters work

### Tests for User Story 2 ⚠️

- [ ] T038 [P] [US2] Write unit tests for search filter utility in tests/unit/utils/search-filter.test.ts
- [ ] T039 [P] [US2] Write unit tests for repository view component in tests/unit/ui/repository-view.test.ts with mock data
- [ ] T040 [P] [US2] Write integration test for browse and filter workflow in tests/integration/browse-filter.test.ts

### Implementation for User Story 2

#### Search and Filter Logic

- [ ] T041 [P] [US2] Implement search filter utility in src/utils/search-filter.ts with filterBySearchTerm(), filterByTags(), filterByLanguage(), combineFilters() functions
- [ ] T042 [US2] Add search indexing in src/utils/search-filter.ts with buildSearchIndex() for performance optimization

#### UI Components

- [ ] T043 [P] [US2] Create repository list view component in src/ui/repository-view.ts with renderRepositoryList(), displayRepositoryMetadata() methods
- [ ] T044 [P] [US2] Create repository detail view component in src/ui/repository-detail.ts with renderReadme(), displayMetadata() methods
- [ ] T045 [US2] Create filter UI component in src/ui/filter-panel.ts with tag filter dropdown, language filter dropdown, search input field
- [ ] T046 [US2] Implement debounced search input in src/ui/filter-panel.ts with 300ms delay to avoid excessive re-filtering

#### Commands

- [ ] T047 [US2] Create open repository view command in src/commands/open-view-command.ts with command registration
- [ ] T048 [US2] Wire open view command to plugin in src/main.ts with addCommand() registration

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Users can sync and browse repositories.

---

## Phase 5: User Story 3 - Add Notes and Link Resources to Repositories (Priority: P3)

**Goal**: Enable users to write personal notes and link external resources (e.g., Google Code Wiki) to repositories

**Independent Test**: Select repository, add notes with linked resources, save, verify notes and links persist

### Tests for User Story 3 ⚠️

- [ ] T049 [P] [US3] Write unit tests for note store in tests/unit/storage/note-store.test.ts
- [ ] T050 [P] [US3] Write unit tests for notes panel UI in tests/unit/ui/notes-panel.test.ts
- [ ] T051 [P] [US3] Write integration test for notes and linked resources in tests/integration/notes-tags.test.ts

### Implementation for User Story 3

#### Storage Layer

- [ ] T052 [P] [US3] Implement note store in src/storage/note-store.ts with loadNote(), saveNote(), deleteNote() methods using markdown files
- [ ] T053 [P] [US3] Add linked resource validation in src/storage/note-store.ts with validateLinkedResource() function using URL validator

#### UI Components

- [ ] T054 [P] [US3] Create notes panel component in src/ui/notes-panel.ts with renderNoteEditor(), loadNote(), saveNote(), displayLinkedResources() methods
- [ ] T055 [US3] Implement linked resource management UI in src/ui/notes-panel.ts with addResourceLink(), removeResourceLink(), renderClickableLinks() functions
- [ ] T056 [US3] Add markdown preview support in src/ui/notes-panel.ts with renderMarkdownPreview() method

#### Integration

- [ ] T057 [US3] Wire notes panel to repository detail view in src/ui/repository-detail.ts with openNotesPanel() method
- [ ] T058 [US3] Add note persistence on edit in src/ui/notes-panel.ts with auto-save or manual save button

**Checkpoint**: All user stories 1-3 should now be independently functional. Users can sync, browse, and annotate repositories.

---

## Phase 6: User Story 4 - Tag Repositories for Categorization (Priority: P4)

**Goal**: Enable users to organize repositories using custom tags

**Independent Test**: Create tags, apply to repositories, filter by tags to verify organization system

### Tests for User Story 4 ⚠️

- [ ] T059 [P] [US4] Write unit tests for tag store in tests/unit/storage/tag-store.test.ts
- [ ] T060 [P] [US4] Write unit tests for tag manager UI in tests/unit/ui/tag-manager.test.ts
- [ ] T061 [P] [US4] Write integration test for tag operations in tests/integration/tags.test.ts

### Implementation for User Story 4

#### Storage Layer

- [ ] T062 [P] [US4] Implement tag store in src/storage/tag-store.ts with loadTags(), saveTags(), createTag(), deleteTag(), getTagByName() methods
- [ ] T063 [P] [US4] Add tag-repository association logic in src/storage/tag-store.ts with applyTagToRepository(), removeTagFromRepository(), getRepositoriesByTag() functions

#### UI Components

- [ ] T064 [P] [US4] Create tag manager component in src/ui/tag-manager.ts with renderTagList(), createTag(), deleteTag(), renderTagCreationForm() methods
- [ ] T065 [US4] Implement tag assignment UI in src/ui/repository-view.ts with showTagSelector(), applySelectedTags(), displayAppliedTags() functions
- [ ] T066 [US4] Add tag color picker in src/ui/tag-manager.ts with renderColorPicker(), validateColorHex() functions

#### Integration

- [ ] T067 [US4] Update filter panel to support tag filtering in src/ui/filter-panel.ts with showTagFilter(), filterBySelectedTags() methods
- [ ] T068 [US4] Wire tag management to repository view in src/ui/repository-view.ts with openTagManager() method

**Checkpoint**: User Stories 1-4 complete. Users have full repository organization capabilities.

---

## Phase 7: User Story 5 - Batch Un-Star Repositories (Priority: P5)

**Goal**: Enable users to remove GitHub stars from multiple repositories at once

**Independent Test**: Select multiple repositories, execute batch un-star, verify stars removed on GitHub

### Tests for User Story 5 ⚠️

- [ ] T069 [P] [US5] Write unit tests for batch un-star command in tests/unit/commands/batch-unstar-command.test.ts
- [ ] T070 [P] [US5] Write integration test for batch un-star workflow in tests/integration/batch-operations.test.ts with mocked GitHub API

### Implementation for User Story 5

#### Batch Operation Logic

- [ ] T071 [US5] Implement batch un-star service in src/sync/batch-unstar-service.ts with unstarRepositories(), trackProgress(), handlePartialFailures() methods
- [ ] T072 [US5] Add concurrent request limiting in src/sync/batch-unstar-service.ts with executeParallelUnstars() function (max 10 concurrent)

#### UI Components

- [ ] T073 [P] [US5] Add multi-select UI to repository view in src/ui/repository-view.ts with toggleSelection(), selectAll(), deselectAll(), getSelectedRepositories() methods
- [ ] T074 [P] [US5] Create batch action confirmation modal in src/ui/batch-confirm-modal.ts with renderConfirmation(), showKeepLocalOption(), executeBatchOperation() methods
- [ ] T075 [US5] Add batch un-star progress display in src/ui/batch-progress.ts with renderProgress(), displayCompletedCount(), showFailedItems() functions

#### Commands

- [ ] T076 [US5] Create batch un-star command in src/commands/batch-unstar-command.ts with command registration and validation
- [ ] T077 [US5] Wire batch un-star command to plugin in src/main.ts with addCommand() registration

#### Local Data Handling

- [ ] T078 [US5] Implement local copy retention logic in src/storage/repository-store.ts with markAsUnstarred(), keepLocalCopy(), deleteLocalCopy() methods
- [ ] T079 [US5] Add un-starred repository filtering in src/ui/repository-view.ts with showUnstarredRepos(), hideUnstarredRepos() options

**Checkpoint**: All user stories complete. Users have full repository lifecycle management.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

### Documentation

- [x] T080 [P] Create README.md with installation, configuration, and usage instructions
- [ ] T081 [P] Create CHANGELOG.md with version history and feature descriptions
- [x] T082 [P] Add inline code documentation (JSDoc comments) to public APIs in src/

### Performance Optimization

- [ ] T083 Add repository caching layer in src/utils/repository-cache.ts with LRU eviction for maxRepositoryCacheSize
- [ ] T084 Optimize large README rendering in src/ui/repository-detail.ts with lazy loading or truncation
- [ ] T085 Add virtual scrolling for repository list in src/ui/repository-view.ts if performance degrades with 500+ repos

### Error Handling Improvements

- [ ] T086 Add comprehensive error logging in src/utils/error-handler.ts with logError(), getUserFriendlyMessage() functions
- [ ] T087 Add network interruption recovery in src/sync/sync-service.ts with retryOnNetworkError(), resumeIncompleteSync() methods

### Security Hardening

- [ ] T088 Add GitHub token validation in src/utils/token-validator.ts with validateTokenFormat(), testTokenAuth() functions
- [ ] T089 Implement secure token storage verification in src/storage/settings-store.ts with encryption check

### Mobile Compatibility

- [ ] T090 Test and optimize UI for mobile in src/ui/ with responsive CSS and touch-friendly targets (minimum 44px)
- [ ] T091 Disable desktop-specific features on mobile in src/main.ts with platform detection

### Testing Enhancements

- [ ] T092 [P] Add additional unit tests for edge cases in tests/unit/ for error scenarios
- [ ] T093 Run test suite and verify 80% coverage threshold met
- [ ] T094 Run ESLint and fix all warnings
- [ ] T095 Test plugin in Obsidian Desktop with quickstart.md scenarios

### Release Preparation

- [ ] T096 Verify all constitution principles followed (code quality, TDD, UX consistency, readability, modularity, security)
- [ ] T097 Run full test suite: npm test && npm run lint
- [ ] T098 Create production build: npm run build
- [ ] T099 Verify plugin loads and all features work in clean Obsidian vault

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4 → P5)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Sync**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2) - Browse/Filter**: Can start after Foundational (Phase 2) - Independent of US1 but enhances it
- **User Story 3 (P3) - Notes/Resources**: Can start after Foundational (Phase 2) - Independent but builds on US1 data
- **User Story 4 (P4) - Tags**: Can start after Foundational (Phase 2) - Independent but integrates with US2 filtering
- **User Story 5 (P5) - Batch Un-Star**: Can start after Foundational (Phase 2) - Depends on US1 for repositories, uses US2 multi-select UI

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach per constitution)
- Models/storage before services
- Services before UI
- UI before commands
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: T003, T004, T005, T006, T007 can run in parallel
- **Phase 2 (Foundational)**: T009, T010, T011, T012, T013, T014 can run in parallel (T015 after T009)
- **Phase 3 (US1)**: All tests T019-T024 can run in parallel; then T025, T026 (models) parallel; T028, T029 (storage) parallel; T032, T033 (UI) parallel
- **Phase 4 (US2)**: T038-T040 (tests) parallel; T043, T044 (UI components) parallel
- **Phase 5 (US3)**: T049-T051 (tests) parallel; T052, T053 (storage) parallel; T054, T055 (UI) parallel
- **Phase 6 (US4)**: T059-T061 (tests) parallel; T062, T063 (storage) parallel; T064, T065 (UI) parallel
- **Phase 7 (US5)**: T069, T070 (tests) parallel; T073, T074 (UI) parallel
- **Phase 8 (Polish)**: T080, T081, T082, T092 can run in parallel

---

## Parallel Example: User Story 1 (Sync - MVP)

```bash
# Launch all tests for User Story 1 together (TDD - write these FIRST):
Task: "T019 [P] [US1] Write contract test for GitHub GraphQL API in tests/contract/github-api.test.ts"
Task: "T020 [P] [US1] Write integration test for sync workflow in tests/integration/sync-workflow.test.ts"
Task: "T021 [P] [US1] Write unit tests for rate limiter in tests/unit/sync/rate-limiter.test.ts"
Task: "T022 [P] [US1] Write unit tests for GitHub client in tests/unit/sync/github-client.test.ts"
Task: "T023 [P] [US1] Write unit tests for sync service in tests/unit/sync/sync-service.test.ts"
Task: "T024 [P] [US1] Write unit tests for repository store in tests/unit/storage/repository-store.test.ts"

# After tests fail (as expected), launch model/service implementations in parallel:
Task: "T025 [P] [US1] Implement rate limiter in src/sync/rate-limiter.ts"
Task: "T026 [P] [US1] Create GitHub GraphQL client in src/sync/github-client.ts"

# Launch storage implementations in parallel:
Task: "T028 [P] [US1] Implement repository store in src/storage/repository-store.ts"
Task: "T029 [P] [US1] Create sync state manager in src/storage/sync-state-store.ts"

# Launch UI components in parallel:
Task: "T032 [P] [US1] Create sync command handler in src/commands/sync-command.ts"
Task: "T033 [US1] Create settings tab UI in src/ui/settings-tab.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only - Recommended for Initial Release)

1. Complete Phase 1: Setup (T001-T008)
2. Complete Phase 2: Foundational (T009-T018) - CRITICAL foundation
3. Complete Phase 3: User Story 1 - Sync (T019-T037)
4. **STOP and VALIDATE**: Test User Story 1 independently with real GitHub token
5. Run quickstart.md validation scenarios
6. Deploy/demo MVP (users can sync and view their starred repos)

**MVP Value**: Users immediately get value - local copy of GitHub stars with metadata and READMEs

### Incremental Delivery (Recommended Approach)

1. **Foundation** (Phase 1 + 2): Setup + Foundational infrastructure
2. **MVP Release** (Phase 3): User Story 1 - Sync → Test independently → Deploy/Demo
3. **Enhancement 1** (Phase 4): User Story 2 - Browse/Filter → Test → Deploy/Demo
4. **Enhancement 2** (Phase 5): User Story 3 - Notes/Resources → Test → Deploy/Demo
5. **Enhancement 3** (Phase 6): User Story 4 - Tags → Test → Deploy/Demo
6. **Enhancement 4** (Phase 7): User Story 5 - Batch Un-Star → Test → Deploy/Demo
7. **Polish** (Phase 8): Cross-cutting improvements → Final Release

Each story adds value without breaking previous features.

### Parallel Team Strategy

With multiple developers (if applicable):

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (Sync) - Critical path
   - Developer B: User Story 2 (Browse/Filter) - Can integrate with US1
   - Developer C: User Story 3 (Notes) - Independent feature
3. Stories complete and integrate independently
4. Developer D: User Stories 4-5 after foundation validated

---

## Task Summary

- **Total Tasks**: 99
- **Setup Phase**: 8 tasks
- **Foundational Phase**: 10 tasks (BLOCKS all user stories)
- **User Story 1 (P1 - MVP)**: 19 tasks (6 tests + 13 implementation)
- **User Story 2 (P2)**: 11 tasks (3 tests + 8 implementation)
- **User Story 3 (P3)**: 10 tasks (3 tests + 7 implementation)
- **User Story 4 (P4)**: 10 tasks (3 tests + 7 implementation)
- **User Story 5 (P5)**: 11 tasks (2 tests + 9 implementation)
- **Polish Phase**: 20 tasks

**Parallel Opportunities Identified**: 40+ tasks marked with [P] can be parallelized within phases

**Independent Test Criteria**:
- US1: Configure token → Sync → Verify repos with metadata appear locally
- US2: Import repos → Open view → Search and filter functionality works
- US3: Select repo → Add notes with links → Verify persistence
- US4: Create tags → Apply to repos → Filter by tags works
- US5: Select repos → Batch un-star → Verify stars removed on GitHub

**Suggested MVP Scope**: Phase 1 + 2 + 3 (Tasks T001-T037) = 37 tasks
- Delivers core sync functionality
- Enables users to import and browse starred repositories
- Foundation for all future enhancements
- Testable and valuable on its own

---

## Notes

- [P] tasks = different files, no dependencies, safe to parallelize
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- TDD approach: Tests written FIRST, verified to FAIL, then implementation
- Follow constitution principles: code quality, testing standards, UX consistency, readability, modularity, security
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Run `npm test && npm run lint` before commits
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
