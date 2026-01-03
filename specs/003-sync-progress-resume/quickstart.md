# Quickstart: Sync Progress Tracking & Resume

**Feature**: Sync Progress Tracking & Resume (003-sync-progress-resume)
**Date**: 2025-01-02

## Overview

This document provides practical scenarios for testing and validating the sync progress tracking and resume functionality. Use these scenarios to verify that the implementation meets all functional requirements and success criteria.

---

## Test Scenarios by User Story

### User Story 1: Persist Sync Progress (P1)

#### Scenario 1.1: Fresh Sync Creates Checkpoint

**Given** User has 150 starred repositories on GitHub
**When** User starts sync for the first time
**Then** System should:
1. Fetch total count (150) from GitHub GraphQL API
2. Create checkpoint file at: `.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json`
3. Checkpoint contains:
   - `cursor`: null (first page)
   - `repositories`: [] (empty initially)
   - `totalCount`: 150
   - `fetchedCount`: 0
   - `timestamp`: <current time>
   - `status`: "in_progress"
   - `sessionId`: <valid UUID>

**Verify**:
```bash
# In Obsidian developer console (Ctrl+Shift+I):
app.vault.adapter.read('.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json')
  .then(data => console.log(JSON.parse(data)))
```

---

#### Scenario 1.2: Checkpoint Updated After Each Page

**Given** Sync is in progress, page 1 fetched (100 repositories)
**When** Page 1 is successfully fetched and processed
**Then** Checkpoint should be updated with:
   - `cursor`: <GraphQL cursor for page 1>
   - `repositories`: [100 repo objects]
   - `fetchedCount`: 100
   - `timestamp`: <updated time>

**Verify**: Check checkpoint file after first page. `repositories.length` should be 100.

---

#### Scenario 1.3: App Crash Preserves Checkpoint

**Given** Sync is in progress (50/150 repositories fetched)
**When** User force-quits Obsidian during sync
**Then** Checkpoint file should contain 50 repositories with valid cursor

**Verify**:
1. Force-quit Obsidian (Cmd+Q on Mac, Alt+F4 on Windows)
2. Restart Obsidian
3. Read checkpoint file - should have `fetchedCount: 50` and 50 repository objects

---

#### Scenario 1.4: Resume from Checkpoint After Crash

**Given** Checkpoint exists with 50 repositories from previous interrupted sync
**When** User initiates sync again
**Then** System should:
1. Detect existing checkpoint
2. Show confirmation modal: "Resume from checkpoint (50 repositories, 5 minutes ago)?"
3. After user selects "Resume", fetch starting from page 3 (cursor from checkpoint)
4. NOT re-fetch first 50 repositories

**Verify**: Sync completes faster than fresh sync (skips 50 already-fetched repos).

---

#### Scenario 1.5: Transient Error Retry

**Given** Sync is in progress, network temporarily disconnects
**When** Page fetch fails with network timeout
**Then** System should:
1. Wait 1 second
2. Show "Retrying... (2 attempts left)" notice
3. Retry fetch
4. If fails again, wait 2 seconds, retry
5. If fails again, wait 4 seconds, retry
6. After 3rd retry fails, preserve checkpoint and show error

**Verify**: Check logs for retry attempts. Notice visible to user.

---

#### Scenario 1.6: Sync Completion Removes Checkpoint

**Given** Sync is resumed from checkpoint, all repositories fetched
**When** Sync completes successfully (hasNextPage = false)
**Then** System should:
1. Convert all repositories to final storage
2. Delete checkpoint file
3. Show success message: "Synced 150 repositories"

**Verify**: Checkpoint file no longer exists.

---

### User Story 2: Resume from Checkpoint (P2)

#### Scenario 2.1: Confirmation Modal on Resume

**Given** Checkpoint exists from previous sync
**When** User initiates sync
**Then** System should display modal with:
- Title: "Resume Sync?"
- Message: "Found checkpoint from 5 minutes ago with 50 repositories."
- Primary button: "Resume from checkpoint" (CTA style)
- Secondary button: "Start fresh sync"

**Verify**: Modal is visually distinct, resume button is primary.

---

#### Scenario 2.2: Resume Skips Already-Fetched Repositories

**Given** Checkpoint with 50 repositories
**When** User selects "Resume from checkpoint"
**Then** GitHub API should be called with cursor from checkpoint (not null)

**Verify**: Check network tab or logs. First fetch should use cursor, not start from beginning.

---

#### Scenario 2.3: Fresh Sync Ignores Checkpoint

**Given** Checkpoint exists with 50 repositories
**When** User selects "Start fresh sync"
**Then** System should:
1. Delete existing checkpoint
2. Create new checkpoint with cursor=null, repositories=[]
3. Start sync from beginning

**Verify**: All repositories are fetched again, final count matches total.

---

#### Scenario 2.4: Invalid Cursor Handling

**Given** Checkpoint exists but cursor is expired/invalid (GitHub error)
**When** System attempts to resume
**Then** System should:
1. Catch cursor-related API error
2. Show modal: "Checkpoint cursor is invalid. Start fresh sync?"
3. NOT automatically resume

**Verify**: Error is handled gracefully, user is informed.

---

#### Scenario 2.5: Missing Optional Fields Warning

**Given** Checkpoint exists with cursor and repositories, but missing timestamp
**When** System loads checkpoint
**Then** System should:
1. Allow resumption (lenient validation)
2. Show warning: "Checkpoint is missing some metadata (timestamp, status). Resuming may have issues."

**Verify**: Sync proceeds despite missing fields, user is warned.

---

### User Story 3: Progress Visibility & Management (P3)

#### Scenario 3.1: Real-Time Progress Display

**Given** User is watching sync progress
**When** Repositories are being fetched
**Then** Progress notice should show:
- "Syncing: 50/150 repositories (33%) - Resuming from checkpoint"
- Updates in real-time (< 2 second delay)

**Verify**: Notice updates after each page fetch.

---

#### Scenario 3.2: Force Full Sync Command

**Given** Checkpoint exists with 50 repositories
**When** User runs "Force full sync" command
**Then** System should:
1. Skip confirmation modal
2. Delete checkpoint immediately
3. Start fresh sync

**Verify**: No modal shown, sync starts from beginning.

---

#### Scenario 3.3: Checkpoint Reset in Settings

**Given** Checkpoint exists
**When** User opens Settings → GitHub Stargazer
**Then** Settings should show:
- "Last checkpoint: 5 minutes ago, 50 repositories"
- "Reset Checkpoint" button

**When** User clicks "Reset Checkpoint"
**Then** Checkpoint file is deleted, confirmation shown

**Verify**: Next sync starts fresh, no prompt to resume.

---

## Edge Case Scenarios

### EC1: Corrupted Checkpoint File

**Given** Checkpoint file exists but contains invalid JSON
**When** User attempts to sync
**Then** System should:
1. Detect JSON parse error
2. Preserve corrupted file as `.sync-checkpoint.json.corrupted`
3. Show error: "Checkpoint file is corrupted. Starting fresh sync."
4. Create new checkpoint

**Verify**: Corrupted file is preserved for debugging.

---

### EC2: Stale Checkpoint (> 7 Days Old)

**Given** Checkpoint is 10 days old
**When** User attempts to sync
**Then** System should:
1. Detect checkpoint age
2. Show modal with warning: "This checkpoint is 10 days old. Repository data may be stale."
3. Offer options: "Resume anyway" or "Start fresh sync"

**Verify**: Warning is visible, user can still resume if desired.

---

### EC3: Disk Space Exhausted

**Given** User has < 10MB free disk space
**When** User attempts to sync
**Then** System should:
1. Attempt to write 10MB test file
2. Detect write failure
3. Show error: "Insufficient disk space. At least 10MB required."
4. NOT start sync

**Verify**: Sync fails gracefully before any data is fetched.

---

### EC4: Concurrent Sync Attempts

**Given** Sync is already in progress
**When** User attempts to start another sync
**Then** System should:
1. Detect existing sync-in-progress (check status or session ID)
2. Show notice: "Sync is already in progress. Please wait."
3. NOT start second sync

**Verify**: Only one sync can run at a time.

---

### EC5: Empty Starred Repositories

**Given** User has 0 starred repositories
**When** User syncs
**Then** System should:
1. Fetch totalCount = 0
2. Create checkpoint with repositories=[]
3. Mark sync as completed immediately
4. Delete checkpoint
5. Show message: "No starred repositories to sync."

**Verify**: Sync completes successfully with zero repositories.

---

### EC6: Very Large Checkpoint (1000+ Repositories)

**Given** User has 1,500 starred repositories
**When** User syncs
**Then** System should:
1. Handle checkpoint file (~1.5MB) without performance issues
2. Memory usage remains constant (no memory leaks)
3. Progress updates remain responsive

**Verify**: Monitor memory usage in DevTools. Should not grow unbounded.

---

## Manual Testing Steps

### Prerequisites

1. GitHub account with starred repositories (test account recommended)
2. Obsidian desktop app with developer console enabled (Ctrl+Shift+I)
3. Plugin loaded and configured with GitHub token

### Test Checklist

#### Phase 1: Fresh Sync (US1)

- [ ] Start sync, verify checkpoint file created
- [ ] Force-quit after first page, verify checkpoint contains data
- [ ] Restart, verify resume prompt appears
- [ ] Resume sync, verify it continues from checkpoint
- [ ] Let sync complete, verify checkpoint deleted

#### Phase 2: Error Handling (US1)

- [ ] Disconnect network during sync, verify retry logic works
- [ ] Verify "Retrying..." notices visible
- [ ] After 3 retries, verify error shown and checkpoint preserved
- [ ] Reconnect network, resume sync
- [ ] Verify sync completes successfully

#### Phase 3: User Experience (US2, US3)

- [ ] Interrupt sync, verify confirmation modal details (timestamp, count)
- [ ] Test "Resume" button - verify skips already-fetched repos
- [ ] Test "Start fresh sync" button - verify deletes checkpoint
- [ ] Verify progress notice updates in real-time
- [ ] Check settings tab for checkpoint info and reset button

#### Phase 4: Edge Cases

- [ ] Manually corrupt checkpoint file (add invalid JSON), verify error handling
- [ ] Create stale checkpoint (modify timestamp to 10 days ago), verify warning
- [ ] Test with 0 starred repositories (test account with no stars)
- [ ] Try to start second sync while first is running, verify blocked

#### Phase 5: Performance (Success Criteria)

- [ ] Time resume operation: should start within 10 seconds (SC-001)
- [ ] Verify no duplicate fetches when resuming (SC-002)
- [ ] Check checkpoint file size: should be reasonable for repo count (SC-011)
- [ ] Monitor memory: should remain constant during sync (SC-011)

---

## Automated Testing

Unit tests (see `tests/unit/sync/checkpoint-manager.test.ts`):

```typescript
describe('CheckpointManager', () => {
  it('should create checkpoint with required fields');
  it('should validate checkpoint with missing optional fields (lenient)');
  it('should reject checkpoint with missing required fields');
  it('should detect stale checkpoint (> 7 days old)');
  it('should atomic write checkpoint (temp file + rename)');
  it('should handle corrupted checkpoint gracefully');
});

describe('GitHubGraphQLClient Retry', () => {
  it('should retry transient errors up to 3 times');
  it('should implement exponential backoff (1s, 2s, 4s)');
  it('should fail after 3 retries');
  it('should not retry non-transient errors (401, 403)');
});
```

Integration tests (see `tests/integration/sync-workflow.test.ts`):

```typescript
describe('Sync Workflow with Checkpoint', () => {
  it('should complete sync with interruption and resume');
  it('should convert repositories incrementally during sync');
  it('should handle invalid cursor gracefully');
  it('should prevent concurrent syncs');
});
```

---

## Debugging Tips

### View Checkpoint File

```javascript
// In Obsidian developer console:
app.vault.adapter.read('.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json')
  .then(data => console.log(JSON.parse(data)))
```

### Manually Delete Checkpoint

```javascript
// In Obsidian developer console:
app.vault.adapter.remove('.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json')
```

### Force Corrupt Checkpoint (for testing)

```javascript
// In Obsidian developer console:
app.vault.adapter.write('.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json', '{invalid json')
```

### Simulate Network Failure

Use Obsidian developer console → Network tab → Throttling dropdown → Select "Offline"

### Monitor Sync Progress

```javascript
// Check sync state in plugin instance:
window.app.plugins.plugins['obsidian-github-stargazer'].syncService
```

---

## Success Criteria Verification

After implementing and testing, verify all success criteria are met:

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

## Next Steps

1. Run through all manual test scenarios
2. Verify all automated tests pass
3. Check Constitution compliance (lint, type check, test coverage)
4. Create GitHub PR with implementation
5. Manual smoke test in Obsidian desktop and mobile
