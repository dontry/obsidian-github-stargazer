# Quickstart: Migrating to pnpm

**Feature**: 002-switch-to-pnpm
**For**: Developers working on obsidian-github-stargazer
**Prerequisites**: Node.js 18+ installed

## Overview

This guide provides step-by-step instructions for migrating the obsidian-github-stargazer project from npm to pnpm.

## Prerequisites Checklist

Before starting the migration, verify:
- [ ] Node.js 18.0.0 or higher is installed (`node --version`)
- [ ] Current npm workflows are functioning (`npm test` passes)
- [ ] No uncommitted changes in working directory

## Installation: pnpm

Choose one of the following methods to install pnpm:

### Option 1: Using npm (Recommended for Transition)
```bash
npm install -g pnpm
```

### Option 2: Using Homebrew (macOS/Linux)
```bash
brew install pnpm
```

### Option 3: Using Standalone Script (Unix-like systems)
```bash
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### Option 4: Using PowerShell (Windows)
```powershell
irm get.pnpm.io/install.ps1 | iex
```

**Verify installation**:
```bash
pnpm --version
# Expected output: 9.x.x (or higher)
```

## Migration Steps

### Step 1: Import Existing Dependencies

Generate `pnpm-lock.yaml` from the existing `package-lock.json`:

```bash
# From project root
pnpm import
```

**Expected output**:
```
Lockfile has been successfully generated and saved as pnpm-lock.yaml
```

### Step 2: Review Generated Lockfile

Verify that `pnpm-lock.yaml` was created:

```bash
ls -la pnpm-lock.yaml
```

### Step 3: Install Dependencies

Install all dependencies using pnpm:

```bash
pnpm install
```

This will:
- Create `node_modules/` with pnpm's efficient structure
- Verify all dependencies resolve correctly
- Set up the project for development

### Step 4: Verify Scripts Work

Test that all npm scripts still work with pnpm:

```bash
# Run tests
pnpm test

# Build the plugin
pnpm build

# Run linting
pnpm lint
```

**Expected**: All scripts should execute without errors.

### Step 5: Create .npmrc Configuration

Create `.npmrc` in the project root with pnpm settings:

```bash
cat > .npmrc << 'EOF'
# Strict peer dependencies (relaxed for Obsidian ecosystem compatibility)
strict-peer-dependencies=false

# Enable strict engine checks
engine-strict=true
EOF
```

**Note**: If you encounter module resolution issues, uncomment this line:
```ini
shamefully-hoist=true
```

### Step 6: Update package.json (Optional)

Add the `engines` field to enforce pnpm version:

```bash
# Edit package.json and add to the root object:
{
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### Step 7: Remove npm Lockfile

Remove the now-obsolete `package-lock.json`:

```bash
rm package-lock.json
```

### Step 8: Update .gitignore (if needed)

Add pnpm-specific entries to `.gitignore`:

```bash
# Add these lines if not already present
echo ".pnpm-store/" >> .gitignore
```

### Step 9: Clean Install Validation

Perform a clean install to verify everything works:

```bash
# Remove existing node_modules
rm -rf node_modules

# Fresh install with pnpm
pnpm install

# Verify everything still works
pnpm test
pnpm build
```

### Step 10: Commit Changes

Commit the migration to git:

```bash
git add .
git commit -m "Switch from npm to pnpm

- Add pnpm-lock.yaml
- Add .npmrc configuration
- Remove package-lock.json
- Update package.json with engines field
- Update CLAUDE.md to reference pnpm commands

Generated with [Claude Code](https://claude.com/claude-code)
via [Happy](https://happy.engineering)

Co-Authored-By: Claude <noreply@anthropic.com>
Co-Authored-By: Happy <yesreply@happy.engineering>"
```

## Common Issues & Solutions

### Issue: Peer Dependency Errors

**Symptom**: Build fails with peer dependency resolution errors

**Solution**: Enable shamefully-hoist in `.npmrc`:
```ini
shamefully-hoist=true
```

Then reinstall:
```bash
pnpm install
```

### Issue: Module Not Found

**Symptom**: `Error: Cannot find module 'xxx'`

**Solution**: Try running with `--shamefully-hoist` flag:
```bash
pnpm install --shamefully-hoist
```

If this fixes it, permanently enable in `.npmrc`.

### Issue: Postinstall Scripts Fail

**Symptom**: esbuild or other build tools fail during install

**Solution**: Use the `--no-strict-peer-dependencies` flag:
```bash
pnpm install --no-strict-peer-dependencies
```

### Issue: Windows Path Length Errors

**Symptom**: `ENAMETOOLONG` errors on Windows

**Solution**: Enable Windows long paths (requires admin):
1. Run PowerShell as Administrator
2. Execute: `New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force`
3. Restart terminal

### Issue: Need to Rollback

**Symptom**: Unresolvable issues after migration

**Solution**: Rollback to npm:
```bash
# Remove pnpm artifacts
rm pnpm-lock.yaml
rm .npmrc

# Restore npm lockfile from git
git checkout package-lock.json

# Reinstall with npm
npm install
```

## Daily Usage with pnpm

### Common Commands

| Task | npm command | pnpm equivalent |
|------|-------------|-----------------|
| Install dependencies | `npm install` | `pnpm install` |
| Add dependency | `npm add <pkg>` | `pnpm add <pkg>` |
| Add dev dependency | `npm add -D <pkg>` | `pnpm add -D <pkg>` |
| Run script | `npm run <script>` | `pnpm run <script>` or `pnpm <script>` |
| Run tests | `npm test` | `pnpm test` |
| Build | `npm run build` | `pnpm build` |
| Lint | `npm run lint` | `pnpm lint` |
| Remove dependency | `npm rm <pkg>` | `pnpm remove <pkg>` |

### Aliases

For developers transitioning from npm, you can create aliases in your shell:

**bash/zsh** (`~/.bashrc` or `~/.zshrc`):
```bash
alias npm='pnpm'
```

**PowerShell** (`$PROFILE`):
```powershell
Set-Alias npm pnpm
```

**Note**: Not recommended for production use, but helpful during transition period.

## Verification Checklist

After migration, verify:
- [ ] `pnpm --version` shows 9.x.x or higher
- [ ] `pnpm-lock.yaml` exists and is valid
- [ ] `package-lock.json` is removed
- [ ] `pnpm install` completes without errors
- [ ] `pnpm test` passes all tests
- [ ] `pnpm build` builds successfully
- [ ] `pnpm lint` completes without errors
- [ ] `.npmrc` configuration is in place
- [ ] `engines` field added to package.json (optional)

## Benefits You'll Notice

After migration, you should observe:
- **Faster installations**: pnpm installs packages in parallel
- **Less disk space**: pnpm uses hard links and content-addressable storage
- **Strict dependencies**: No phantom dependencies from transitive packages
- **Smaller lockfile**: `pnpm-lock.yaml` is more concise than `package-lock.json`

## Getting Help

If you encounter issues not covered here:
- [pnpm Documentation](https://pnpm.io/)
- [pnpm GitHub Issues](https://github.com/pnpm/pnpm/issues)
- [Obsidian Discord](https://discord.gg/obsidian-md) - plugin development channels

## Next Steps

After completing the migration:
1. Update documentation: CLAUDE.md Commands section
2. Update README.md installation instructions (if exists)
3. Delete this quickstart guide or move to project docs/ directory
4. Continue development using pnpm commands

---

**Migration Status**: ✅ Ready to proceed

**Estimated Time**: 10-15 minutes

**Rollback Risk**: LOW (can revert by restoring package-lock.json from git)
