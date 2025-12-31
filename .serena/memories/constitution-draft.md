# Obsidian GitHub Stargazer Constitution

## Core Principles

### I. Plugin Architecture

**Principle**: Maintain clean plugin architecture with minimal lifecycle management in `main.ts` and modular feature organization.

**Rules**:
- `main.ts` MUST only contain plugin lifecycle logic (onload, onunload, command registration)
- All feature logic MUST be delegated to separate modules organized by responsibility
- Source code MUST be organized in `src/` with clear module boundaries (commands/, ui/, utils/, types/)
- Files MUST NOT exceed ~300 lines; split larger files into focused modules
- Each module MUST have a single, well-defined responsibility
- All dependencies MUST be bundled into `main.js` (no runtime dependencies)

**Rationale**: Clean architecture ensures maintainability, testability, and prevents the plugin from becoming unmaintainable as features are added. Obsidian's plugin lifecycle is simple; keeping main.ts minimal makes the codebase easier to understand and modify.

### II. Local-First & Privacy

**Principle**: Default to local operation; no network requests, telemetry, or external service calls without explicit user consent and clear disclosure.

**Rules**:
- Plugin MUST operate entirely offline unless network access is essential to the feature
- NO telemetry, analytics, or data collection MAY occur without explicit opt-in
- Network calls MUST be clearly documented in README.md and disclosed in plugin settings
- External services used (if any) MUST be documented with data sent, purpose, and risks
- Vault contents and filenames MUST NOT be transmitted unless absolutely necessary and explicitly consented
- Users MUST be able to use all core functionality without creating accounts or authenticating externally

**Rationale**: Obsidian users value privacy and local control. Violating this trust undermines the plugin ecosystem. Network features should be opt-in, transparent, and justified by clear user value.

### III. Resource Management

**Principle**: Properly register and clean up all resources to prevent memory leaks and ensure safe plugin unload.

**Rules**:
- ALL DOM event listeners MUST be registered using `this.registerDomEvent()`
- ALL workspace event listeners MUST be registered using `this.registerEvent()`
- ALL intervals/timeouts MUST be registered using `this.registerInterval()`
- Plugin unload MUST clean up all resources automatically via registered helpers
- NO raw event listeners MAY be added without cleanup (e.g., direct `addEventListener` without `registerDomEvent`)
- Plugin reload MUST work without duplicating listeners, intervals, or UI elements
- Startup MUST be lightweight; defer heavy work until needed (lazy initialization)

**Rationale**: Improper cleanup causes memory leaks, duplicated UI elements, and buggy behavior after reload. Obsidian provides `register*` helpers specifically to prevent these issues.

### IV. Mobile Compatibility

**Principle**: Design for cross-platform compatibility; avoid desktop-only assumptions unless `isDesktopOnly: true` is explicitly set.

**Rules**:
- Code MUST work on both desktop and mobile unless explicitly marked desktop-only
- Node.js and Electron APIs MUST NOT be used if mobile support is required
- UI MUST be responsive and work within Obsidian mobile constraints
- Memory usage MUST be reasonable for mobile devices (avoid large in-memory structures)
- If desktop-only, `manifest.json` MUST set `isDesktopOnly: true`
- Touch interactions MUST be considered for any custom UI components

**Rationale**: Many Obsidian users use mobile devices. Desktop-only assumptions create poor mobile experience unless explicitly documented.

### V. User Experience

**Principle**: Provide clear, discoverable commands with sensible defaults and graceful error handling.

**Rules**:
- Commands MUST have stable IDs (do not rename once released)
- Commands MUST use clear, action-oriented names in sentence case
- Settings MUST provide sensible defaults
- Settings MUST include validation and clear descriptions
- Errors MUST be handled gracefully with user-friendly messages (use `Notice` for feedback)
- Settings MUST persist using `this.loadData()` / `this.saveData()`
- UI strings MUST be short, consistent, and free of jargon
- Navigation instructions MUST use arrow notation (e.g., **Settings → Community plugins**)

**Rationale**: Good UX ensures users can discover, use, and troubleshoot the plugin effectively. Stable command IDs prevent user customization loss between updates.

## Security & Compliance

**Rules**:
- Follow Obsidian Developer Policies and Plugin Guidelines
- NO remote code execution, fetching and evaluating scripts, or auto-updating outside normal releases
- Minimize file system access; read/write only what is necessary
- Do NOT access files outside the vault
- Avoid deceptive patterns, ads, or spammy notifications
- Clear disclosure required for any external services or data transmission

**Rationale**: Security and privacy are foundational to user trust in the plugin ecosystem.

## Development Workflow

**Code Quality**:
- TypeScript with `"strict": true` is REQUIRED
- ESLint MUST pass before commits (run `npm run lint`)
- Code MUST follow Obsidian coding conventions documented in AGENTS.md
- Bundle MUST be tested manually by copying to `.obsidian/plugins/<plugin-id>/` before release

**Versioning & Releases**:
- Semantic Versioning MUST be used for `manifest.json` version field
- `versions.json` MUST map plugin version to minimum app version
- GitHub release tag MUST exactly match `manifest.json` version (no leading `v`)
- Release artifacts MUST include: `manifest.json`, `main.js`, `styles.css` (if present)
- `minAppVersion` MUST be accurate for API features used

**Build & Testing**:
- `npm run dev` for development watch mode
- `npm run build` for production builds
- `npm run lint` to run ESLint
- Do NOT commit build artifacts (`main.js`, `node_modules/`)
- All features MUST be manually tested in Obsidian before release

**Rationale**: Consistent workflow ensures quality releases and prevents common distribution issues.

## Governance

**Compliance**:
- All pull requests and code reviews MUST verify constitution compliance
- Violations of security/privacy principles are blocking issues
- Complexity MUST be justified in plan.md "Complexity Tracking" section when principles are violated

**Amendments**:
- Constitution changes require version bump according to semantic versioning:
  - MAJOR: Backward incompatible governance/principle removals or redefinitions
  - MINOR: New principle/section added or materially expanded guidance
  - PATCH: Clarifications, wording, typo fixes, non-semantic refinements
- Amendments MUST update this file with new `CONSTITUTION_VERSION` and `LAST_AMENDED_DATE`
- Dependent templates MUST be updated to reflect principle changes

**References**:
- Runtime development guidance: `AGENTS.md`
- Obsidian Plugin API: https://docs.obsidian.md
- Plugin Guidelines: https://docs.obsidian.md/Plugins/Releasing/Plugin+guidelines
- Developer Policies: https://docs.obsidian.md/Developer+policies

**Version**: 1.0.0 | **Ratified**: 2025-12-30 | **Last Amended**: 2025-12-30
