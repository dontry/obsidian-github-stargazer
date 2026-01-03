# Feature Specification: Sync Progress Tracking & Resume

**Feature Branch**: `003-sync-progress-resume`
**Created**: 2025-01-02
**Status**: Draft
**Input**: User description: "I want to create a new feature to track the syncing progress. So I want to persist this progress to a json file which is downloading which is storing all the repository metadata return from the response. Of the response if it fails if a sinking prosperous well it can resume from the last checkpoint by using the graphql cursor"

## Clarifications

### Session 2025-01-02

- Q: When a user with an existing checkpoint starts a new sync, what should the default behavior be? → A: Prompt the user with a confirmation dialog showing "Resume from checkpoint" as the default/primary action, with options to resume or start fresh sync
- Q: What should the system do if the checkpoint file passes JSON validation but is missing required fields (e.g., cursor is null, repositories array is empty but timestamp shows it's in-progress)? → A: Lenient validation with user warning - allow resumption if cursor exists and repositories array is present, even if some optional fields are missing, but warn user about potential issues
- Q: When should the checkpoint file be considered "complete" and trigger conversion to final repository storage? → A: Fetch total repository count at sync start, convert checkpoint incrementally after each page, mark sync complete when fetched count reaches total count
- Q: What level of logging and debugging information should the system provide for sync operations? → A: Standard logging - log sync lifecycle events (start, resume, complete, error), page fetch progress, checkpoint write operations, and errors; no sensitive data (tokens, full repository payloads) logged; logs accessible in Obsidian developer console
- Q: What should the system do when a page fetch fails due to a transient error (network timeout, rate limit, temporary server error)? → A: Retry with exponential backoff - automatically retry up to 3 times with increasing delays (1s, 2s, 4s), show user "Retrying..." status, fail after max retries

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Persist Sync Progress (Priority: P1)

As a user syncing my GitHub starred repositories, I want the system to track and save the sync progress continuously so that if the sync process is interrupted (network failure, app crash, etc.), I don't lose the work already completed.

**Why this priority**: This is the foundation for the resume capability. Without persisted progress, there's nothing to resume from. This delivers immediate value by protecting users against data loss during long-running sync operations.

**Independent Test**: Can be tested by starting a sync, interrupting it (e.g., force-quitting the app during sync), and verifying that progress checkpoint file exists with valid repository metadata and cursor information.

**Acceptance Scenarios**:

1. **Given** a user starts syncing their starred repositories, **When** the system starts, **Then** it fetches the total count of starred repositories first
2. **Given** the system knows the total repository count, **When** it successfully fetches each page of results, **Then** it appends new repository metadata to a checkpoint JSON file, converts to final storage incrementally, and updates the stored cursor position
3. **Given** a sync is in progress, **When** the app crashes or the process is killed, **Then** the checkpoint JSON file contains all repositories fetched up to that point with the last valid GraphQL cursor
4. **Given** a checkpoint file exists from a previous sync, **When** a new sync starts, **Then** the system reads the checkpoint file and accesses the stored cursor and repository data
5. **Given** the checkpoint file is being written, **When** a write operation fails, **Then** the system preserves the previous checkpoint version and reports an error to the user
6. **Given** a page fetch operation fails due to a transient error, **When** the error occurs, **Then** the system automatically retries up to 3 times with exponential backoff (1s, 2s, 4s) and shows "Retrying..." status to user
7. **Given** the number of fetched repositories reaches the total count, **When** the system detects completion, **Then** it marks the sync as completed, removes the checkpoint file, and displays success message to user

---

### User Story 2 - Resume from Checkpoint (Priority: P2)

As a user whose sync was interrupted, I want the system to automatically resume from where it left off so that I don't have to re-download repositories I already synced.

**Why this priority**: This delivers the core user value - efficient recovery from failures. Once progress is persisted (User Story 1), resuming is the natural next step that provides significant time savings for users with many starred repositories.

**Independent Test**: Can be tested by interrupting a sync, then starting a new sync and verifying that it resumes from the last checkpoint, skips already-synced repositories, and continues fetching new ones.

**Acceptance Scenarios**:

1. **Given** a checkpoint file exists with 50 repositories and a valid cursor, **When** the user starts a new sync, **Then** the system displays a confirmation dialog with "Resume from checkpoint" as the primary action and an option to "Start fresh sync"
2. **Given** the confirmation dialog is shown, **When** the user selects "Resume from checkpoint", **Then** the system resumes from the stored cursor and does not re-fetch the first 50 repositories
3. **Given** the confirmation dialog is shown, **When** the user selects "Start fresh sync", **Then** the system ignores the checkpoint and starts syncing from the beginning
4. **Given** a sync is resumed from a checkpoint, **When** fetching new repositories, **Then** the system continues appending to the existing checkpoint file
5. **Given** a checkpoint file exists but the stored cursor is invalid/expired, **When** the user attempts to sync, **Then** the system detects the invalid cursor and offers to start a fresh sync (does not automatically resume)
6. **Given** a checkpoint file has cursor and repositories but is missing optional fields (timestamp, sync status), **When** the user attempts to sync, **Then** the system allows resumption but displays a warning about missing metadata
7. **Given** a resumed sync completes successfully, **When** the sync finishes, **Then** the checkpoint file contains all repositories from both the previous partial sync and the resumed sync
8. **Given** a sync is resumed, **When** the sync completes successfully, **Then** the checkpoint is converted to the final repository storage and the temporary checkpoint file is removed

---

### User Story 3 - Progress Visibility & Management (Priority: P3)

As a user monitoring a sync operation, I want to see the current progress and have control over checkpoints so that I can understand what's happening and reset if needed.

**Why this priority**: This enhances the user experience by providing transparency and control. While not critical for basic functionality, it prevents user confusion and provides management capabilities for power users.

**Independent Test**: Can be tested by starting a sync and observing progress indicators, and by using a command/action to reset the checkpoint and verify that subsequent sync starts from the beginning.

**Acceptance Scenarios**:

1. **Given** a user is viewing the sync progress, **When** repositories are being fetched, **Then** the system displays the number of repositories synced and the percentage complete (if total is known)
2. **Given** a user is syncing and has existing checkpoints, **When** the sync starts, **Then** the system shows whether it's starting fresh or resuming from a checkpoint
3. **Given** a user wants to start a completely fresh sync, **When** they initiate a "force full sync" action, **Then** the system ignores any existing checkpoints and starts from the beginning
4. **Given** a user views the sync settings, **When** a checkpoint exists, **Then** the system displays when the checkpoint was created, how many repositories are in it, and offers a "Reset Checkpoint" option
5. **Given** a user selects "Reset Checkpoint", **When** the action completes, **Then** the checkpoint file is deleted and the next sync will start from the beginning

---

### Edge Cases

- **Corrupted checkpoint file**: What happens when the checkpoint JSON file is malformed or cannot be parsed?
  - System should detect corruption, preserve the corrupted file for debugging, notify the user, and offer to start a fresh sync

- **Checkpoint with missing optional fields**: What happens when the checkpoint JSON is valid but optional fields are missing (e.g., no timestamp, no sync status)?
  - System should allow resumption if cursor and repositories array exist, but warn user about potential issues with missing metadata

- **Stale checkpoint data**: What happens if a checkpoint is weeks or months old and repositories may have changed on GitHub?
  - System should detect checkpoint age, warn user that data may be stale, offer options to resume or start fresh, and if resuming, update any changed repository data

- **Disk space exhausted**: What happens if there's no disk space to write the checkpoint?
  - System should detect disk space errors, stop the sync gracefully, preserve existing data, and notify the user with clear error message

- **Concurrent sync attempts**: What happens if a sync is already in progress and the user tries to start another?
  - System should prevent concurrent syncs, notify user that a sync is already in progress, and show current status

- **GitHub cursor expiration**: What happens if GitHub's cursor expires or becomes invalid?
  - System should catch cursor-related API errors, notify user that checkpoint cannot be used, and offer to start fresh sync

- **Repository count changes**: What happens if user stars/unstars repositories between the partial sync and resume?
  - System should handle this gracefully - if new repos were starred, they'll be included in resumed sync; if repos were unstarred, they'll remain in the checkpoint (user can manually delete later or do a fresh sync)

- **Total count changes during sync**: What happens if the user stars or unstars a repository while a sync is in progress?
  - System should refetch total count on each page; if count changes, update progress percentage and continue; sync completes when GraphQL API indicates no more pages (hasNextPage = false) rather than strictly matching initial total count

- **Empty starred repositories**: What happens if user has no starred repositories?
  - System should handle this gracefully, create an empty checkpoint, and complete successfully

- **Very large checkpoint files**: What happens if checkpoint file grows very large (thousands of repositories)?
  - System should remain performant, use efficient JSON streaming/writing, and not load entire checkpoint into memory at once

- **Transient network errors**: What happens when a page fetch fails due to temporary network issues, rate limits, or server errors?
  - System should automatically retry up to 3 times with exponential backoff (1s, 2s, 4s), show user "Retrying..." status, and only fail after all retries exhausted

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST track sync progress including: total repository count, current GraphQL cursor position, count of repositories fetched, and count converted to final storage
- **FR-002**: System MUST fetch the total count of starred repositories at the start of each sync operation
- **FR-003**: System MUST persist repository metadata to a JSON checkpoint file after each successful page/batch of repositories is fetched
- **FR-004**: System MUST store the GraphQL pagination cursor in the checkpoint file to enable resumption
- **FR-005**: System MUST write checkpoint data atomically (write to temp file, then rename) to prevent corruption if process is interrupted mid-write
- **FR-006**: System MUST detect and load an existing checkpoint file when a new sync operation begins
- **FR-007**: System MUST prompt user with a confirmation dialog when a valid checkpoint exists, presenting "Resume from checkpoint" as the primary action and an option to "Start fresh sync"
- **FR-007a**: System MUST display checkpoint metadata in the confirmation dialog including: creation date, number of repositories in checkpoint, and how long ago the checkpoint was created
- **FR-008**: System MUST prevent duplicate repositories when resuming - already-synced repositories from checkpoint should not be re-fetched
- **FR-009**: System MUST continue appending to the checkpoint file when resuming a sync operation
- **FR-010**: System MUST convert checkpoint data to final repository storage incrementally after each successful page/batch is fetched
- **FR-011**: System MUST mark sync as completed when GraphQL API indicates no more pages (hasNextPage = false), remove temporary checkpoint file, and display success message with final repository count
- **FR-012**: System MUST display current sync progress to the user showing: repositories fetched, repositories converted to final storage, and percentage complete (based on total count)
- **FR-013**: System MUST indicate whether sync is starting fresh or resuming from a checkpoint
- **FR-014**: System MUST provide a "force full sync" option that ignores existing checkpoints
- **FR-015**: System MUST provide a "reset checkpoint" action to delete checkpoint files and start fresh on next sync
- **FR-016**: System MUST validate checkpoint file with lenient approach - checkpoint is usable if cursor exists and repositories array is present, even if optional fields (timestamp, sync status, session ID) are missing
- **FR-016a**: System MUST warn user if checkpoint has missing optional fields but is still usable for resumption
- **FR-017**: System MUST handle corrupted checkpoint files gracefully with user notification and recovery options
- **FR-018**: System MUST preserve corrupted checkpoint files for debugging purposes before creating new checkpoint
- **FR-019**: System MUST display checkpoint metadata (creation date, repository count) in settings or status view
- **FR-020**: System MUST warn user if checkpoint data is stale (older than 7 days) before resuming
- **FR-021**: System MUST prevent concurrent sync operations - if sync is in progress, block new sync attempts and notify user
- **FR-022**: When user selects "Start fresh sync" from confirmation dialog, system MUST delete existing checkpoint and start sync from beginning
- **FR-023**: System MUST log sync lifecycle events including: sync started, sync resumed, page fetched, retry attempted, checkpoint written, sync completed, sync failed
- **FR-024**: System MUST log errors with sufficient detail for debugging (error type, context, failure reason) but MUST NOT log sensitive data (GitHub tokens, full repository payloads)
- **FR-025**: System MUST make logs accessible via Obsidian developer console for troubleshooting and debugging
- **FR-026**: System MUST automatically retry failed page fetch operations due to transient errors (network timeout, rate limit, temporary server error) up to 3 times before failing
- **FR-027**: System MUST implement exponential backoff for retries with delays of 1s, 2s, and 4s, and display "Retrying..." status to user during retry attempts

### Key Entities

- **Sync Checkpoint**: Represents a persistent record of sync progress including:
  - **Required**: Cursor position (GraphQL pagination cursor for last fetched page)
  - **Required**: Repositories array (complete metadata for all repositories fetched so far)
  - **Required**: Total repository count (fetched at start of sync)
  - **Required**: Fetched count (number of repositories successfully fetched so far)
  - **Optional**: Timestamp (when checkpoint was last updated)
  - **Optional**: Sync status (in_progress, completed, failed)
  - **Optional**: Sync session identifier (unique ID for this sync attempt)

- **Repository Metadata**: Stored in checkpoint, includes:
  - Repository ID, name, description, URL
  - Star count, primary language
  - Owner information
  - Starred timestamp
  - README content
  - Last updated timestamp

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can successfully resume an interrupted sync operation within 10 seconds of starting the resume
- **SC-002**: Resuming a sync skips 100% of previously processed repositories (zero duplicate fetches)
- **SC-003**: Checkpoint file is updated after each page/batch of repositories (maximum data loss of one page if interrupted)
- **SC-004**: Sync progress updates in real-time with no more than 2-second delay from actual progress
- **SC-005**: Users can successfully complete a sync of 1,000 repositories even if interrupted up to 3 times during the process
- **SC-006**: Corrupted checkpoint files are detected and handled with clear user error messages 100% of the time
- **SC-007**: "Force full sync" successfully ignores checkpoints and starts from beginning 100% of the time
- **SC-008**: "Reset checkpoint" action completes within 2 seconds and subsequent sync starts from beginning
- **SC-009**: Stale checkpoint detection (>7 days old) displays warning to user before resuming
- **SC-010**: Checkpoint file operations (read/write) do not block the UI for more than 500ms
- **SC-011**: Memory usage remains constant regardless of checkpoint size (streaming writes, not loading entire file)
- **SC-012**: Users can successfully complete sync operations even with available disk space as low as 10MB (system checks before sync)

## Assumptions

- GitHub GraphQL API cursors remain valid for at least 30 days (typical GitHub behavior)
- Users have write permissions in the Obsidian vault directory
- Sync operations are typically initiated by users, not automated (no concurrent sync requirements)
- The average user has fewer than 1,000 starred repositories (checkpoint file size remains manageable)
- JSON file format is sufficient for checkpoint storage (no database required)
- Users prefer automatic resume over manual intervention when sync fails
- The checkpoint file is stored in the plugin's data directory (same location as other plugin data)
- GitHub API rate limits apply during resumed syncs (checkpoint doesn't bypass rate limiting)
- README content is included in checkpoint (part of repository metadata)
- Partial sync data is valuable to users even if the full sync isn't completed yet
- Obsidian developer console is available for users and developers to view logs during troubleshooting
- Standard logging level (info, warn, error) is sufficient for most debugging scenarios

## Out of Scope *(optional)*

- The following are explicitly excluded from this feature:
  - Multiple checkpoint history (only the most recent checkpoint is maintained)
  - Differential sync (updating repositories that changed since last sync) - this only handles resume from interruption
  - Checkpoint sharing between devices or vaults
  - Checkpoint versioning or rollback to previous checkpoints
  - Compression of checkpoint files
  - Checkpoint encryption (relies on Obsidian's vault security)
  - Sync scheduling or automation (manual trigger only)
  - Parallel/multi-threaded fetching to speed up sync
  - User-selectable checkpoint storage location
