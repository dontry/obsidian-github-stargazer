# Contracts: Repository Metadata Feature

**Feature**: 006-repo-metadata-frontmatter
**Status**: Internal Implementation (No Public API)

## Overview

This feature is an **internal implementation detail** of the Obsidian GitHub Stargazer plugin. It does not expose any public APIs, REST endpoints, or GraphQL schemas. Therefore, traditional API contracts (OpenAPI/Swagger, GraphQL schema) are **not applicable**.

## Internal API Contracts

Instead, the feature uses **TypeScript interfaces** as its contract definition:

### Primary Contracts

1. **Data Types** (`src/types.ts`)
   - `RepositoryMetadata` - Frontmatter data structure
   - `FileOperationResult` - Operation result structure
   - `RepositoryWithMetadata` - Extended repository interface
   - `MetadataSyncOptions` - Configuration options

2. **Service APIs** (TypeScript method signatures)
   - `MetadataGenerator.generateFrontmatter(repository: Repository): string`
   - `PathUtils.generateMetadataFilePath(owner: string, repo: string): string`
   - `PathUtils.generateReadmeFilePath(owner: string, repo: string): string`
   - `FileManager.createOrUpdateMetadataFile(filePath: string, frontmatter: string): Promise<FileOperationResult>`

3. **Data Flow Contracts**
   - Input: Repository data from GitHub GraphQL API
   - Processing: YAML frontmatter generation and file writing
   - Output: Markdown files with frontmatter in vault

## Contract Documentation Locations

- **Type Definitions**: `src/types.ts` (RepositoryMetadata, etc.)
- **Service Interfaces**: `src/sync/metadata-generator.ts`, `src/utils/path-utils.ts`, `src/utils/file-manager.ts`
- **Data Model**: `specs/006-repo-metadata-frontmatter/data-model.md`
- **Quickstart**: `specs/006-repo-metadata-frontmatter/quickstart.md`

## Why No Traditional API Contracts?

1. **Internal Plugin Feature**: This is not a web service or library
2. **TypeScript = Contract**: TypeScript interfaces provide compile-time contract enforcement
3. **No External Consumers**: Only consumed internally by the plugin
4. **Obsidian API**: The only external contract is Obsidian's plugin API (documented elsewhere)

## Testing the Contracts

Contracts are enforced through:

1. **TypeScript Compilation**: `tsc -noEmit -skipLibCheck`
2. **Unit Tests**: `tests/unit/` - Test each interface/implementation
3. **Integration Tests**: `tests/integration/` - Test end-to-end flows
4. **ESLint**: Code quality and style enforcement

## Related Documentation

- **Data Model**: Complete entity definitions and relationships
- **Research**: Technical decisions and implementation details
- **Quickstart**: Developer setup and testing guide
