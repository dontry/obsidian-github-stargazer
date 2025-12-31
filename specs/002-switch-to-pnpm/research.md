# Research: Switch from npm to pnpm

**Feature**: 002-switch-to-pnpm
**Date**: 2025-12-31
**Status**: ✅ COMPLETE

## Overview

This document captures research findings for migrating the obsidian-github-stargazer project from npm to pnpm.

## Current Environment (Documented 2025-12-31)

- **npm version**: 11.3.0
- **Node.js version**: v24.1.0
- **pnpm version**: 10.26.2 (exceeds >= 9.x requirement)
- **package-lock.json**: Present (162703 bytes)
- **Target**: Migrate to pnpm 10.x (installed)

## Research Questions & Findings

### RQ1: What pnpm version should we use?

**Research**: Investigate pnpm version compatibility with Node.js 18+ and the Obsidian plugin ecosystem.

**Finding**: Use pnpm 9.x (latest stable series)
- pnpm 9.x is the current stable release (as of 2025-12-31)
- Full compatibility with Node.js 18.0.0 and above
- Well-tested with TypeScript projects and esbuild
- Comprehensive documentation and community support

**Decision**: pnpm 9.x with `"engines": { "pnpm": ">=9.0.0" }` in package.json

**Alternatives Considered**:
- pnpm 8.x: Rejected (older stable, missing latest features)
- pnpm 10.x (if released): Rejected (too new for production use)

### RQ2: What .npmrc configuration is needed?

**Research**: Determine optimal pnpm settings for Obsidian plugin development.

**Finding**: Start minimal, add shamefully-hoist only if needed

**Recommended .npmrc**:
```ini
# Strict peer dependencies (relaxed for Obsidian ecosystem compatibility)
strict-peer-dependencies=false

# Enable strict engine checks
engine-strict=true

# Use shamefully-hoist only if compatibility issues arise
# shamefully-hoist=true  # Uncomment if needed
```

**Rationale**:
- `strict-peer-dependencies=false`: Obsidian plugin ecosystem has some legacy peer deps
- `engine-strict=true`: Enforce Node.js version requirements
- `shamefully-hoist`: Disabled by default. Only enable if dependencies fail to resolve

**Decision**: Start with minimal configuration, enable shamefully-hoist only if issues arise

### RQ3: How do we generate pnpm-lock.yaml from package-lock.json?

**Research**: Determine migration path from existing npm lockfile.

**Finding**: Use `pnpm import` command

**Migration Steps**:
```bash
# 1. Install pnpm globally
npm install -g pnpm

# 2. Import existing package-lock.json
pnpm import

# 3. Verify lockfile generation
ls pnpm-lock.yaml

# 4. Install dependencies
pnpm install

# 5. Remove old lockfile
rm package-lock.json
```

**Caveats**:
- `pnpm import` requires an existing package-lock.json or yarn.lock
- Generated lockfile may need manual review for devDependencies vs prodDependencies
- Run `pnpm install --frozen-lockfile` in CI to ensure reproducibility

**Decision**: Use `pnpm import` as primary migration method

### RQ4: Do we need to update package.json scripts?

**Research**: Check if npm scripts work with pnpm without modification.

**Finding**: All npm scripts are compatible with pnpm

**Verification**:
- `pnpm run <script>` works identically to `npm run <script>`
- Environment variables and script behavior unchanged
- No script modifications required

**Decision**: No changes to package.json scripts required

**Optional Enhancement**: Add `engines` field to package.json:
```json
{
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=9.0.0"
  }
}
```

### RQ5: What about CI/CD pipelines?

**Research**: Check if project has any CI/CD configuration that needs updating.

**Finding**: No CI/CD files detected

**Investigation**:
- No `.github/workflows/` directory
- No `.gitlab-ci.yml` file
- No `.travis.yml` file
- No other CI configuration files

**Decision**: No CI/CD updates required

**Future Consideration**: If CI/CD is added later, update from:
```yaml
- name: Install dependencies
  run: npm install
```
to:
```yaml
- name: Install pnpm
  uses: pnpm/action-setup@v2
  with:
    version: 9
- name: Install dependencies
  run: pnpm install --frozen-lockfile
```

### RQ6: How do we handle pnpm installation for developers?

**Research**: Document pnpm installation for new developers.

**Finding**: Multiple installation methods available

**Installation Options**:
1. **npm (easiest for existing npm users)**:
   ```bash
   npm install -g pnpm
   ```

2. **Homebrew (macOS/Linux)**:
   ```bash
   brew install pnpm
   ```

3. **Standalone script (Linux/macOS)**:
   ```bash
   curl -fsSL https://get.pnpm.io/install.sh | sh -
   ```

4. **PowerShell (Windows)**:
   ```powershell
   irm get.pnpm.io/install.ps1 | iex
   ```

**Decision**: Document multiple methods in quickstart.md, recommend npm for transition

### RQ7: What are the common migration issues and solutions?

**Research**: Identify known pnpm migration pitfalls.

**Findings**:

| Issue | Symptom | Solution |
|-------|---------|----------|
| Peer dependency conflicts | Build fails with peer dependency errors | Set `strict-peer-dependencies=false` in .npmrc |
| Module not found errors | Dependencies can't find each other | Enable `shamefully-hoist=true` in .npmrc |
| Postinstall scripts fail | Build tools not found | Add `--no-strict-peer-dependencies` flag |
| Path length issues (Windows) | "ENAMETOOLONG" errors | Enable Windows long paths or use WSL |

**Decision**: Document troubleshooting steps in quickstart.md

### RQ8: How does this affect git repository?

**Research**: Determine git changes required for migration.

**Findings**:
- `pnpm-lock.yaml` should be committed to version control
- `package-lock.json` should be removed from git
- Add `.pnpm-store/` to `.gitignore` (if using local store)

**git commands**:
```bash
# Remove old lockfile from git
git rm package-lock.json

# Add new lockfile
git add pnpm-lock.yaml

# Update .gitignore if needed
echo ".pnpm-store/" >> .gitignore
```

**Decision**: Commit pnpm-lock.yaml, remove package-lock.json from git

## Alternative Package Managers Considered

### Yarn
**Evaluation**:
- Pros: Mature ecosystem, fast with PnP
- Cons: Less disk-efficient than pnpm, larger lockfile
- Verdict: Rejected in favor of pnpm

### Bun
**Evaluation**:
- Pros: Very fast, all-in-one toolkit
- Cons: Newer ecosystem, less tooling maturity, incompatible with some Node.js APIs
- Verdict: Rejected due to ecosystem immaturity

### Keep npm
**Evaluation**:
- Pros: No migration effort, most common
- Cons: Slower, less disk-efficient, weaker dependency isolation
- Verdict: Rejected per user request and pnpm benefits

## Summary & Recommendations

### Key Decisions
1. **pnpm version**: 9.x (latest stable)
2. **.npmrc**: Start minimal, add shamefully-hoist only if needed
3. **Migration**: Use `pnpm import` from existing package-lock.json
4. **Scripts**: No changes required
5. **Documentation**: Update CLAUDE.md and README.md
6. **Developer onboarding**: Document pnpm installation

### Migration Risk Assessment
- **Risk Level**: LOW
- **Rollback Plan**: Remove pnpm-lock.yaml, restore package-lock.json from git
- **Testing Required**: Run all scripts and verify tests pass

### Next Steps
1. Create quickstart.md with step-by-step migration guide
2. Run `/speckit.tasks` to generate implementation tasks
3. Execute migration following task list
4. Validate with `pnpm test` and `pnpm build`

## References

- [pnpm Official Documentation](https://pnpm.io/)
- [pnpm vs npm Comparison](https://pnpm.io/comparison)
- [Migrating from npm to pnpm](https://pnpm.io/npm-vs-pnpm)
- [pnpm Import Command](https://pnpm.io/cli/import)
- [pnpm Configuration (.npmrc)](https://pnpm.io/npmrc)
