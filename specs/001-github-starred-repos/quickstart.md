# Quickstart: GitHub Starred Repositories Manager

**Feature**: GitHub Starred Repositories Manager
**Date**: 2025-12-30
**Phase**: 1 - Design & Contracts

## Overview

This guide provides step-by-step instructions for setting up the development environment and implementing the GitHub Starred Repositories Manager plugin for Obsidian.

## Prerequisites

### Required Software

- **Node.js**: Version 18+ (LTS recommended)
  - Install from: https://nodejs.org/
  - Verify: `node --version` (should be v18+)

- **npm**: Comes with Node.js
  - Verify: `npm --version`

- **Git**: For version control
  - Install from: https://git-scm.com/
  - Verify: `git --version`

- **Obsidian Desktop**: For testing
  - Install from: https://obsidian.md/
  - Version: 1.0.0 or later

- **TypeScript**: Global installation (optional, included in devDependencies)
  - Install: `npm install -g typescript`
  - Verify: `tsc --version`

### Required Accounts

- **GitHub Account**: For creating personal access token
  - Sign up: https://github.com/signup
  - Create token: https://github.com/settings/tokens

## Initial Setup

### 1. Clone Repository and Install Dependencies

```bash
# Navigate to project directory
cd /path/to/obsidian-github-stargazer

# Install dependencies
npm install
```

**Expected Output**:
```
added 250 packages, and audited 251 packages in 30s
...
```

### 2. Verify TypeScript Configuration

Check that `tsconfig.json` has strict mode enabled:

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "outDir": "main",
    "rootDir": "src",
    "sourceMap": true,
    "lib": ["ES2020", "DOM"]
  }
}
```

Verify:
```bash
npx tsc --noEmit
```

**Expected**: No errors (if `src/` exists with valid TypeScript)

### 3. Configure ESLint

Verify `eslint.config.mts` exists:

```bash
npm run lint
```

**Expected Output** (if no code yet):
```
No files matching the pattern "src/**/*.ts" were found.
```

### 4. Configure Vitest

Verify `vitest.config.ts` exists:

```bash
npm test -- --run
```

**Expected Output** (if no tests yet):
```
TEST CAUSE: You have not defined any test yet

Test Files  0 passed (0)
     Tests  no tests
```

## Development Workflow

### Project Structure

```
obsidian-github-stargazer/
├── src/                    # Source code (write code here)
│   ├── main.ts             # Plugin entry point
│   ├── types.ts            # Type definitions
│   ├── sync/               # Sync logic
│   ├── storage/            # Data persistence
│   ├── ui/                 # UI components
│   ├── commands/           # Command handlers
│   ├── utils/              # Utilities
│   └── models/             # Data models
├── tests/                  # Tests (write tests here)
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── contract/           # Contract tests
├── .obsidian/              # Local Obsidian config (generated)
├── manifest.json           # Plugin manifest
├── package.json            # Dependencies
├── tsconfig.json           # TypeScript config
├── esbuild.config.mjs      # Build config
├── eslint.config.mts       # ESLint config
└── vitest.config.ts        # Vitest config
```

### Test-Driven Development (TDD)

Following **Principle II: Testing Standards (NON-NEGOTIABLE)**, write tests BEFORE implementation:

1. **Write failing test**:
```bash
# Create test file
touch tests/unit/url-validator.test.ts

# Write test that describes desired behavior
# Run test: should FAIL (red)
npm test -- url-validator.test.ts
```

2. **Write minimal implementation**:
```bash
# Create source file
touch src/utils/url-validator.ts

# Implement just enough to make test pass
# Run test: should PASS (green)
npm test -- url-validator.test.ts
```

3. **Refactor** (if needed):
```bash
# Clean up code while keeping tests green
# Run tests: should still PASS
npm test
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode (auto-rerun on changes)
npm test -- --watch

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- url-validator.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="URL validation"

# Run tests in UI mode (Vitest UI)
npm test -- --ui --coverage
```

### Building the Plugin

```bash
# Development build (watch mode)
npm run dev

# Production build (optimized)
npm run build
```

**Development Build**:
- Watches for file changes
- Recompiles on every change to `src/`
- Outputs to `main.js`
- Source maps included

**Production Build**:
- Optimized bundle
- Minified code
- Outputs to `main.js`
- No source maps in release

### Linting

```bash
# Run ESLint
npm run lint

# Fix auto-fixable issues
npm run lint -- --fix

# Check specific file
npm run lint -- src/utils/url-validator.ts
```

**Pre-commit check**:
```bash
# Run full check (lint + test + build)
npm run lint && npm test && npm run build
```

## Manual Testing in Obsidian

### 1. Build Plugin

```bash
npm run build
```

### 2. Install Plugin Locally

Create a test vault (or use existing):

```bash
# Create test vault directory
mkdir ~/TestVault
cd ~/TestVault

# Create plugin directory
mkdir -p .obsidian/plugins/github-stargazer

# Copy built files
cp main.js .obsidian/plugins/github-stargazer/
cp manifest.json .obsidian/plugins/github-stargazer/
cp styles.css .obsidian/plugins/github-stargazer/  # if exists
```

### 3. Enable Plugin

1. Open Obsidian
2. Open the test vault
3. Go to **Settings → Community plugins**
4. Turn on "Community plugins" (if off)
5. Search for "GitHub Stargazer" (or find in list)
6. Click "Enable"
7. Configure plugin with your GitHub token

### 4. Test Features

**Sync Command**:
- Open command palette: `Cmd/Ctrl + P`
- Type: "GitHub Stargazer: Sync repositories"
- Press Enter
- Verify: Repositories appear in UI

**Open Repository View**:
- Open command palette
- Type: "GitHub Stargazer: Open repository view"
- Press Enter
- Verify: Repository list displays

**Add Tags**:
- Select a repository
- Click "Add tag" button
- Enter tag name
- Verify: Tag appears on repository

**Add Notes**:
- Select a repository
- Open notes panel
- Type note content
- Save
- Verify: Note persists

## Creating GitHub Personal Access Token

### 1. Generate Token

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Configure token:
   - **Note**: Enter "Obsidian GitHub Stargazer"
   - **Expiration**: Select expiration (or no expiration)
   - **Scopes**:
     - ✅ `public_repo` (for public repositories)
     - ✅ `repo` (if you have private repos starred)
4. Click "Generate token"
5. **IMPORTANT**: Copy token immediately (won't be shown again)

### 2. Store Token in Plugin

1. Open Obsidian
2. Go to **Settings → Community plugins → GitHub Stargazer**
3. Paste token in "GitHub Personal Access Token" field
4. Click "Save"

**Security Note**: Token is stored securely using Obsidian's encrypted data API.

## Common Development Tasks

### Add a New Command

```bash
# 1. Write test
touch tests/commands/my-command.test.ts

# 2. Implement command
touch src/commands/my-command.ts

# 3. Register in main.ts
# Edit src/main.ts:
this.addCommand({
  id: 'github-stargazer-my-command',
  name: 'My command',
  callback: () => {
    executeMyCommand();
  }
});

# 4. Build and test
npm run build
```

### Add a New UI Component

```bash
# 1. Write test
touch tests/ui/my-component.test.ts

# 2. Implement component
touch src/ui/my-component.ts

# 3. Export from main.ts or use in other components
export { MyComponent } from './ui/my-component';

# 4. Build and test
npm run build
```

### Add a New Utility Function

```bash
# 1. Write test
touch tests/utils/my-util.test.ts

# 2. Implement utility
touch src/utils/my-util.ts

# 3. Export for use
export function myUtil() {
  // Implementation
}

# 4. Use in code
import { myUtil } from './utils/my-util';
```

## Debugging

### Console Logging

```typescript
// In plugin code
console.log('Debug message:', data);
console.error('Error:', error);
```

View console:
- **Desktop**: Open DevTools → Help → Developer tools → Console
- **Mobile**: No direct console access; use desktop for debugging

### Debugging Tests

```bash
# Run tests in debug mode (inspect mode)
npm test -- --inspect -- --run

# Run single test file with verbose output
npm test -- url-validator.test.ts --reporter=verbose

# Run tests with UI for interactive debugging
npm test -- --ui
```

### Common Issues

| Issue | Solution |
|-------|----------|
| Plugin doesn't load | Check `main.js` exists in `.obsidian/plugins/github-stargazer/` |
| Command not appearing | Check command registered in `main.ts` `onload()` |
| Token authentication fails | Verify token has correct scopes (`public_repo` or `repo`) |
| Build fails with TS errors | Check `tsconfig.json` strict mode, fix type errors |
| Tests fail to run | Verify Vitest installed: `npm list vitest` |

## Git Workflow

### Feature Branch Workflow

```bash
# Create feature branch (from 001-github-starred-repos)
git checkout -b feature/add-notes-panel

# Make changes and commit
git add .
git commit -m "feat: add notes panel UI"

# Push to remote
git push origin feature/add-notes-panel

# Create pull request on GitHub
```

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `test`: Test changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks

**Examples**:
```
feat(sync): implement incremental sync

Add support for syncing only updated repositories based on
lastSync timestamp. Reduces API calls and sync time.

Closes #123
```

```
test(ui): add tests for repository view component

Test rendering, filtering, and selection functionality.
Achieves 80% coverage for repository-view.ts.
```

## Release Process

### 1. Update Version

```bash
# Bump version (patch, minor, major)
npm version minor  # e.g., 1.0.0 → 1.1.0
```

This updates:
- `package.json` version
- `manifest.json` version
- `versions.json` (adds entry for new version)

### 2. Update Changelog

Edit `CHANGELOG.md`:
```markdown
## [1.1.0] - 2025-12-30

### Added
- Notes panel for adding personal notes to repositories
- External resource linking (e.g., Google Code Wiki pages)

### Fixed
- Fixed rate limit handling during large syncs

### Changed
- Improved search performance for 500+ repositories
```

### 3. Create Release

```bash
# Build production bundle
npm run build

# Create tag
git tag v1.1.0
git push origin v1.1.0

# Create GitHub release with:
# - Title: v1.1.0
# - Description: Copy from CHANGELOG.md
# - Assets: Upload main.js, manifest.json, styles.css
```

## Next Steps

After setup is complete:

1. **Run Phase 2**: Execute `/speckit.tasks` to generate implementation tasks
2. **Start Implementation**: Begin with P1 user story (Sync Starred Repositories)
3. **Follow TDD**: Write tests first for all implementation
4. **Manual Testing**: Test plugin in Obsidian after each feature
5. **Iterate**: Build features incrementally (P1 → P2 → P3 → P4 → P5)

## Support

- **Constitution**: `.specify/memory/constitution.md` (coding principles)
- **Data Model**: `specs/001-github-starred-repos/data-model.md` (entity definitions)
- **API Contracts**: `specs/001-github-starred-repos/contracts/github-graphql.graphql`
- **Obsidian Docs**: https://docs.obsidian.md/Plugins/Getting+started/Build+a+plugin
