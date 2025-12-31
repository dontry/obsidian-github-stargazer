<!--
Sync Impact Report - Constitution v1.1.0
==========================================

Version Change: v1.0.0 → v1.1.0 (MINOR - new Security & Privacy principle added)

Added Sections:
- VI. Security & Privacy (NEW core principle)

Modified Principles:
- None (all existing principles unchanged)

Removed Sections:
- None

Templates Requiring Updates:
✅ .specify/templates/plan-template.md - Updated Constitution Check section for Principle VI
✅ .specify/templates/spec-template.md - Verified alignment
✅ .specify/templates/tasks-template.md - Verified alignment
✅ .claude/commands/ - Verified alignment

Follow-up TODOs:
- None - all templates updated

Validation Status:
✅ No remaining bracket tokens
✅ Version line matches report (1.1.0)
✅ Dates in ISO format (YYYY-MM-DD)
✅ Principles are declarative and testable
✅ Security & Privacy principle added as requested
-->

# Obsidian GitHub Stargazer Constitution

## Core Principles

### I. Code Quality

**Principle**: Maintain high code quality through strict typing, linting, and adherence to best practices.

**Rules**:
- TypeScript strict mode MUST be enabled (`"strict": true` in tsconfig.json)
- ALL code MUST pass ESLint before commits (run `npm run lint`)
- No `any` types allowed without explicit justification in code comments
- Async functions MUST use `async/await` pattern; promise chains are prohibited
- Error handling MUST be explicit with try-catch blocks or `.catch()` handlers
- Magic numbers and strings MUST be extracted to named constants
- Code MUST follow Obsidian plugin best practices from AGENTS.md

**Rationale**: Strict typing and linting catch errors at compile time rather than runtime. Obsidian plugin APIs benefit from type safety. Clean, consistent code reduces bugs and maintenance burden.

### II. Testing Standards (NON-NEGOTIABLE)

**Principle**: Comprehensive testing is mandatory for all new features and bug fixes.

**Rules**:
- Tests MUST be written BEFORE implementation code (Test-Driven Development)
- Test files MUST mirror src structure in `tests/` directory
- Unit tests REQUIRED for all utility functions and services
- Integration tests REQUIRED for multi-step user workflows
- Tests MUST be written for bug fixes to prevent regression
- Test coverage MUST NOT decrease when adding new features
- ALL tests MUST pass before commits (automated via pre-commit hook if possible)
- Tests MUST be independent and runnable in any order

**Rationale**: TDD ensures code is testable by design. Tests serve as living documentation and prevent regressions. Obsidian plugins run in users' vaults; bugs can affect user data, making testing critical.

### III. User Experience Consistency

**Principle**: Deliver consistent, predictable user experiences across all plugin features.

**Rules**:
- Command IDs MUST be stable across versions (never rename released commands)
- Command names MUST use sentence case and action-oriented language
- Settings MUST provide sensible defaults that work out-of-the-box
- Settings MUST include clear descriptions explaining their purpose
- User-facing strings MUST be consistent in terminology and tone
- Error messages MUST be actionable and user-friendly (use `Notice` for feedback)
- UI elements MUST follow Obsidian's design language and patterns
- Navigation instructions MUST use arrow notation (e.g., **Settings → Community plugins**)

**Rationale**: Consistent UX reduces user cognitive load. Stable command IDs prevent users from losing custom keybindings and settings between updates. Clear errors reduce support burden.

### IV. Readability

**Principle**: Code must be self-documenting and immediately understandable by new contributors.

**Rules**:
- Functions MUST be named with verbs describing what they do (e.g., `fetchStarCount`, not `data` or `process`)
- Variables MUST use descriptive names; abbreviations MUST be avoided unless widely understood (e.g., `url`, `id`)
- Single-letter variables allowed ONLY for loop iterators and coordinates
- Functions MUST NOT exceed 50 lines; split longer functions into smaller helpers
- Files MUST NOT exceed 300 lines; split larger files into focused modules
- Complex logic MUST include explanatory comments for WHY, not WHAT
- Comments MUST NOT duplicate what the code already expresses
- Code MUST be formatted consistently (use Prettier or agreed formatter)

**Rationale**: Readable code reduces onboarding time for new contributors. Short functions with clear names are easier to test, debug, and reuse. Obsidian plugins often have single authors or small teams; readability ensures continuity.

### V. Modularity

**Principle**: Organize code into small, focused modules with clear boundaries and minimal coupling.

**Rules**:
- `main.ts` MUST only contain plugin lifecycle code (onload, onunload, registration)
- Feature logic MUST be delegated to separate modules by responsibility
- Source code MUST be organized: `src/commands/`, `src/ui/`, `src/utils/`, `src/types/`
- Each module MUST have a single, well-defined purpose
- Modules MUST NOT access internal state of other modules directly
- Shared utilities MUST be extracted to `src/utils/` rather than duplicated
- Types and interfaces MUST be centralized in `src/types.ts` or feature-specific type files
- Circular dependencies between modules are FORBIDDEN

**Rationale**: Modular code is easier to test, maintain, and extend. Clear boundaries allow features to be developed independently. Obsidian plugins can grow complex; modularity prevents spaghetti code.

### VI. Security & Privacy (NON-NEGOTIABLE)

**Principle**: Protect user data, privacy, and system integrity through secure coding practices and minimal data access.

**Rules**:
- NO remote code execution, fetching and evaling scripts, or auto-updating outside normal releases
- NO telemetry, analytics, or data collection without explicit opt-in and clear disclosure
- Plugin MUST default to local/offline operation; network calls only when essential
- Minimize file system access; read/write only what is necessary for the feature
- Do NOT access files outside the vault unless explicitly required and disclosed
- ALL network requests MUST be documented in README.md with data sent, purpose, and risks
- External services used (if any) MUST require explicit user consent
- API keys, tokens, and credentials MUST be stored securely using Obsidian's data API
- User data MUST NOT be transmitted unless absolutely necessary and explicitly consented
- Security vulnerabilities identified after release MUST be patched promptly with disclosure

**Rationale**: Obsidian plugins have access to users' vaults which may contain sensitive information. Security violations can compromise user data and trust. Privacy is foundational to the Obsidian ecosystem; users expect local-first software that respects their data.

## Quality Gates

**Pre-Commit Requirements**:
- ESLint MUST pass with zero errors (`npm run lint`)
- TypeScript compilation MUST succeed with zero errors
- Tests MUST pass (if tests exist for modified code)
- Build MUST succeed (`npm run build`)

**Pre-Release Requirements**:
- Manual testing in Obsidian desktop environment
- Manual testing on mobile if `isDesktopOnly` is false
- ALL new features MUST have tests
- Documentation MUST be updated (README.md, changelog)
- `manifest.json` version MUST be bumped (semver)
- `versions.json` MUST be updated with minAppVersion mapping

**Rationale**: Automated gates catch issues early. Manual testing catches UX problems automation cannot. Comprehensive documentation reduces user confusion and support requests.

## Development Workflow

**Branching**:
- Feature branches: `###-feature-name` pattern (e.g., `123-github-auth`)
- Branches MUST be short-lived; merge within days, not weeks
- Descriptive commit messages required (imperative mood: "Add login" not "Added login")

**Code Review**:
- ALL code changes MUST be reviewed before merging to main
- Reviewers MUST verify constitution compliance
- Reviewers MUST verify tests pass and are comprehensive
- Reviewers MUST verify no regressions in existing functionality

**Build & Release**:
- Development: `npm run dev` (watch mode with hot reload)
- Production build: `npm run build` (optimized bundle)
- Linting: `npm run lint` (ESLint check)
- Release artifacts: `main.js`, `manifest.json`, `styles.css` (if present)
- GitHub release tag MUST exactly match `manifest.json` version (no `v` prefix)

**Rationale**: Consistent workflow prevents common mistakes and ensures smooth releases. Short-lived branches reduce merge conflicts. Code reviews maintain quality standards.

## Governance

**Compliance**:
- ALL pull requests MUST verify constitution compliance
- Violations of Testing Standards (Principle II) are BLOCKING issues
- Violations of Security & Privacy (Principle VI) are BLOCKING issues and CANNOT be justified
- Violations of Modularity (Principle V) require justification in plan.md
- Code that cannot be tested MUST be flagged for redesign

**Complexity Justification**:
- When principles conflict with implementation needs, document reasoning in plan.md
- "Constitution Violations" section MUST list: violation, why needed, simpler alternative rejected
- Security and privacy violations CANNOT be justified and MUST be resolved

**Amendments**:
- Constitution changes require version bump per semantic versioning:
  - MAJOR: Backward incompatible principle removal or redefinition
  - MINOR: New principle or section added
  - PATCH: Clarifications, wording fixes, non-semantic changes
- Amendments MUST update `CONSTITUTION_VERSION` and `LAST_AMENDED_DATE`
- Dependent templates MUST be updated to reflect principle changes

**References**:
- Runtime development guidance: `AGENTS.md`
- Obsidian Plugin API: https://docs.obsidian.md
- Plugin Guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines

**Version**: 1.1.0 | **Ratified**: 2025-12-30 | **Last Amended**: 2025-12-30
