# Quickstart Guide: Repository Metadata as Frontmatter

**Feature**: 006-repo-metadata-frontmatter
**Audience**: Developers working on the Obsidian GitHub Stargazer plugin
**Last Updated**: 2025-01-05

## Overview

This guide helps developers quickly understand, test, and contribute to the repository metadata frontmatter feature. This feature adds structured YAML frontmatter to repository files, enabling powerful querying via Obsidian plugins like Dataview.

---

## Prerequisites

### Required

- **Node.js**: 18.0.0 or higher
- **pnpm**: 9.0.0 or higher (package manager)
- **Git**: For cloning the repository
- **TypeScript Knowledge**: Familiarity with TS 5.3+ and strict mode
- **Obsidian**: Desktop app for testing

### Recommended

- **VS Code**: With TypeScript and ESLint extensions
- **Dataview Plugin**: For testing metadata queries
- **GitHub Account**: With starred repositories to sync

---

## Setup (5 minutes)

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/YOUR-USERNAME/obsidian-github-stargazer.git
cd obsidian-github-stargazer

# Install dependencies
pnpm install
```

### 2. Build the Plugin

```bash
# Development build with hot reload
pnpm dev

# Or production build
pnpm build
```

### 3. Run Tests

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test:coverage

# Run with UI
pnpm test:ui
```

### 4. Lint Code

```bash
# Check for lint errors
pnpm lint

# Auto-fix lint errors
pnpm lint:fix
```

---

## Development Workflow

### File Structure

Key files for this feature:

```
src/
├── sync/
│   ├── metadata-generator.ts         # NEW - YAML frontmatter generation
│   ├── readme-fetcher.ts             # MODIFIED - path structure changes
│   └── sync-service.ts               # MODIFIED - orchestration
├── utils/
│   ├── path-utils.ts                 # NEW - file path utilities
│   └── file-manager.ts               # NEW - file operations
└── types.ts                          # MODIFIED - new interfaces
```

### Development Commands

```bash
# Watch mode (recommended for development)
pnpm dev

# In another terminal, run tests in watch mode
pnpm test --watch

# Check TypeScript compilation
tsc -noEmit

# Build and test together
pnpm build && pnpm test
```

---

## Testing the Feature

### 1. Set Up Test Vault

1. Create a new test vault in Obsidian
2. Enable the Community Plugins setting
3. Browse to your plugin's build output folder
4. Enable "GitHub Stargazer" plugin
5. Configure your GitHub personal access token in plugin settings

### 2. Sync Starred Repositories

1. Open Command Palette in Obsidian (`Ctrl/Cmd + P`)
2. Run "Sync Starred Repositories" command
3. Wait for sync to complete (check progress notices)
4. Navigate to your vault root in File Explorer

### 3. Verify Metadata Files

You should see directories like:

```
vault-root/
├── facebook/
│   └── react/
│       ├── facebook-react-metadata.md
│       └── facebook-react-readme.md
├── google/
│   └── tensorflow/
│       ├── google-tensorflow-metadata.md
│       └── google-tensorflow-readme.md
```

### 4. Inspect Metadata File

Open `facebook-react-metadata.md`. You should see:

```markdown
---
name: react
fullName: facebook/react
description: "A declarative JavaScript library for building user interfaces"
starCount: 220000
language: JavaScript
topics:
  - library
  - javascript
url: https://github.com/facebook/react
ownerLogin: facebook
createdAt: 2013-05-24T16:15:32Z
updatedAt: 2025-01-05T10:30:00Z
license: MIT
---

# Your Notes Here
```

### 5. Query with Dataview

Install the Dataview plugin and create a note with:

```dataview
TABLE name, starCount, language, topics
FROM "github-stargazer"
WHERE starCount > 1000
SORT starCount DESC
```

This should return a table of your starred repositories with metadata!

---

## Writing Tests

### Unit Tests (TDD Approach)

**File**: `tests/unit/utils/path-utils.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { sanitizePathSegment, generateMetadataFilePath } from '@/utils/path-utils';

describe('PathUtils', () => {
  describe('sanitizePathSegment', () => {
    it('should replace invalid characters with hyphens', () => {
      expect(sanitizePathSegment('repo:name')).toBe('repo-name');
      expect(sanitizePathSegment('foo/bar')).toBe('foo-bar');
    });

    it('should handle spaces', () => {
      expect(sanitizePathSegment('my repo')).toBe('my-repo');
    });

    it('should handle very long names', () => {
      const longName = 'a'.repeat(300);
      const result = sanitizePathSegment(longName);
      expect(result.length).toBeLessThanOrEqual(200);
    });

    it('should handle empty string after sanitization', () => {
      expect(sanitizePathSegment('---')).toBe('unnamed');
    });
  });

  describe('generateMetadataFilePath', () => {
    it('should generate correct path for owner/repo', () => {
      const path = generateMetadataFilePath('facebook', 'react');
      expect(path).toBe('facebook/react/facebook-react-metadata.md');
    });

    it('should sanitize owner and repo names', () => {
      const path = generateMetadataFilePath('foo/bar', 'repo:name');
      expect(path).toBe('foo-bar/repo-name/foo-bar-repo-name-metadata.md');
    });
  });
});
```

### Integration Tests

**File**: `tests/integration/metadata-sync.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataGenerator } from '@/sync/metadata-generator';
import type { Repository } from '@/types';

describe('Metadata Sync Integration', () => {
  let metadataGenerator: MetadataGenerator;

  beforeEach(() => {
    metadataGenerator = new MetadataGenerator();
  });

  it('should create metadata file for a repository', async () => {
    const repo: Repository = {
      id: 'test-id',
      name: 'react',
      nameWithOwner: 'facebook/react',
      description: 'A JavaScript library',
      starCount: 220000,
      primaryLanguage: { name: 'JavaScript', color: '#f1e05a' },
      owner: 'facebook',
      topics: [],
      createdAt: '2013-05-24T16:15:32Z',
      updatedAt: '2025-01-05T10:30:00Z',
      starredAt: '2024-01-01T00:00:00Z',
      linkedResources: [],
    };

    const frontmatter = metadataGenerator.generateFrontmatter(repo);

    expect(frontmatter).toContain('name: react');
    expect(frontmatter).toContain('fullName: facebook/react');
    expect(frontmatter).toContain('starCount: 220000');
    expect(frontmatter).toMatch(/^---\n[\s\S]*?\n---$/); // Valid frontmatter delimiters
  });
});
```

### Running Tests

```bash
# Run all tests
pnpm test

# Run specific file
pnpm test path-utils.test.ts

# Run tests in watch mode
pnpm test --watch

# Run with coverage
pnpm test:coverage
```

---

## Common Tasks

### Add a New Metadata Field

1. **Update Type** (`src/types.ts`):
   ```typescript
   export interface RepositoryMetadata {
     // ... existing fields
     newField: string | null; // Add here
   }
   ```

2. **Update Generator** (`src/sync/metadata-generator.ts`):
   ```typescript
   function generateFrontmatter(repo: Repository): string {
     // ... existing code
     lines.push(`newField: ${escapeYaml(repo.newField)}`);
   }
   ```

3. **Add Tests** (`tests/unit/sync/metadata-generator.test.ts`):
   ```typescript
   it('should include newField in frontmatter', () => {
     // Test implementation
   });
   ```

### Debug Path Generation

```typescript
// Add logging in path-utils.ts
import { log } from '@/utils/log';

export function generateMetadataFilePath(owner: string, repo: string): string {
  const sanitizedOwner = sanitizePathSegment(owner);
  const sanitizedRepo = sanitizePathSegment(repo);
  const path = `${sanitizedOwner}/${sanitizedRepo}/${sanitizedOwner}-${sanitizedRepo}-metadata.md`;

  log.debug(`Generated metadata path: ${path}`);
  return path;
}
```

### Test YAML Escaping

```typescript
import { escapeYaml } from '@/sync/metadata-generator';

describe('escapeYaml', () => {
  it('should escape strings with quotes', () => {
    expect(escapeYaml('Project "quoted" name'))
      .toBe('"Project \\"quoted\\" name"');
  });

  it('should escape strings with colons', () => {
    expect(escapeYaml('ratio: 2:1'))
      .toBe('"ratio: 2:1"');
  });

  it('should escape multi-line strings', () => {
    expect(escapeYaml('Line 1\nLine 2'))
      .toBe('"Line 1\\nLine 2"');
  });
});
```

---

## Troubleshooting

### Metadata Files Not Created

**Symptoms**: Sync completes but no metadata files appear.

**Solutions**:
1. Check plugin settings: Ensure GitHub token is valid
2. Check console: Look for error messages in Developer Tools
3. Verify sync: Run sync again and watch for progress notices
4. Check file path: Verify vault path in plugin settings

### YAML Frontmatter Invalid

**Symptoms**: Obsidian shows "Invalid YAML" error.

**Solutions**:
1. Check escaping: Verify special characters are properly quoted
2. Check delimiters: Ensure `---` markers are present
3. Check indentation: YAML requires proper spacing
4. Use YAML linter: https://www.yamllint.com/

### Tests Failing

**Symptoms**: `pnpm test` shows failures.

**Solutions**:
1. Check TypeScript: Run `tsc -noEmit` for type errors
2. Check mocks: Verify test mocks return expected data
3. Clear cache: Delete `node_modules/.vitest` cache
4. Update snapshots: If using snapshot tests, run `pnpm test -u`

---

## Code Style

### TypeScript Best Practices

```typescript
// ✅ GOOD: Explicit types, async/await, error handling
async function createMetadataFile(
  repo: Repository
): Promise<FileOperationResult> {
  try {
    const frontmatter = generateFrontmatter(repo);
    const filePath = generateMetadataFilePath(repo.owner, repo.name);
    await this.vault.create(filePath, frontmatter);
    return { success: true, filePath, action: 'created', error: null };
  } catch (error) {
    return {
      success: false,
      filePath: '',
      action: 'created',
      error: error as Error,
      message: `Failed to create metadata file: ${error.message}`,
    };
  }
}

// ❌ BAD: any types, promise chains, no error handling
function createMetadataFile(repo: any): Promise<any> {
  return generateFrontmatter(repo)
    .then(fm => this.vault.create(fm))
    .catch(err => console.error(err));
}
```

### File Organization

```typescript
// File: src/sync/metadata-generator.ts
/**
 * Metadata Generator - Creates YAML frontmatter for repositories
 */

// 1. Imports
import type { Repository } from '@/types';

// 2. Constants
const FRONTMATTER_DELIMITER = '---';

// 3. Types (if file-specific)
export interface MetadataGeneratorOptions {
  includeTopics?: boolean;
}

// 4. Class definition
export class MetadataGenerator {
  // 5. Public methods
  public generateFrontmatter(repo: Repository): string {
    // Implementation
  }

  // 6. Private helpers
  private escapeYaml(value: any): string {
    // Implementation
  }
}
```

---

## Contributing

### Before Committing

```bash
# 1. Run tests
pnpm test

# 2. Run linter
pnpm lint

# 3. Fix any errors
pnpm lint:fix

# 4. Build to verify no TypeScript errors
pnpm build
```

### Commit Message Format

```
feat(metadata): add YAML frontmatter generation

- Implement MetadataGenerator class
- Add path sanitization utilities
- Include unit tests for edge cases

Closes #123
```

---

## Resources

### Documentation

- **Obsidian API**: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
- **TypeScript**: https://www.typescriptlang.org/docs/
- **Vitest**: https://vitest.dev/
- **YAML Spec**: https://yaml.org/spec/

### Related Code

- Existing sync service: `src/sync/sync-service.ts`
- README fetcher: `src/sync/readme-fetcher.ts`
- GitHub client: `src/sync/github-client.ts`
- File storage: `src/storage/vault-file-manager.ts`

### Key Files to Understand

1. **`src/types.ts`** - All type definitions
2. **`src/sync/graphql-queries.ts`** - GitHub GraphQL queries
3. **`src/utils/validation.ts`** - Existing validation logic
4. **`src/utils/sha.ts`** - SHA generation for change detection

---

## FAQ

**Q: Why use YAML frontmatter instead of JSON?**
A: Obsidian natively supports YAML frontmatter, making it queryable via Dataview. JSON would require custom parsing.

**Q: What happens if a repository has no description?**
A: The `description` field will be `null`, which is valid YAML. The field will appear as `description: null` in the frontmatter.

**Q: Can users edit the frontmatter?**
A: Users can edit the frontmatter, but their changes will be overwritten on the next sync. Users should add notes below the frontmatter to preserve them.

**Q: How are duplicate repositories handled?**
A: Each repository is unique by `nameWithOwner` (e.g., `facebook/react` vs `google/react`). Duplicate detection uses this field.

**Q: What if the GitHub API rate limits?**
A: The existing rate limiter (`src/sync/rate-limiter.ts`) handles retries. Sync will pause and resume when limits reset.

---

## Quick Reference

### Commands

```bash
pnpm dev          # Development build with watch
pnpm build        # Production build
pnpm test         # Run all tests
pnpm test:watch   # Watch mode
pnpm lint         # Check code style
pnpm lint:fix     # Fix code style issues
```

### File Paths

```
Plugin root: /Volumes/external-storage/projects/obsidian-github-stargazer
Source code: ./src
Tests: ./tests
Build output: ./main.js
Spec docs: ./specs/006-repo-metadata-frontmatter
```

### Key Interfaces

```typescript
RepositoryMetadata        // Frontmatter data
FileOperationResult       // Operation status
RepositoryWithMetadata    // Extended repository
MetadataSyncOptions       // Sync configuration
```

---

**Need Help?**

- Check the existing code: `src/sync/` for similar patterns
- Read the research doc: `specs/006-repo-metadata-frontmatter/research.md`
- Review the data model: `specs/006-repo-metadata-frontmatter/data-model.md`
- Ask in project issues: https://github.com/YOUR-USERNAME/obsidian-github-stargazer/issues

Happy coding! 🚀
