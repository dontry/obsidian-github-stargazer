# Research: Sync Progress Tracking & Resume

**Feature**: Sync Progress Tracking & Resume (003-sync-progress-resume)
**Date**: 2025-01-02
**Status**: Complete

## Overview

This document consolidates technical research findings for implementing checkpoint-based sync progress tracking and resume functionality. All unknowns from the Technical Context have been resolved through analysis of existing codebase patterns, Obsidian API documentation, and TypeScript best practices.

---

## Decision 1: Checkpoint File Format & Storage

**Question**: What file format and storage location should be used for checkpoint data?

**Decision**: JSON file stored in plugin data directory using Obsidian's `adaptPath` API

**Rationale**:
- JSON is human-readable, debuggable, and sufficient for < 1,000 repository metadata (FR-003, Assumptions)
- Plugin data directory is the standard location for Obsidian plugin persistence
- Existing codebase already uses this pattern for settings and sync state
- No database overhead needed for this use case

**Alternatives Considered**:
- **SQLite**: Rejected - Overkill for single checkpoint file, adds dependency
- **IndexedDB**: Rejected - Browser API not available in Obsidian plugin context
- **Binary format**: Rejected - Harder to debug, no significant size benefit for JSON text data

**Implementation Notes**:
```typescript
// File location: .obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json
// Use app.vault.adapter.mkdir() if directory doesn't exist
// Use app.vault.adapter.write() with atomic write pattern (temp file + rename)
```

---

## Decision 2: Atomic File Write Pattern

**Question**: How to implement atomic writes to prevent checkpoint corruption on interruption?

**Decision**: Write to temporary file, then rename (POSIX atomic rename operation)

**Rationale**:
- POSIX `rename()` is atomic at the filesystem level
- If process crashes during write, only temp file is affected
- Previous checkpoint remains intact until rename succeeds
- Standard pattern for crash-safe file writes (FR-005)

**Alternatives Considered**:
- **Direct overwrite**: Rejected - Vulnerable to corruption if write is interrupted
- **Write-ahead log (WAL)**: Rejected - Overkill for single file, adds complexity
- **Versioned backups**: Rejected - Out of scope (spec says only most recent checkpoint)

**Implementation Notes**:
```typescript
// 1. Write to .sync-checkpoint.json.tmp
// 2. fsync() to ensure data is flushed to disk
// 3. Rename .sync-checkpoint.json.tmp → .sync-checkpoint.json
// 4. Error handling: If any step fails, preserve previous checkpoint
```

**Potential Issue**: Obsidian's `vault.adapter.write()` may not expose atomic rename directly.
**Workaround**: Use Node.js `fs.rename()` if available in Obsidian context, otherwise fallback to sequential write with error recovery.

---

## Decision 3: Checkpoint Schema & Validation

**Question**: What JSON schema for checkpoint data? How strict should validation be?

**Decision**: Lenient schema with required vs optional fields (matches spec FR-016)

**Rationale**:
- Required: `cursor`, `repositories`, `totalCount`, `fetchedCount` (FR-001)
- Optional: `timestamp`, `status`, `sessionId` (FR-016a)
- Lenient validation allows resumption even if optional fields are missing
- Warn user about missing optional fields but continue (FR-016a)

**Alternatives Considered**:
- **Strict schema**: Rejected - Would fail resumption for minor version differences
- **No validation**: Rejected - Could crash on corrupted or malformed data
- **JSON Schema validation**: Rejected - Adds dependency, simple type checks sufficient

**Implementation Notes**:
```typescript
interface SyncCheckpoint {
  // Required fields
  cursor: string | null;           // GraphQL cursor (null = first page)
  repositories: RepositoryMetadata[];
  totalCount: number;              // Total starred repos
  fetchedCount: number;            // Repositories fetched so far

  // Optional fields (warn if missing)
  timestamp?: string;              // ISO 8601 timestamp
  status?: 'in_progress' | 'completed' | 'failed';
  sessionId?: string;              // UUID for this sync attempt
}
```

---

## Decision 4: Exponential Backoff Retry Implementation

**Question**: How to implement exponential backoff retry for transient network errors?

**Decision**: Recursive retry function with delay wrapper, max 3 retries (FR-026, FR-027)

**Rationale**:
- Exponential backoff (1s, 2s, 4s) is standard practice for handling transient failures
- Recursive approach is clean and readable for retry logic
- Display "Retrying..." status to user during delays (FR-027)
- Fail after 3 retries to avoid indefinite hangs

**Alternatives Considered**:
- **Retry library (e.g., `retry` npm package)**: Rejected - Adds dependency, simple custom implementation sufficient
- **Promise chain with `.catch()`**: Rejected - More complex than recursive approach
- **No retry (fail fast)**: Rejected - Would violate FR-026, poor UX for transient network issues

**Implementation Notes**:
```typescript
async function fetchWithRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0 || !isTransientError(error)) {
      throw error;
    }
    new Notice(`Retrying... (${retries} attempts left)`);
    await sleep(delay);
    return fetchWithRetry(fn, retries - 1, delay * 2);
  }
}

function isTransientError(error: unknown): boolean {
  // Network timeout, rate limit (429), 5xx server errors
  return error instanceof NetworkError ||
         error.status === 429 ||
         (error.status >= 500 && error.status < 600);
}
```

---

## Decision 5: JSON Streaming for Large Checkpoint Files

**Question**: How to handle large checkpoint files (1000+ repositories) without loading entire file into memory?

**Decision**: Incremental JSON parsing/writing using streaming pattern (FR-010, SC-011)

**Rationale**:
- Spec requires constant memory usage regardless of checkpoint size (SC-011)
- Reading entire JSON into memory could cause issues with large checkpoints
- Writing incrementally after each page aligns with incremental conversion (FR-010)
- TypeScript/Node.js have built-in JSON streaming support via `Readable`/`Writable` streams

**Alternatives Considered**:
- **Load entire JSON**: Rejected - Violates SC-011 (constant memory usage)
- **Binary format with seeking**: Rejected - Adds complexity, JSON is sufficient
- **Chunked JSON files**: Rejected - More complex than streaming approach

**Implementation Notes**:
```typescript
// Write: Append to JSON array incrementally
// 1. Read existing JSON (if checkpoint exists)
// 2. Parse repositories array
// 3. Append new repositories
// 4. Write back to temp file
// 5. Atomic rename

// For very large files, use streaming JSON parser (e.g., JSONStream)
// However, for < 1000 repos, simple JSON.parse/stringify is likely sufficient
// Profile actual performance before optimizing prematurely
```

**Optimization Deferred**: Start with simple `JSON.parse()`/`JSON.stringify()`. If performance testing reveals issues (checkpoint operations > 500ms), implement streaming JSON parser.

---

## Decision 6: Checkpoint File Cleanup & Lifecycle

**Question**: When should checkpoint file be created, updated, and deleted?

**Decision**: Create at sync start, update after each page, delete on successful completion

**Rationale**:
- Create empty checkpoint at sync start (marks sync in progress)
- Update after each successful page fetch (minimizes data loss)
- Delete only when sync completes successfully (FR-011)
- Preserve checkpoint on failure for resume capability
- User can manually reset checkpoint via settings (FR-015)

**Alternatives Considered**:
- **Delete on error**: Rejected - Loses progress, defeats purpose of resume
- **Keep checkpoint forever**: Rejected - Spec says remove on completion (FR-011)
- **Multiple checkpoint versions**: Rejected - Out of scope (spec says only most recent)

**Implementation Notes**:
```typescript
// Sync lifecycle:
// 1. Check for existing checkpoint → prompt user (resume vs fresh)
// 2. Create/update checkpoint file
// 3. Fetch page → append repositories to checkpoint → convert to final storage
// 4. Repeat until hasNextPage = false
// 5. Delete checkpoint file → display success message
// 6. On error: keep checkpoint, log error, notify user
```

---

## Decision 7: User Confirmation Modal Design

**Question**: How should the resume/fresh sync confirmation modal work?

**Decision**: Custom Obsidian Modal subclass with two buttons (Resume primary, Fresh secondary)

**Rationale**:
- Obsidian API provides `Modal` base class for custom dialogs
- Two-button pattern matches standard confirmation dialogs
- "Resume" as primary button aligns with spec (FR-007)
- Display checkpoint metadata (creation date, repo count) for informed decision (FR-007a)

**Alternatives Considered**:
- **Native confirm()**: Rejected - Not async, not customizable, poor UX
- **Obsidian SuggestModal**: Rejected - Designed for selection, not confirmation
- **Settings-based choice**: Rejected - Too slow, interrupts sync flow

**Implementation Notes**:
```typescript
class ResumeConfirmationModal extends Modal {
  constructor(app: App, checkpoint: SyncCheckpoint) {
    super(app);
    this.checkpoint = checkpoint;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.createEl('h2', { text: 'Resume Sync?' });
    contentEl.createEl('p', {
      text: `Found checkpoint from ${timeSince(checkpoint.timestamp)} ` +
            `with ${checkpoint.fetchedCount} repositories.`
    });
    new ButtonComponent(contentEl)
      .setButtonText('Resume from checkpoint')
      .setCta()  // Primary button
      .onClick(() => this.onResume());
    new ButtonComponent(contentEl)
      .setButtonText('Start fresh sync')
      .onClick(() => this.onFreshSync());
  }
}
```

---

## Decision 8: Real-Time Progress Display

**Question**: How to display real-time sync progress to user?

**Decision**: Update existing `SyncProgress` notice/modal with checkpoint-aware metrics

**Rationale**:
- Existing codebase has `SyncProgress` UI component
- Display: repositories fetched, repositories converted, percentage complete (FR-012)
- Update after each page fetch (real-time, < 2 second delay per SC-004)
- Indicate whether syncing fresh or resuming (FR-013)

**Alternatives Considered**:
- **Status bar**: Rejected - Obsidian status bar API is limited, not suitable for detailed progress
- **Settings tab**: Rejected - User may not have settings open during sync
- **Toast notifications**: Rejected - Too intrusive for continuous updates

**Implementation Notes**:
```typescript
// Progress display format:
// "Syncing: 50/100 repositories (50%) - Resuming from checkpoint"
// "Syncing: 75/100 repositories (75%) - Converting to storage..."

// Update progress after each page:
progressNotice.setMessage(
  `Syncing: ${fetchedCount}/${totalCount} repositories (${percentage}%)` +
  `${isResuming ? ' - Resuming from checkpoint' : ''}`
);
```

---

## Decision 9: Disk Space Check Strategy

**Question**: How to check for available disk space before sync?

**Decision**: Estimate checkpoint file size and attempt to write temp file to verify space

**Rationale**:
- Spec requires minimum 10MB check (SC-012)
- Actual checkpoint size depends on repository count (estimated ~1KB per repo)
- Write test file to catch disk space issues before sync starts
- Graceful error message if insufficient space (edge case)

**Alternatives Considered**:
- **Query filesystem stats**: Rejected - Cross-platform complexity, may not work in sandboxed Obsidian
- **Skip check**: Rejected - Could fail mid-sync with partial checkpoint
- **Fixed 100MB requirement**: Rejected - Too conservative, wastes space

**Implementation Notes**:
```typescript
async function checkDiskSpace(repoCount: number): Promise<void> {
  const estimatedSize = Math.max(repoCount * 1024, 10 * 1024 * 1024); // Min 10MB
  const testFile = `.disk-space-test-${Date.now()}.tmp`;

  try {
    await vault.adapter.write(testFile, '0'.repeat(estimatedSize));
    await vault.adapter.remove(testFile);
  } catch (error) {
    throw new SyncError(
      'Insufficient disk space',
      `At least ${formatBytes(estimatedSize)} required for sync checkpoint`
    );
  }
}
```

---

## Decision 10: Logging Strategy

**Question**: What events and errors should be logged? Where should logs go?

**Decision**: Standard logging to Obsidian developer console (FR-023, FR-024, FR-025)

**Rationale**:
- Spec requires standard logging level (info, warn, error)
- Logs accessible via Obsidian developer console (Ctrl+Shift+I)
- Log lifecycle events: start, resume, page fetched, retry, checkpoint written, complete, error (FR-023)
- NO sensitive data: no GitHub tokens, no full repository payloads (FR-024)

**Alternatives Considered**:
- **File-based logging**: Rejected - Adds complexity, console is sufficient
- **External logging service**: Rejected - Privacy violation (Principle VI)
- **No logging**: Rejected - Makes debugging impossible, violates FR-025

**Implementation Notes**:
```typescript
// Logging utility
const logger = {
  info: (message: string, context?: Record<string, unknown>) => {
    console.log(`[GitHubStargazer] ${message}`, context ?? '');
  },
  warn: (message: string, context?: Record<string, unknown>) => {
    console.warn(`[GitHubStargazer] ${message}`, context ?? '');
  },
  error: (message: string, error: Error) => {
    console.error(`[GitHubStargazer] ${message}`, {
      message: error.message,
      type: error.name,
      // NEVER log: error.stack (may contain token), full request/response
    });
  }
};

// Usage:
logger.info('Sync started', { sessionId, isResume: !!checkpoint });
logger.info('Page fetched', { pageNum, repoCount, hasNextPage });
logger.warn('Checkpoint missing optional fields', { missing: ['timestamp'] });
logger.error('Sync failed', error);
```

---

## Unresolved Questions

None. All technical unknowns from the Technical Context have been resolved through this research.

---

## Next Steps

Proceed to **Phase 1: Design & Contracts**:
1. Generate `data-model.md` with detailed entity schemas
2. Generate API contracts (none for this feature - internal service only)
3. Generate `quickstart.md` with test scenarios
4. Re-run Constitution Check to verify design decisions
