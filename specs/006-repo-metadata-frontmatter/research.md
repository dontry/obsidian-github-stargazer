# Research: Repository Metadata as Frontmatter

**Feature**: 006-repo-metadata-frontmatter
**Date**: 2025-01-05
**Status**: Complete

## Overview

This document consolidates research findings and technical decisions for implementing repository metadata files with YAML frontmatter in the Obsidian GitHub Stargazer plugin.

---

## 1. YAML Frontmatter Best Practices in Obsidian

### Decision
Use Obsidian's built-in YAML frontmatter parser with standard `---` delimiters.

### Rationale
- Obsidian natively supports YAML frontmatter between `---` markers
- No additional dependencies required (keeps bundle size small)
- Proven reliability across the Obsidian ecosystem
- Automatic parsing and caching by Obsidian
- Works seamlessly with Dataview plugin for querying

### Alternatives Considered
- **js-yaml library**: Rejected - heavier, unnecessary dependency, Obsidian already handles this
- **Custom parsing**: Rejected - error-prone, reinventing the wheel, maintenance burden

### Implementation Details

**Format**:
```markdown
---
field1: value1
field2: value2
arrayField:
  - item1
  - item2
---

# Optional user content below
User notes go here...
```

**Escaping Rules** (for special characters):
- Strings containing quotes, colons, or newlines MUST be wrapped in double quotes
- Example: `description: "Project with \"quotes\" and: colons"`
- Example: `description: "Multi-line\nstring\nhere"`
- Boolean values: `true` or `false` (lowercase)
- Null values: `null` or empty field
- Arrays: Use YAML list syntax with `-` prefix

**Frontmatter Update Strategy**:
```typescript
// Detect and replace frontmatter only
const frontmatterRegex = /^---\n[\s\S]*?\n---/;
const newContent = content.replace(frontmatterRegex, newFrontmatter);
```

**Edge Cases**:
- Missing frontmatter: Insert at the beginning of file
- Malformed frontmatter: Replace entire frontmatter block
- User content below frontmatter: Preserve exactly as-is

**References**:
- Obsidian Documentation: https://help.obsidian.md/Editing+and+formatting/Obsidian+Flavored+Markdown
- YAML Specification: https://yaml.org/spec/

---

## 2. File Path Sanitization for Cross-Platform Compatibility

### Decision
Implement custom sanitization in `PathUtils` class replacing invalid characters with `-`, handling spaces, and truncating long paths.

### Rationale
- Obsidian runs on Windows, macOS, and Linux with different filesystem restrictions
- Custom implementation gives full control over sanitization logic
- No additional dependencies (slugify libraries add bundle size)
- Consistent behavior across all platforms

### Alternatives Considered
- **slugify library**: Rejected - unnecessary dependency, adds ~10KB to bundle
- **OS-specific checks**: Rejected - complex, harder to maintain, platform-specific code paths

### Implementation Details

**Invalid Characters by Platform**:
- Windows: `< > : " / \ | ? *` (plus reserved names: CON, PRN, AUX, NUL, COM1-9)
- macOS: `:` (colon used as path separator)
- Linux: `/` (forward slash)
- **Universal Invalid**: `/ \ : * ? " < > |`

**Sanitization Rules**:
```typescript
function sanitizePathSegment(segment: string): string {
  // Replace all invalid characters with hyphen
  let sanitized = segment.replace(/[\\/:*?"<>|]/g, '-');

  // Handle multiple consecutive hyphens
  sanitized = sanitized.replace(/-+/g, '-');

  // Remove leading/trailing hyphens
  sanitized = sanitized.trim().replace(/^-+|-+$/g, '');

  // Handle empty string (if all chars were invalid)
  if (sanitized.length === 0) {
    sanitized = 'unnamed';
  }

  // Truncate to prevent filesystem path length issues
  // Keep under 255 chars for Windows compatibility
  const MAX_LENGTH = 200; // Conservative limit
  if (sanitized.length > MAX_LENGTH) {
    sanitized = sanitized.substring(0, MAX_LENGTH);
  }

  return sanitized;
}
```

**Filename Generation**:
```typescript
function generateMetadataFileName(owner: string, repo: string): string {
  const sanitizedOwner = sanitizePathSegment(owner);
  const sanitizedRepo = sanitizePathSegment(repo);
  return `${sanitizedOwner}-${sanitizedRepo}-metadata.md`;
}

function generateReadmeFileName(owner: string, repo: string): string {
  const sanitizedOwner = sanitizePathSegment(owner);
  const sanitizedRepo = sanitizePathSegment(repo);
  return `${sanitizedOwner}-${sanitizedRepo}-readme.md`;
}
```

**Directory Structure**:
```typescript
function generateRepositoryPath(owner: string, repo: string): string {
  const sanitizedOwner = sanitizePathSegment(owner);
  const sanitizedRepo = sanitizePathSegment(repo);
  return `${sanitizedOwner}/${sanitizedRepo}`;
}
```

**Edge Cases**:
- **Very long repository names**: Truncate each segment to 200 chars
- **Special characters only**: Fallback to "unnamed" prefix
- **Reserved Windows names** (CON, PRN, etc.): Append `-repo` suffix
- **Same owner/repo with different cases**: Preserve original case in path
- **Unicode characters**: Preserve (modern filesystems support UTF-8)

**Examples**:
- `owner/repo` → `owner/repo/owner-repo-metadata.md`
- `foo/bar/baz` → `foo/bar-baz/foo-bar-baz-metadata.md`
- `user/repo:name` → `user/repo-name/user-repo-name-metadata.md`
- `a very long repo name that exceeds limits` → `a-very-long-repo-name-that-exceeds-limits/a-very-long-repo-name-that-exceeds-limits-metadata.md`

---

## 3. GitHub API Metadata Fields

### Decision
Use existing GitHub GraphQL API query from `graphql-queries.ts`, extract all required fields for frontmatter.

### Rationale
- GraphQL already implemented and efficient
- Single API call per repository fetches all needed data
- Existing infrastructure (GitHub client, rate limiting, error handling)
- Type-safe with TypeScript interfaces

### Alternatives Considered
- **REST API**: Rejected - requires multiple API calls per repo, less efficient
- **New GraphQL query**: Rejected - unnecessary complexity, existing query sufficient

### Implementation Details

**Required Fields** (from FR-002):

| Frontmatter Field | GraphQL Field | Type | Description |
|-------------------|---------------|------|-------------|
| `name` | `name` | string | Repository name |
| `fullName` | `nameWithOwner` | string | "owner/repo" format |
| `description` | `description` | string \| null | Repository description |
| `starCount` | `stargazerCount` | number | Total stars |
| `language` | `languages` (first) | string \| null | Primary language |
| `primaryLanguage` | `primaryLanguage` | object \| null | Language with color |
| `topics` | `repositoryTopics` | string[] | Topic names |
| `url` | `url` | string | GitHub URL |
| `ownerLogin` | `owner.login` | string | Owner username |
| `createdAt` | `createdAt` | string | ISO8601 timestamp |
| `updatedAt` | `updatedAt` | string | ISO8601 timestamp |
| `homepageUrl` | `homepageUrl` | string \| null | Custom homepage |
| `license` | `licenseInfo.spdxId` | string \| null | License identifier |
| `forkCount` | `forkCount` | number | Total forks |
| `openIssuesCount` | `issues.totalCount` | number | Open issues |
| `watchersCount` | `watchers.totalCount` | number | Total watchers |

**Data Extraction**:
```typescript
function extractMetadataFromGraphQL(graphqlData: any): RepositoryMetadata {
  return {
    name: graphqlData.name,
    fullName: graphqlData.nameWithOwner,
    description: graphqlData.description,
    starCount: graphqlData.stargazerCount,
    language: graphqlData.languages?.nodes?.[0]?.name || null,
    primaryLanguage: graphqlData.primaryLanguage?.name || null,
    topics: graphqlData.repositoryTopics?.nodes?.map(n => n.topic.name) || [],
    url: graphqlData.url,
    ownerLogin: graphqlData.owner.login,
    createdAt: graphqlData.createdAt,
    updatedAt: graphqlData.updatedAt,
    homepageUrl: graphqlData.homepageUrl,
    license: graphqlData.licenseInfo?.spdxId || null,
    forkCount: graphqlData.forkCount,
    openIssuesCount: graphqlData.issues.totalCount,
    watchersCount: graphqlData.watchers.totalCount,
  };
}
```

**GraphQL Query** (existing, may need minor additions):
```graphql
query GetRepository($owner: String!, $name: String!) {
  repository(owner: $owner, name: $name) {
    name
    nameWithOwner
    description
    stargazerCount
    primaryLanguage {
      name
    }
    url
    owner {
      login
    }
    createdAt
    updatedAt
    homepageUrl
    licenseInfo {
      spdxId
    }
    forkCount
    issues {
      totalCount
    }
    watchers {
      totalCount
    }
    # Additional fields if needed
  }
}
```

---

## 4. User Edit Preservation Strategy

### Decision
Detect frontmatter boundaries (between `---` markers), preserve content below, replace frontmatter only during updates.

### Rationale
- Users may add personal notes below frontmatter
- Preserves user content while keeping metadata up-to-date
- Clean separation between generated metadata and user content
- Prevents accidental data loss

### Alternatives Considered
- **Full file replacement**: Rejected - loses user notes, poor UX
- **Append mode**: Rejected - duplicates metadata on each update, messy
- **Diff-based merge**: Rejected - overcomplicated, merge conflicts likely

### Implementation Details

**Update Algorithm**:
```typescript
async function updateMetadataFile(
  file: TFile,
  newFrontmatter: string
): Promise<void> {
  // Read current file content
  const content = await this.app.vault.read(file);

  // Detect existing frontmatter
  const frontmatterRegex = /^---\n[\s\S]*?\n---/;
  const hasFrontmatter = frontmatterRegex.test(content);

  if (hasFrontmatter) {
    // Replace frontmatter, preserve user content
    const updatedContent = content.replace(
      frontmatterRegex,
      newFrontmatter
    );
    await this.app.vault.modify(file, updatedContent);
  } else {
    // No frontmatter exists, prepend it
    const updatedContent = `${newFrontmatter}\n\n${content}`;
    await this.app.vault.modify(file, updatedContent);
  }
}
```

**Frontmatter Format**:
```typescript
function generateFrontmatter(metadata: RepositoryMetadata): string {
  const lines: string[] = ['---'];

  // Add all fields (order stable for consistency)
  lines.push(`name: ${escapeYaml(metadata.name)}`);
  lines.push(`fullName: ${escapeYaml(metadata.fullName)}`);
  lines.push(`description: ${escapeYaml(metadata.description)}`);
  lines.push(`starCount: ${metadata.starCount}`);
  // ... all other fields

  // Add topics array
  if (metadata.topics.length > 0) {
    lines.push('topics:');
    metadata.topics.forEach(topic => {
      lines.push(`  - ${escapeYaml(topic)}`);
    });
  }

  lines.push('---');
  return lines.join('\n');
}
```

**YAML Escaping**:
```typescript
function escapeYaml(value: any): string {
  if (value === null || value === undefined) {
    return 'null';
  }

  const str = String(value);

  // Check if value needs quoting
  const needsQuotes = /[:"'\n\r\t]|^null$|^true$|^false$/.test(str);

  if (needsQuotes) {
    // Escape quotes and backslashes
    const escaped = str.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    return `"${escaped}"`;
  }

  return str;
}
```

**Edge Cases**:
- **No frontmatter exists**: Prepend new frontmatter (don't lose user content)
- **Malformed frontmatter**: Replace entire block (best effort recovery)
- **User edited frontmatter**: Overwrite user edits (metadata is source of truth)
- **Empty file**: Create with frontmatter only (user can add notes later)
- **Binary characters**: Strip or replace (Obsidian doesn't support binary in markdown)

---

## 5. Unstar Detection and Cleanup Flow

### Decision
Compare current starred list with local state, show Obsidian modal confirmation using Notice API, delete files if user confirms.

### Rationale
- Obsidian's modal API provides user-friendly confirmation dialog
- Prevents accidental data loss from unstar action
- Users can cancel if they change their mind
- Clear communication about what will be deleted

### Alternatives Considered
- **Silent deletion**: Rejected - unsafe, unexpected data loss
- **Auto-delete with undo**: Rejected - complex UX, requires tracking deleted files
- **Soft delete with marker**: Rejected - cluttered vault, confusing state

### Implementation Details

**Detection Logic**:
```typescript
async function detectUnstarredRepos(
  currentStarred: Set<string>,
  localRepos: Repository[]
): Promise<Repository[]> {
  return localRepos.filter(repo =>
    !currentStarred.has(repo.nameWithOwner) &&
    !repo.isUnstarred
  );
}
```

**Confirmation Modal**:
```typescript
async function promptForDeletion(repos: Repository[]): Promise<boolean> {
  const repoCount = repos.length;
  const repoList = repos.map(r => r.nameWithOwner).join('\n');

  return new Promise((resolve) => {
    const modal = new ConfirmationModal(this.app, {
      title: 'Delete Unstarred Repository Files?',
      message: `You have unstarred ${repoCount} repository(ies):\n\n${repoList}\n\nDelete the local files?`,
      onConfirm: () => resolve(true),
      onCancel: () => resolve(false),
    });
    modal.open();
  });
}
```

**Deletion Logic**:
```typescript
async function deleteRepositoryFiles(repo: Repository): Promise<void> {
  const metadataPath = repo.metadataFilePath;
  const readmePath = repo.readmeVaultFilePath;

  const results: FileOperationResult[] = [];

  // Delete metadata file
  if (metadataPath) {
    try {
      await this.app.vault.adapter.remove(metadataPath);
      results.push({ success: true, filePath: metadataPath, action: 'deleted' });
    } catch (error) {
      results.push({ success: false, filePath: metadataPath, error, action: 'deleted' });
    }
  }

  // Delete README file
  if (readmePath) {
    try {
      await this.app.vault.adapter.remove(readmePath);
      results.push({ success: true, filePath: readmePath, action: 'deleted' });
    } catch (error) {
      results.push({ success: false, filePath: readmePath, error, action: 'deleted' });
    }
  }

  // Remove owner directory if empty
  const ownerDir = this.getOwnerDirectory(repo.owner);
  try {
    const contents = await this.app.vault.adapter.list(ownerDir);
    if (contents.length === 0) {
      await this.app.vault.adapter.rmdir(ownerDir, true);
    }
  } catch (error) {
    // Directory removal failed, not critical
  }

  return results;
}
```

**User Flow**:
1. User unstars repository on GitHub
2. User runs sync in Obsidian plugin
3. Plugin detects unstarred repository
4. Plugin shows modal: "Delete unstarred repository files?"
5. User options:
   - **Confirm**: Delete both metadata and README files, remove empty owner directory
   - **Cancel**: Keep files, show prompt again on next sync
6. If confirmed: files deleted, local state updated
7. If canceled: files remain, will prompt again on next sync

**Edge Cases**:
- **User cancels**: Files remain, prompt shown again on next sync
- **Partial deletion** (e.g., only metadata exists): Delete what exists, continue
- **Directory not empty**: Keep directory with remaining files
- **User manually edited files**: Still delete (user had confirmation chance)
- **Network error during sync**: Don't delete (unsafe to act on stale data)
- **Multiple unstarred repos**: Show count in modal, list all repos

---

## Summary

All technical unknowns have been researched and decisions documented:

1. ✅ **YAML Frontmatter**: Using Obsidian's native parser with standard `---` delimiters
2. ✅ **Path Sanitization**: Custom implementation replacing invalid chars with `-`
3. ✅ **GitHub API**: Existing GraphQL query, extract required fields
4. ✅ **User Edit Preservation**: Detect frontmatter, preserve content below
5. ✅ **Unstar Cleanup**: Modal confirmation, then delete if confirmed

**Next Steps**:
- Create detailed data model in `data-model.md`
- Document internal API contracts in `contracts/`
- Write developer quickstart guide in `quickstart.md`
- Update agent context via `.specify/scripts/bash/update-agent-context.sh claude`
