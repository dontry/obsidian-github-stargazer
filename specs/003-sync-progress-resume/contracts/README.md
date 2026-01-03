# API Contracts: Sync Progress Tracking & Resume

**Feature**: Sync Progress Tracking & Resume (003-sync-progress-resume)
**Date**: 2025-01-02

## Overview

This feature is **internal to the plugin** and does not expose external APIs or endpoints. All checkpoint management, validation, and lifecycle operations are handled by internal TypeScript services within the plugin codebase.

## Internal Service Interfaces

### CheckpointManager Service

**Location**: `src/sync/checkpoint-manager.ts`

**Purpose**: Manages checkpoint file I/O, validation, and lifecycle.

**Public Methods** (internal to plugin):

```typescript
class CheckpointManager {
  constructor(private vault: Vault);

  async loadCheckpoint(): Promise<SyncCheckpoint | null>;
  // Load checkpoint from plugin data directory.
  // Returns null if file not found.
  // Throws CheckpointValidationError if corrupted or invalid.

  async saveCheckpoint(checkpoint: SyncCheckpoint): Promise<void>;
  // Atomically write checkpoint to file.
  // Uses temp file + rename pattern.

  async deleteCheckpoint(): Promise<void>;
  // Remove checkpoint file from filesystem.
  // Called after successful sync completion.

  validateCheckpoint(checkpoint: unknown): SyncCheckpoint;
  // Validate checkpoint structure and data consistency.
  // Throws CheckpointValidationError with detailed reason.

  isStale(checkpoint: SyncCheckpoint): boolean;
  // Check if checkpoint is older than 7 days.
  // Used for warning user before resume.
}
```

### Extended SyncService Methods

**Location**: `src/sync/sync-service.ts`

**Purpose**: Orchestrates sync operations with checkpoint support.

**Modified/Added Methods**:

```typescript
class SyncService {
  async sync(options: { force?: boolean }): Promise<void>;
  // Main sync method.
  // Added force option to ignore existing checkpoint (FR-014).

  private async syncWithResume(): Promise<void>;
  // NEW: Check for checkpoint, prompt user, resume or start fresh.

  private async syncFresh(): Promise<void>;
  // NEW: Start sync from beginning, create new checkpoint.

  private async fetchPageWithRetry(cursor: string | null): Promise<PageResult>;
  // NEW: Fetch page with exponential backoff retry (FR-026, FR-027).
  // Retries up to 3 times with 1s, 2s, 4s delays.

  private async updateCheckpoint(repositories: RepositoryMetadata[]): Promise<void>;
  // NEW: Update checkpoint with fetched repositories.

  private async convertIncremental(repositories: RepositoryMetadata[]): Promise<void>;
  // NEW: Convert repositories to final storage incrementally (FR-010).
}
```

### Extended GitHubGraphQLClient Methods

**Location**: `src/sync/github-client.ts`

**Purpose**: GraphQL API client with retry logic.

**Modified Methods**:

```typescript
class GitHubGraphQLClient {
  async fetchStarredRepositories(
    cursor: string | null,
    count: number
  ): Promise<PageResult>;
  // MODIFIED: Now wraps internal fetch with retry logic.

  async fetchTotalCount(): Promise<number>;
  // NEW: Fetch total count of starred repositories.

  private async fetchWithRetry<T>(
    fn: () => Promise<T>
  ): Promise<T>;
  // NEW: Internal retry wrapper with exponential backoff.
}
```

### UI Components

**Location**: `src/ui/checkpoint-modal.ts`

**Purpose**: Resume confirmation modal.

**Interface**:

```typescript
class ResumeConfirmationModal extends Modal {
  constructor(
    app: App,
    checkpoint: SyncCheckpoint,
    onResume: () => void,
    onFreshSync: () => void
  );

  onOpen(): void;
  // Display modal with checkpoint metadata and two buttons.

  onClose(): void;
  // Cleanup and close modal.
}
```

## No External Contracts

This feature does **not** introduce:
- ❌ REST API endpoints
- ❌ GraphQL schema changes (uses existing GitHub GraphQL API)
- ❌ Obsidian command API changes (extends existing sync command)
- ❌ Plugin settings schema changes (extends existing settings)

All changes are internal to the plugin codebase.
