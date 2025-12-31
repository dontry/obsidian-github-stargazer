# Research: GitHub Starred Repositories Manager

**Feature**: GitHub Starred Repositories Manager
**Date**: 2025-12-30
**Phase**: 0 - Research & Technical Decisions

## Overview

This document captures research findings and technical decisions for implementing the GitHub Starred Repositories Manager Obsidian plugin. All technical unknowns from the planning phase have been resolved through research and analysis.

## GraphQL vs REST API Decision

**Decision**: Use GitHub GraphQL API

**Rationale**:
- GraphQL allows fetching all starred repository data in a single request with nested queries
- Reduces network round-trips compared to REST API (which requires pagination across multiple endpoints)
- Can fetch repository metadata, README content, owner info, and languages in one query
- More efficient for large sync operations (100-1000 repositories)
- Better type safety with TypeScript GraphQL code generators (e.g., graphql-codegen)

**Alternatives Considered**:
- **REST API**: Would require multiple endpoints (`user/starred`, `repos/{owner}/{repo}`, `repos/{owner}/{repo}/readme`, etc.) with pagination. More complex to orchestrate and slower.
- **Hybrid**: Combine REST and GraphQL. More complex without clear benefit.

**Implementation**:
- Use GitHub's GraphQL endpoint: `https://api.github.com/graphql`
- Authenticate with bearer token (user's personal access token)
- Implement pagination using GitHub's cursor-based pagination for starred repositories
- Use fragments to define reusable repository selections

**Query Example**:
```graphql
query GetStarredRepositories($cursor: String) {
  viewer {
    starredRepositories(first: 100, after: $cursor, orderBy: {field: STARRED_AT, direction: DESC}) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          ... on Repository {
            id
            name
            nameWithOwner
            description
            url
            stargazerCount
            primaryLanguage {
              name
            }
            createdAt
            updatedAt
            owner {
              login
              url
            }
            readme: object(expression: "HEAD:README.md") {
              ... on Blob {
                text
              }
            }
          }
        }
      }
    }
  }
}
```

## Rate Limiting Strategy

**Decision**: Implement client-side rate limit tracking with exponential backoff

**Rationale**:
- GitHub GraphQL API has 5,000 point limit per hour for authenticated requests
- Need to avoid hitting rate limits during large sync operations
- Client-side tracking allows proactive throttling before hitting server limits
- Exponential backoff handles temporary rate limit exhaustion gracefully

**Alternatives Considered**:
- **Server-side tracking**: Would require backend service. Not feasible for Obsidian plugin.
- **No tracking**: Risk of hitting rate limits mid-sync. Poor user experience.

**Implementation**:
- Track rate limit points from `X-RateLimit-Remaining` header in GraphQL responses
- Calculate cost per query (GitHub provides query cost in response extensions)
- Implement delay between queries if remaining points < 20% of limit
- Use exponential backoff if 429 (rate limit exceeded) received: wait 1s, 2s, 4s, 8s, max 30s
- Display progress indicator with estimated time remaining during sync

**Rate Limit Calculator**:
```typescript
interface RateLimitInfo {
  remaining: number;
  resetAt: Date;
  cost: number;
}

function shouldThrottle(info: RateLimitInfo): boolean {
  const percentRemaining = info.remaining / 5000;
  return percentRemaining < 0.2; // Throttle if < 20% remaining
}
```

## Data Storage Strategy

**Decision**: Hybrid storage using Obsidian's data API for structured data and JSON files for large datasets

**Rationale**:
- Obsidian's `loadData()`/`saveData()` API provides encrypted storage for sensitive data (GitHub token)
- JSON files in `.obsidian/plugins/github-stargazer/data/` for large datasets (repositories)
- Markdown files in user vault for user-created notes (allows user to edit notes outside plugin)
- Separation of concerns: plugin data (JSON) vs user content (markdown)

**Alternatives Considered**:
- **Obsidian data API only**: Has size limitations (typically 1-2MB). Not suitable for 1000 repos (~5MB).
- **SQLite**: Adds dependency, complexity. Overkill for single-user plugin.
- **Only JSON files**: Less secure for GitHub token storage.

**Implementation**:
- **GitHub Token**: Stored via `this.loadData()`/`this.saveData()` (encrypted)
- **Repositories**: JSON file at `.obsidian/plugins/github-stargazer/data/repositories.json`
- **Tags**: JSON file at `.obsidian/plugins/github-stargazer/data/tags.json`
- **Repository Notes**: Markdown files at `github-stargazer-notes/{repo-id}.md`
- **Settings**: JSON file at `.obsidian/plugins/github-stargazer/data/settings.json`

**Repository JSON Structure**:
```json
{
  "lastSync": "2025-12-30T12:00:00Z",
  "repositories": [
    {
      "id": "MDEwOlJlcG9zaXRvcnkxMjM0NTY3ODkw",
      "name": "react",
      "nameWithOwner": "facebook/react",
      "description": "A declarative JavaScript library...",
      "url": "https://github.com/facebook/react",
      "starCount": 180000,
      "primaryLanguage": "JavaScript",
      "owner": "facebook",
      "createdAt": "2013-05-24T15:12:33Z",
      "updatedAt": "2025-12-30T10:30:00Z",
      "readme": "# React\n\nA declarative...",
      "tags": ["frontend", "library"],
      "linkedResources": [
        {
          "url": "https://codewiki.google/example",
          "title": "Internal Documentation",
          "addedAt": "2025-12-30T12:00:00Z"
        }
      ]
    }
  ]
}
```

## Testing Framework Selection

**Decision**: Vitest with Obsidian testing utilities

**Rationale**:
- Vitest provides faster test execution than Jest with native ESM support
- Excellent TypeScript support with no additional configuration needed
- Compatible with Jest API for easy migration
- Mocking support for external dependencies (GitHub API)
- Compatible with Obsidian's testing utilities
- Better watch mode performance and hot module replacement

**Alternatives Considered**:
- **Jest**: Industry standard but slower; ESM support requires additional configuration
- **Mocha**: Older, more verbose configuration
- **JSDOM + custom setup**: More complex, less tooling

**Implementation**:
```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  testEnvironment: 'node',
  roots: ['./src', './tests'],
  testMatch: ['**/*.test.ts'],
  coverage: {
    provider: 'v8',
    reporter: ['text', 'json', 'html'],
    include: ['src/**/*.ts'],
    exclude: ['src/main.ts'],
    thresholds: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
});
```

**Test Structure**:
- Unit tests: Test individual functions and classes in isolation
- Integration tests: Test multi-step workflows (sync, browse, tag operations)
- Contract tests: Verify GitHub GraphQL API response structure

## URL Validation Strategy

**Decision**: Use HTML5 validation API pattern with custom URL parsing

**Rationale**:
- Browser's `URL` constructor provides robust validation
- Allow flexible URL formats (http, https, with or without www)
- Validate URL can be parsed before storing
- Display user-friendly error messages for invalid URLs

**Alternatives Considered**:
- **Regex validation**: More error-prone, harder to maintain
- **External validation library**: Unnecessary dependency

**Implementation**:
```typescript
function isValidUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}
```

## Search and Filter Performance

**Decision**: Client-side filtering with in-memory search for 500-1000 repositories

**Rationale**:
- Dataset size (500-1000 repos) is manageable in-memory
- Instant search response (<100ms achievable)
- No server-side indexing required
- Simplifies implementation (no external database)

**Alternatives Considered**:
- **Elasticsearch/Lunr.js**: Overkill for <1000 items
- **Server-side search**: Would require backend service

**Implementation**:
- Load all repositories into memory on plugin load
- Implement filter function that filters by search term, tags, language
- Use memoization to avoid re-filtering on unchanged inputs
- Debounce search input to avoid excessive re-filtering (300ms delay)

**Filter Algorithm**:
```typescript
function filterRepositories(
  repositories: Repository[],
  searchTerm: string,
  tags: string[],
  language: string
): Repository[] {
  return repositories.filter(repo => {
    const matchesSearch = searchTerm === '' ||
      repo.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      repo.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTags = tags.length === 0 ||
      tags.some(tag => repo.tags.includes(tag));

    const matchesLanguage = !language ||
      repo.primaryLanguage === language;

    return matchesSearch && matchesTags && matchesLanguage;
  });
}
```

## Incremental Sync Strategy

**Decision**: Track last sync timestamp and use GitHub's `updated_at` field with pagination optimization

**Rationale**:
- Avoids refetching unchanged repositories
- Reduces API usage and sync time
- GitHub GraphQL API supports filtering by updated time indirectly via pagination
- Store last sync timestamp to determine sync window

**Alternatives Considered**:
- **Full sync every time**: Wasteful, slow for large collections
- **Hash-based diff**: More complex, unnecessary with `updated_at`

**Implementation**:
1. Store `lastSync` timestamp in repositories.json
2. On incremental sync, fetch starred repos sorted by `STARRED_AT` desc
3. For each repo, compare `repo.updatedAt` with `lastSync`
4. Only update repositories where `repo.updatedAt > lastSync`
5. Handle deleted repos: Remove repos from local storage if no longer in GitHub starred list
6. Handle renamed repos: Use GitHub `id` (not name) as primary key to detect renames

## Offline-First Strategy

**Decision**: Local-first with periodic sync; all operations work offline except sync

**Rationale**:
- Aligns with Obsidian's local-first philosophy
- Users can browse, search, tag, and annotate repos offline
- Sync only required for initial fetch and updates
- Better privacy (no constant network connection)

**Implementation**:
- All features work offline except sync operations
- Display "Last synced: X hours ago" indicator
- Provide manual sync trigger (command or button)
- Optional: Background sync every 30 minutes (opt-in via settings)
- Cache repository data locally; sync updates when network available

## Mobile Compatibility Strategy

**Decision**: Responsive UI with Obsidian Mobile testing

**Rationale**:
- Obsidian Mobile uses Chromium on iOS/Android
- Same plugin code runs on desktop and mobile
- Need to test mobile-specific constraints (smaller screen, touch)

**Implementation**:
- Use Obsidian's UI components (e.g., `SuggestModal`, `FuzzySuggestModal`)
- Responsive CSS with flexbox/grid
- Test on iOS and Android emulators
- Avoid desktop-only APIs (Node.js modules)
- Touch-friendly UI elements (minimum 44px tap targets)

## Key Technical Decisions Summary

| Decision | Choice | Rationale |
|----------|--------|-----------|
| API | GraphQL | Efficient, single-query fetching, better TypeScript support |
| Rate Limiting | Client-side tracking with backoff | Prevent hitting limits, proactive throttling |
| Storage | Hybrid (Obsidian API + JSON + Markdown) | Security, scalability, user-editable notes |
| Testing | Vitest | Fast execution, native ESM support, better TypeScript integration |
| URL Validation | URL constructor | Robust, no dependencies |
| Search | Client-side in-memory | Fast enough for <1000 repos, simpler |
| Sync | Incremental with timestamp | Efficient, minimizes API calls |
| Offline | Local-first | Privacy, Obsidian philosophy, better UX |
| Mobile | Responsive UI | Same codebase, touch-friendly design |

## Next Steps

With research complete and all technical decisions resolved, proceed to **Phase 1: Design & Contracts**:
1. Generate data-model.md with entity definitions
2. Generate GitHub GraphQL contracts in contracts/github-graphql.graphql
3. Generate quickstart.md with setup and development workflow
