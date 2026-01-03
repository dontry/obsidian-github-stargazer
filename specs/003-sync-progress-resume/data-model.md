# Data Model: Sync Progress Tracking & Resume

**Feature**: Sync Progress Tracking & Resume (003-sync-progress-resume)
**Date**: 2025-01-02
**Status**: Complete

## Overview

This document describes the data entities and their relationships for implementing checkpoint-based sync progress tracking and resume functionality. The data model extends the existing plugin types to support checkpoint persistence, validation, and lifecycle management.

---

## Entity Definitions

### 1. SyncCheckpoint

**Description**: Persistent record of sync progress including cursor position and fetched repository metadata. Stored as JSON in plugin data directory.

**File Location**: `.obsidian/plugins/obsidian-github-stargazer/.sync-checkpoint.json`

**Schema**:

```typescript
interface SyncCheckpoint {
  // === Required Fields ===
  cursor: string | null;
  // GraphQL pagination cursor for the last fetched page.
  // null indicates the first page (start of sync).
  // Used to resume fetching from this position.

  repositories: RepositoryMetadata[];
  // Complete metadata for all repositories fetched so far.
  // Accumulated incrementally as pages are fetched.
  // Used to prevent duplicate fetches when resuming.

  totalCount: number;
  // Total count of starred repositories fetched from GitHub at sync start.
  // Used to calculate progress percentage and detect completion.

  fetchedCount: number;
  // Number of repositories successfully fetched and stored in checkpoint.
  // Must be <= totalCount and <= repositories.length.
  // Used to track incremental progress.

  // === Optional Fields ===
  timestamp?: string;
  // ISO 8601 timestamp (e.g., "2025-01-02T14:30:00Z") of last checkpoint update.
  // Used to detect stale checkpoints (FR-020: warn if > 7 days old).
  // Missing indicates checkpoint was created by older version (lenient validation).

  status?: SyncStatus;
  // Current state of the sync operation.
  // Used to detect orphaned checkpoints and resume eligibility.
  // Missing indicates checkpoint was created by older version.

  sessionId?: string;
  // UUID v4 uniquely identifying this sync attempt.
  // Used to distinguish between multiple sync attempts and prevent concurrent syncs.
  // Missing indicates checkpoint was created by older version.
}
```

**Validation Rules**:
- **Required fields**: `cursor`, `repositories`, `totalCount`, `fetchedCount`
- **Lenient validation**: Checkpoint is usable if required fields exist, even if optional fields are missing (FR-016)
- **Consistency checks**:
  - `fetchedCount` must equal `repositories.length` (warn if mismatch)
  - `fetchedCount` must be <= `totalCount` (error if violated)
  - `totalCount` must be > 0 (error if violated)
- **Stale checkpoint detection**: Warn user if `timestamp` is > 7 days old (FR-020)

**State Transitions**:

```
[Checkpoint Created]
    ↓
status: "in_progress"
    ↓
[Each Page Fetched]
    ↓
[Update repositories, cursor, fetchedCount, timestamp]
    ↓
[Sync Complete (hasNextPage = false)]
    ↓
status: "completed"
    ↓
[Checkpoint Deleted, Repositories in Final Storage]

OR

[Error Occurs]
    ↓
status: "failed"
    ↓
[Checkpoint Preserved for Resume]
```

**File Format**:

```json
{
  "cursor": "eyJjbGllbnRfTG9nX2NvbnRleHQiOnsibmFtZSI6Im1haW4ifX0",
  "repositories": [
    {
      "id": "MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw",
      "name": "example-repo",
      "description": "An example repository",
      "url": "https://github.com/user/example-repo",
      "starCount": 42,
      "primaryLanguage": "TypeScript",
      "owner": {
        "login": "user",
        "url": "https://github.com/user"
      },
      "starredAt": "2025-01-01T12:00:00Z",
      "readme": "# Example Repository\n...",
      "updatedAt": "2025-01-02T10:30:00Z"
    }
  ],
  "totalCount": 150,
  "fetchedCount": 100,
  "timestamp": "2025-01-02T14:30:00Z",
  "status": "in_progress",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000"
}
```

---

### 2. RepositoryMetadata

**Description**: Complete metadata for a single GitHub repository. Extended from existing `Repository` type with README content.

**Note**: This type already exists in the codebase (`src/types.ts`). This section documents it for completeness and identifies any extensions needed.

**Schema** (Existing):

```typescript
interface RepositoryMetadata {
  id: string;
  // GitHub node ID for the repository.
  // Used for unstar mutation and deduplication.

  name: string;
  // Repository name (e.g., "example-repo").

  description: string | null;
  // Repository description from GitHub.
  // null if no description provided.

  url: string;
  // GitHub repository URL (e.g., "https://github.com/user/example-repo").

  starCount: number;
  // Number of stars the repository has.
  // Used for sorting and display.

  primaryLanguage: string | null;
  // Primary programming language (e.g., "TypeScript", "Python").
  // null if no language detected.

  owner: {
    login: string;
    // Repository owner username.

    url: string;
    // GitHub URL for owner profile.
  };

  starredAt: string;
  // ISO 8601 timestamp when user starred this repository.
  // Used for sorting by recency.

  readme: string;
  // README content in Markdown format.
  // Included in checkpoint for offline access.

  updatedAt: string;
  // ISO 8601 timestamp of last repository update.
  // Used for freshness display.
}
```

**Validation Rules**:
- All fields except `description` and `primaryLanguage` are required
- `starredAt` and `updatedAt` must be valid ISO 8601 timestamps
- `id` must match GitHub GraphQL node ID format
- URLs must be valid HTTPS URLs

**Relationships**:
- One `RepositoryMetadata` belongs to one `SyncCheckpoint.repositories[]` array
- Multiple repositories can reference the same owner

---

### 3. SyncStatus

**Description**: Enumeration of possible sync operation states.

**Schema**:

```typescript
type SyncStatus = 'in_progress' | 'completed' | 'failed';
```

**Values**:
- `in_progress`: Sync is actively running or was interrupted (checkpoint preserved)
- `completed`: Sync finished successfully (checkpoint should be deleted, repos in storage)
- `failed`: Sync encountered an error (checkpoint preserved for debugging/resume)

**Usage**:
- Stored in `SyncCheckpoint.status`
- Used to determine if checkpoint is eligible for resume
- `completed` checkpoints are invalid (should have been deleted)

---

### 4. SyncProgress

**Description**: Real-time progress metrics for sync operation. Displayed to user during sync.

**Schema**:

```typescript
interface SyncProgress {
  totalCount: number;
  // Total number of starred repositories to fetch.
  // Fetched at sync start via GitHub GraphQL query.

  fetchedCount: number;
  // Number of repositories fetched so far.
  // Updated after each successful page fetch.

  convertedCount: number;
  // Number of repositories converted to final repository storage.
  // Updated incrementally after each page (FR-010).

  isResuming: boolean;
  // true if resuming from existing checkpoint, false if starting fresh.
  // Used for display messaging (FR-013).

  currentPhase: SyncPhase;
  // Current phase of sync operation.
  // Used for detailed progress display.
}
```

**Derived Metrics**:

```typescript
// Percentage complete (0-100)
const percentage = Math.floor((progress.fetchedCount / progress.totalCount) * 100);

// Estimated remaining repositories
const remaining = progress.totalCount - progress.fetchedCount;
```

---

### 5. SyncPhase

**Description**: Enumeration of sync phases for detailed progress display.

**Schema**:

```typescript
type SyncPhase =
  | 'fetching_total_count'  // Querying GitHub for total starred repos
  | 'loading_checkpoint'     // Reading existing checkpoint file
  | 'fetching_repositories'  // Fetching pages from GitHub API
  | 'converting_to_storage'  // Converting checkpoint to final storage
  | 'completed';             // Sync finished successfully
```

**Usage**:
- Displayed to user as: "Fetching repositories...", "Converting to storage...", etc.
- Helps user understand what's happening during long syncs

---

### 6. CheckpointValidationError

**Description**: Error type for checkpoint validation failures.

**Schema**:

```typescript
class CheckpointValidationError extends Error {
  constructor(
    message: string,
    public readonly reason: ValidationReason,
    public readonly isRecoverable: boolean
  ) {
    super(message);
    this.name = 'CheckpointValidationError';
  }
}

type ValidationReason =
  | 'file_not_found'          // No checkpoint exists (not an error)
  | 'json_parse_error'        // Corrupted JSON (unrecoverable)
  | 'missing_required_field'  // Missing cursor/repositories (unrecoverable)
  | 'invalid_format'          // Invalid field type/format (unrecoverable)
  | 'missing_optional_field'  // Missing timestamp/status (recoverable, warn user)
  | 'stale_checkpoint'        // Checkpoint > 7 days old (recoverable, warn user)
  | 'inconsistent_data'       // fetchedCount != repositories.length (warn user)
  | 'concurrent_sync';        // Another sync already in progress (blocking)
```

**Recoverability**:
- `isRecoverable = true`: User can choose to continue with warning
- `isRecoverable = false`: Must start fresh sync or fix manually

---

## Entity Relationships

```
SyncCheckpoint (1)
    ├── repositories (0..*) → RepositoryMetadata
    ├── sessionId (0..1) → UUID
    ├── status (0..1) → SyncStatus
    └── cursor (1) → GraphQL pagination cursor

RepositoryMetadata (1)
    ├── owner (1) → { login, url }
    ├── starredAt (1) → ISO 8601 timestamp
    ├── updatedAt (1) → ISO 8601 timestamp
    └── readme (1) → Markdown string

SyncProgress (1)
    ├── currentPhase (1) → SyncPhase
    └── totalCount (1), fetchedCount (1), convertedCount (1)
```

---

## Data Flow

### Sync Start (Fresh Sync)

```
1. User initiates sync
2. Check for existing checkpoint → Not found
3. Fetch total count from GitHub GraphQL API
4. Create new SyncCheckpoint:
   {
     cursor: null,
     repositories: [],
     totalCount: <fetched>,
     fetchedCount: 0,
     timestamp: <now>,
     status: "in_progress",
     sessionId: <new UUID>
   }
5. Write checkpoint to file (atomic)
6. Begin fetching pages
```

### Sync Start (Resume from Checkpoint)

```
1. User initiates sync
2. Check for existing checkpoint → Found
3. Validate checkpoint:
   - Check required fields (cursor, repositories, totalCount, fetchedCount)
   - Validate consistency (fetchedCount == repositories.length)
   - Check staleness (timestamp > 7 days? warn user)
4. Show confirmation modal to user
5. User selects "Resume"
6. Update checkpoint:
   {
     ...checkpoint,
     timestamp: <now>,
     status: "in_progress",
     sessionId: <new UUID>
   }
7. Begin fetching from checkpoint.cursor
```

### Page Fetch (Fresh or Resume)

```
1. Fetch page from GitHub GraphQL API using checkpoint.cursor
2. On success:
   a. Append new repositories to checkpoint.repositories
   b. Update checkpoint.cursor = page.endCursor
   c. Update checkpoint.fetchedCount = repositories.length
   d. Update checkpoint.timestamp = <now>
   e. Write checkpoint to file (atomic)
   f. Convert new repositories to final storage (incremental)
   g. Update progress display
3. On transient error (network, rate limit):
   a. Retry with exponential backoff (1s, 2s, 4s)
   b. Show "Retrying..." status
   c. After 3 retries, fail and preserve checkpoint
4. On fatal error:
   a. Update checkpoint.status = "failed"
   b. Log error (no sensitive data)
   c. Notify user with error message
   d. Preserve checkpoint for debugging
```

### Sync Completion

```
1. Fetch page where hasNextPage = false
2. Update checkpoint:
   {
     ...checkpoint,
     status: "completed",
     timestamp: <now>
   }
3. Convert any remaining repositories to final storage
4. Delete checkpoint file
5. Display success message with final repository count
6. Log completion
```

---

## Storage Considerations

### File Size Estimates

- **Per repository**: ~1KB (including README content)
- **100 repositories**: ~100KB
- **1,000 repositories**: ~1MB
- **Minimum disk space**: 10MB (SC-012, ensures buffer for large repos)

### Memory Usage

- **Checkpoint read**: Load full JSON into memory (acceptable for < 1,000 repos)
- **Checkpoint write**: Rewrite entire file after each page
- **Optimization**: If profiling shows issues, implement streaming JSON parser

### Atomic Write Pattern

```
1. Write to .sync-checkpoint.json.tmp
2. Ensure data flushed to disk (fsync)
3. Rename .sync-checkpoint.json.tmp → .sync-checkpoint.json
4. If any step fails, preserve previous checkpoint
```

---

## Validation Summary

| Entity | Required Fields | Optional Fields | Validation Rules |
|--------|----------------|-----------------|------------------|
| SyncCheckpoint | cursor, repositories, totalCount, fetchedCount | timestamp, status, sessionId | Lenient: warn on missing optional, error on invalid required |
| RepositoryMetadata | id, name, url, starCount, owner, starredAt, readme, updatedAt | description, primaryLanguage | Strict: all required fields must be present and valid |
| SyncProgress | totalCount, fetchedCount, convertedCount, isResuming, currentPhase | None | Derived from checkpoint and sync state |
| CheckpointValidationError | message, reason, isRecoverable | None | Determined by validation logic |

---

## Extensions to Existing Types

The following existing types require extensions or modifications:

### src/types.ts

```typescript
// Add to existing types file
export interface SyncCheckpoint {
  cursor: string | null;
  repositories: RepositoryMetadata[];
  totalCount: number;
  fetchedCount: number;
  timestamp?: string;
  status?: SyncStatus;
  sessionId?: string;
}

export type SyncStatus = 'in_progress' | 'completed' | 'failed';

export type SyncPhase =
  | 'fetching_total_count'
  | 'loading_checkpoint'
  | 'fetching_repositories'
  | 'converting_to_storage'
  | 'completed';

export interface SyncProgress {
  totalCount: number;
  fetchedCount: number;
  convertedCount: number;
  isResuming: boolean;
  currentPhase: SyncPhase;
}

export class CheckpointValidationError extends Error {
  constructor(
    message: string,
    public readonly reason: ValidationReason,
    public readonly isRecoverable: boolean
  ) {
    super(message);
    this.name = 'CheckpointValidationError';
  }
}

export type ValidationReason =
  | 'file_not_found'
  | 'json_parse_error'
  | 'missing_required_field'
  | 'invalid_format'
  | 'missing_optional_field'
  | 'stale_checkpoint'
  | 'inconsistent_data'
  | 'concurrent_sync';
```

---

## Next Steps

1. Update `src/types.ts` with new type definitions
2. Implement `CheckpointManager` service with validation logic
3. Integrate checkpoint lifecycle into `SyncService`
4. Write unit tests for validation and error handling
