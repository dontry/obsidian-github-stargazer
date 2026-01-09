# Feature Specification: Repository Metadata as Frontmatter

**Feature Branch**: `006-repo-metadata-frontmatter`
**Created**: 2025-01-05
**Status**: Draft
**Input**: User description: "I want to change the readme file path to owner/repo/readme.md. I also want to save the repo metadata as a separate markdown file and store the metadata as frontmatter"

## Clarifications

### Session 2025-01-05

- Q: How should the metadata file be structured relative to the README? → A: Separate metadata file alongside README (two files in same directory)
- Q: How should existing README files be handled when changing to new path structure? → A: Leave existing files in place; only apply new structure to newly synced repos (temporary testing vault context)
- Q: What should happen when a repository is unstarred on GitHub? → A: Show user prompt to confirm deletion of local files, then delete if confirmed
- Q: How to name files to avoid many files with the same name in Obsidian UX? → A: Use unique names: `owner-repository-metadata.md` and `owner-repository-readme.md` (e.g., `facebook-react-metadata.md` and `facebook-react-readme.md` in `facebook/react/` directory)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Repository Metadata with Frontmatter (Priority: P1)

As a user, I want each synced GitHub repository to have its metadata stored as frontmatter in a separate markdown file so that I can query, filter, and organize my starred repositories using Obsidian's dataview and other metadata-aware plugins.

**Why this priority**: This is the core value proposition - making repository metadata queryable and structured within Obsidian unlocks powerful organization and discovery capabilities that aren't possible with plain text files.

**Independent Test**: Can be fully tested by syncing a single repository and verifying that a separate `owner-repository-metadata.md` file is created with YAML frontmatter containing key repository metadata (name, description, stars, language, topics, etc.). Delivers immediate value as users can now query repositories by any metadata field.

**Acceptance Scenarios**:

1. **Given** a user has starred repositories on GitHub, **When** the sync process runs, **Then** each repository is saved as a `owner-repository-metadata.md` file with YAML frontmatter containing all available metadata from GitHub API
2. **Given** a repository has been synced, **When** the `owner-repository-metadata.md` file is opened in Obsidian, **Then** the frontmatter is visible at the top of the file and can be queried by Obsidian plugins like Dataview
3. **Given** existing repository metadata files without frontmatter, **When** the sync runs, **Then** the files are updated to include frontmatter metadata without losing existing content
4. **Given** a repository's metadata changes on GitHub, **When** the sync runs, **Then** the frontmatter in `owner-repository-metadata.md` is updated with the latest values
5. **Given** a repository is unstarred on GitHub, **When** the sync runs, **Then** the system prompts user to confirm deletion of local files and deletes them only if confirmed

---

### User Story 2 - Structured README File Organization (Priority: P2)

As a user, I want README files to be organized in an `owner/repo/readme.md` path structure so that repositories from the same owner are grouped together, making it easier to browse and organize my starred repositories.

**Why this priority**: This improves organization and reduces clutter in the vault. While valuable, it's secondary to having metadata available since the metadata itself enables better organization through queries.

**Independent Test**: Can be fully tested by syncing repositories from multiple owners and verifying that both README and metadata files are created in `owner/repository-name/` directory paths with unique names. Delivers value through improved file organization.

**Acceptance Scenarios**:

1. **Given** repositories from multiple owners are synced, **When** files are created, **Then** both `owner-repository-readme.md` and `owner-repository-metadata.md` files are organized in `owner/repository-name/` directory
2. **Given** a repository from owner "facebook" named "react", **When** synced, **Then** the files are saved at `facebook/react/facebook-react-readme.md` and `facebook/react/facebook-react-metadata.md`
3. **Given** a repository has no README, **When** synced, **Then** no README file is created, but the `owner-repository-metadata.md` metadata file is still created
4. **Given** an owner directory already exists, **When** a new repository from the same owner is synced, **Then** both files are added to the existing owner directory

---

### Edge Cases

- What happens when a repository name contains special characters or spaces that are invalid in file paths?
- How does the system handle repositories with the same name from different owners?
- How does the system handle repositories with very long names that might exceed filesystem path limits?
- What happens when GitHub API rate limits are reached during sync?
- How does the system handle repositories that have been renamed on GitHub?
- What happens when frontmatter contains characters that break YAML formatting (e.g., quotes, newlines in description)?
- What happens when user cancels or dismisses the deletion confirmation prompt for unstarred repositories? (RESOLVED: Files remain, prompt shown again on next sync)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create a separate `owner-repository-metadata.md` markdown file for each synced repository containing YAML frontmatter with repository metadata, stored in the same directory as the README
- **FR-002**: System MUST include in frontmatter: repository name, full name, description, star count, language, primary language, topics, URL, owner login, created at, updated at, homepage URL, license, fork count, open issues count, and watchers count
- **FR-003**: System MUST store README files using the path structure `owner/repository-name/owner-repository-readme.md`
- **FR-004**: System MUST handle repositories without README files gracefully (create `owner-repository-metadata.md` metadata file but no README file)
- **FR-005**: System MUST sanitize repository and owner names to be filesystem-safe (replace invalid characters, handle spaces)
- **FR-006**: System MUST update existing `owner-repository-metadata.md` files when metadata changes on GitHub during subsequent syncs
- **FR-007**: System MUST preserve manual edits to the content body of `owner-repository-metadata.md` files (only update frontmatter section)
- **FR-008**: System MUST escape or wrap YAML values that contain special characters (quotes, colons, newlines) appropriately
- **FR-009**: System MUST create owner directories automatically if they don't exist
- **FR-010**: System MUST handle repositories from the same owner with the same name (should not happen in practice, but need safeguard)
- **FR-011**: When a repository is unstarred on GitHub, system MUST detect this and prompt user to confirm deletion of local files (`owner-repository-metadata.md` and `owner-repository-readme.md`)
- **FR-012**: System MUST delete both `owner-repository-metadata.md` and `owner-repository-readme.md` files (and owner directory if empty) only after user confirms deletion prompt

### Key Entities

- **Repository Metadata**: Structured data from GitHub API including repository identifiers, statistics, classification fields (language, topics), and timestamps
- **Repository Metadata File**: Separate markdown file named `owner-repository-metadata.md` containing YAML frontmatter with repository metadata, stored at `owner/repository-name/owner-repository-metadata.md`. Users can add their own notes in the content body which will be preserved during updates.
- **README File**: Raw markdown content from the repository's README, stored at `owner/repository-name/owner-repository-readme.md`
- **Owner Directory**: Directory named after the GitHub user or organization, containing both `owner-repository-metadata.md` and `owner-repository-readme.md` files for each repository

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can query repositories by any metadata field (language, stars, topics, etc.) using Obsidian Dataview or similar plugins within 5 seconds
- **SC-002**: 100% of synced repositories have complete and accurate frontmatter metadata in `owner-repository-metadata.md` files matching GitHub API data
- **SC-003**: README and metadata files are correctly organized in `owner/repository-name/` structure with unique names for 100% of repositories
- **SC-004**: Sync process completes for 500 repositories in under 2 minutes on standard hardware
- **SC-005**: Manual edits to `owner-repository-metadata.md` content body are preserved across 100% of sync updates
- **SC-006**: Users can successfully navigate to any repository's files by following the `owner/repository-name/` path structure and uniquely named files

## Assumptions

- Users have Obsidian installed with support for YAML frontmatter (built-in feature)
- GitHub API provides complete metadata for starred repositories via standard endpoints
- Obsidian vault filesystem uses standard path separators and naming conventions
- Users may want to add their own notes to `owner-repository-metadata.md` files, which should be preserved
- Unique file names (`owner-repository-metadata.md` and `owner-repository-readme.md`) prevent confusion in Obsidian's search, autocomplete, graph view, and backlinks
- Most repositories will have README files, but some may not (common for small or experimental repos)
- Standard YAML frontmatter format is sufficient for GitHub metadata (no need for more complex formats)
- README file saving feature already exists; this feature only changes the file path structure
- Existing README files in old locations will not be migrated; new structure applies only to newly synced repositories
