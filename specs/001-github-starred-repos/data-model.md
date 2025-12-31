# Data Model: GitHub Starred Repositories Manager

**Feature**: GitHub Starred Repositories Manager
**Date**: 2025-12-30
**Phase**: 1 - Design & Contracts

## Overview

This document defines the data model for the GitHub Starred Repositories Manager plugin. All entities are designed to support the functional requirements while maintaining data integrity and supporting efficient queries.

## Entities

### 1. Repository

**Description**: A GitHub repository that the user has starred. This is the core entity of the plugin.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | GitHub node ID (global unique identifier) | Required, immutable |
| `name` | string | Repository name | Required, max 100 chars |
| `nameWithOwner` | string | Full name with owner (e.g., "facebook/react") | Required |
| `description` | string \| null | Repository description | Optional, max 500 chars |
| `url` | string | GitHub repository URL | Required, valid URL |
| `starCount` | number | Total number of stars | Required, >= 0 |
| `primaryLanguage` | string \| null | Main programming language | Optional |
| `owner` | string | Repository owner login | Required |
| `createdAt` | ISO8601 datetime | Repository creation timestamp | Required |
| `updatedAt` | ISO8601 datetime | Last update timestamp | Required |
| `starredAt` | ISO8601 datetime | When user starred this repo | Required |
| `readme` | string \| null | README.md content in markdown | Optional |
| `tags` | string[] | Array of tag names applied to this repo | Optional |
| `linkedResources` | LinkedResource[] | External documentation links | Optional |

**Primary Key**: `id` (GitHub node ID)

**Indexes**:
- `nameWithOwner` (for quick lookup)
- `tags` (for filtering)
- `primaryLanguage` (for filtering)
- `starredAt` (for sorting)

**Validation Rules**:
- `id` must be a valid GitHub node ID (format: `MDEwOlJlcG9zaXRvcnkx...`)
- `url` must be a valid GitHub repository URL
- `starCount` cannot be negative
- `tags` must reference existing Tag entities
- `linkedResources` must have valid URLs

**State Transitions**:
- Repository can be synced (data updated from GitHub)
- Repository can be un-starred (marked as unstarred but retained locally)
- Repository can have tags added/removed
- Repository can have linked resources added/removed

**Example**:
```json
{
  "id": "MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw",
  "name": "react",
  "nameWithOwner": "facebook/react",
  "description": "A declarative JavaScript library for building user interfaces",
  "url": "https://github.com/facebook/react",
  "starCount": 180000,
  "primaryLanguage": "JavaScript",
  "owner": "facebook",
  "createdAt": "2013-05-24T15:12:33Z",
  "updatedAt": "2025-12-30T10:30:00Z",
  "starredAt": "2025-12-30T12:00:00Z",
  "readme": "# React\n\nA declarative...",
  "tags": ["frontend", "library", "ui"],
  "linkedResources": [
    {
      "url": "https://codewiki.google/internal-docs",
      "title": "Internal React Documentation",
      "addedAt": "2025-12-30T12:00:00Z"
    }
  ]
}
```

---

### 2. Tag

**Description**: A user-created label for categorizing repositories. Tags provide flexible organization beyond language-based filtering.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `id` | string | Unique tag identifier (UUID) | Required, immutable |
| `name` | string | Tag name | Required, unique, max 50 chars |
| `color` | string \| null | Hex color code for UI display | Optional, format #RRGGBB |
| `createdAt` | ISO8601 datetime | Tag creation timestamp | Required |
| `description` | string \| null | Tag description | Optional, max 200 chars |

**Primary Key**: `id`

**Unique Constraint**: `name` (tag names must be unique)

**Validation Rules**:
- `name` must be unique across all tags
- `name` cannot be empty or contain only whitespace
- `color` must be valid hex color code if provided
- `name` should be alphanumeric with hyphens/underscores allowed

**State Transitions**:
- Tag can be created
- Tag can be renamed (updates all repositories using this tag)
- Tag can be deleted (removes tag from all repositories)

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "frontend",
  "color": "#3498db",
  "createdAt": "2025-12-30T12:00:00Z",
  "description": "Frontend web development libraries and frameworks"
}
```

---

### 3. RepositoryNote

**Description**: User-written content associated with a specific repository. Notes capture user's reasoning, context, and experimentation.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `repositoryId` | string | GitHub node ID of associated repository | Required, foreign key |
| `content` | string | Note content in markdown format | Required |
| `createdAt` | ISO8601 datetime | Note creation timestamp | Required |
| `updatedAt` | ISO8601 datetime | Last update timestamp | Required |

**Primary Key**: `repositoryId` (one-to-one relationship with Repository)

**Foreign Key**: `repositoryId` → Repository.id

**Validation Rules**:
- `repositoryId` must reference an existing Repository
- `content` cannot be empty
- `content` supports markdown formatting
- `updatedAt` must be >= `createdAt`

**State Transitions**:
- Note can be created
- Note can be edited
- Note can be deleted

**Example**:
```json
{
  "repositoryId": "MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw",
  "content": "# Why I starred this repo\n\nUsing this for my new project. Great component model.\n\n## Notes\n- Remember to check out Hooks API\n- Consider Server Components for next version",
  "createdAt": "2025-12-30T12:00:00Z",
  "updatedAt": "2025-12-30T14:30:00Z"
}
```

---

### 4. LinkedResource

**Description**: A URL pointing to external documentation or resources associated with a repository. Links resources like Google Code Wiki pages, internal docs, or tutorials.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `url` | string | URL of the external resource | Required, valid URL |
| `title` | string | User-provided title for the resource | Required, max 100 chars |
| `addedAt` | ISO8601 datetime | When the resource was linked | Required |

**Primary Key**: Composite (`url`, `repositoryId` implicitly via parent)

**Validation Rules**:
- `url` must be valid HTTP/HTTPS URL
- `url` must be unique within a single repository
- `title` cannot be empty

**State Transitions**:
- Resource can be linked to a repository
- Resource can be removed from a repository
- Resource title can be edited

**Example**:
```json
{
  "url": "https://codewiki.google/internal-documentation",
  "title": "Internal React Architecture Docs",
  "addedAt": "2025-12-30T12:00:00Z"
}
```

---

### 5. PluginSettings

**Description**: Plugin-wide settings and preferences. Stored securely via Obsidian's data API.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `githubToken` | string | GitHub personal access token | Required, encrypted |
| `autoSyncEnabled` | boolean | Whether to automatically sync on plugin load | Required |
| `autoSyncIntervalMinutes` | number | Minutes between auto-sync (if enabled) | Optional, >= 30 |
| `lastSyncAt` | ISO8601 datetime \| null | Last successful sync timestamp | Optional |
| `maxRepositoryCacheSize` | number | Max repositories to cache in memory | Optional, >= 100 |

**Validation Rules**:
- `githubToken` must be valid GitHub personal access token format (40 chars, starts with `ghp_`)
- `autoSyncIntervalMinutes` must be >= 30 (minimum 30 minutes)
- `maxRepositoryCacheSize` must be >= 100

**Example**:
```json
{
  "githubToken": "ghp_1234567890abcdef1234567890abcdef12345678",
  "autoSyncEnabled": false,
  "autoSyncIntervalMinutes": 60,
  "lastSyncAt": "2025-12-30T12:00:00Z",
  "maxRepositoryCacheSize": 1000
}
```

---

### 6. SyncState

**Description**: Tracks synchronization state and progress.

**Fields**:

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `isSyncing` | boolean | Whether sync is currently in progress | Required |
| `syncProgress` | number | Number of repos processed in current sync | Required, >= 0 |
| `syncTotal` | number | Total number of repos to sync | Required, >= 0 |
| `lastError` | string \| null | Last sync error message | Optional |
| `syncedAt` | ISO8601 datetime \| null | Last successful sync completion | Optional |

**Validation Rules**:
- `syncProgress` must be <= `syncTotal`
- `isSyncing` false when `syncProgress` == `syncTotal`

**Example**:
```json
{
  "isSyncing": true,
  "syncProgress": 45,
  "syncTotal": 100,
  "lastError": null,
  "syncedAt": "2025-12-30T10:00:00Z"
}
```

---

## Relationships

```
Repository (1) ←→ (0..1) RepositoryNote
     ↑
     |
     | (applied to)
     |
     ↓
   Tag (0..*) ─── (applied to) ──→ (0..*) Repository

Repository (1) ←→ (0..*) LinkedResource
```

**Relationship Rules**:
- Each Repository has at most one RepositoryNote
- Each RepositoryNote belongs to exactly one Repository
- Each Tag can be applied to zero or more Repositories
- Each Repository can have zero or more Tags
- Each Repository can have zero or more LinkedResources
- Each LinkedResource belongs to exactly one Repository

---

## Data Storage Schema

### File: `.obsidian/plugins/github-stargazer/data/repositories.json`

```json
{
  "lastSync": "2025-12-30T12:00:00Z",
  "repositories": [
    // Repository objects (see Repository example above)
  ]
}
```

### File: `.obsidian/plugins/github-stargazer/data/tags.json`

```json
{
  "tags": [
    // Tag objects (see Tag example above)
  ]
}
```

### File: `github-stargazer-notes/{repository-id}.md`

Each markdown file contains a single RepositoryNote content (markdown format).

### File: `.obsidian/plugins/github-stargazer/data/settings.json`

```json
{
  // PluginSettings object (see PluginSettings example above)
}
```

### File: `.obsidian/plugins/github-stargazer/data/sync-state.json`

```json
{
  // SyncState object (see SyncState example above)
}
```

---

## Data Integrity Rules

1. **Referential Integrity**:
   - All `tags` arrays in Repository must reference existing Tag names
   - All `repositoryId` in RepositoryNote must reference existing Repository

2. **Cascading Deletes**:
   - When Tag is deleted: remove tag from all Repositories' `tags` arrays
   - When Repository is deleted: delete associated RepositoryNote markdown file

3. **Orphan Prevention**:
   - Cannot delete Tag if it would leave Repository with invalid tag reference (handled by cascading)

4. **Transaction Boundaries**:
   - Sync operation: update multiple Repositories atomically (write to temp file, then rename)
   - Tag operation: update Tag and all affected Repositories in single transaction

---

## Performance Considerations

1. **Indexing**:
   - Maintain in-memory index of Repositories by `id`, `nameWithOwner`, `tags`, `primaryLanguage`
   - Rebuild index on plugin load from JSON files

2. **Lazy Loading**:
   - Load all Repositories into memory on plugin load (acceptable for 1000 repos ~5MB)
   - Lazy load RepositoryNote content when user opens repository detail view

3. **Write Optimization**:
   - Batch write operations during sync (write every 100 repos)
   - Use atomic file operations (write temp, then rename) to prevent corruption

4. **Memory Management**:
   - Limit in-memory cache to `maxRepositoryCacheSize` (default 1000)
   - Evict least-recently-used repositories if limit exceeded
