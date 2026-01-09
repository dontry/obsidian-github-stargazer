# Task Generation Context for 006-repo-metadata-frontmatter

## Feature Summary
Add repository metadata files with YAML frontmatter alongside existing README files in owner/repository-name/ directory structure with unique naming.

## User Stories
1. **US1 (P1)**: Repository Metadata with Frontmatter - Core value: making metadata queryable via Dataview
2. **US2 (P2)**: Structured README File Organization - Improved file organization

## Technical Stack
- TypeScript 5.3+ strict mode
- Obsidian API
- Vitest (TDD approach - tests before implementation)
- Existing sync infrastructure

## Key Files to Create
- src/sync/metadata-generator.ts
- src/utils/path-utils.ts
- src/utils/file-manager.ts

## Key Files to Modify
- src/types.ts
- src/sync/readme-fetcher.ts
- src/sync/sync-service.ts

## Testing Required
- TDD approach: Unit tests MUST be written first and fail before implementation
- tests/unit/utils/path-utils.test.ts
- tests/unit/utils/file-manager.test.ts
- tests/unit/sync/metadata-generator.test.ts
- tests/integration/metadata-sync.test.ts

## Data Model Entities
1. RepositoryMetadata (new)
2. FileOperationResult (new)
3. RepositoryMetadataFile (new)
4. MetadataSyncOptions (new)
5. Repository interface extension
