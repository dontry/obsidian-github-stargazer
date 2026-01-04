# Feature Specification: Parallel README Fetching During Sync

**Feature Branch**: `004-fetch-readme`
**Created**: 2025-01-04
**Status**: Draft
**Input**: User description: "I want to pull the readme file of each repo if the readme file is updated in the syncing process. It should be run in parallel with fetching repo metadata."

## Clarifications

### Session 2025-01-04

- Q: What is the storage architecture for README files (checkpoint only, vault files, or both)? → A: Store READMEs as individual markdown files in vault root folder (visible, searchable, editable by users)
- Q: How should README files be organized in the vault (folder structure vs flat)? → A: Flat structure directly in vault root as `{owner}-{repo}-README.md` files
- Q: What change detection mechanism should be used (repository timestamp vs README SHA)? → A: Use README-specific SHA from GitHub README API response for accurate change detection
- Q: How should the system handle README files that users have manually edited when the GitHub version also changes? → A: Prompt user to choose (overwrite local with remote, keep local edits, or show diff) when both local and remote have changed
- Q: What is the target concurrency level for parallel README fetching? → A: 5 concurrent requests (prioritizing rate limit safety over maximum speed)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Conditional README Fetching (Priority: P1)

As a user syncing my GitHub starred repositories, I want the system to fetch README files only when they have been updated so that I don't waste bandwidth and time downloading unchanged content.

**Why this priority**: This is the core value proposition - efficient README fetching. By only downloading READMEs that have changed, we minimize network traffic, reduce sync time, and provide users with up-to-date documentation for their starred repositories.

**Independent Test**: Can be tested by syncing repositories twice - the first sync fetches all READMEs, the second sync should only fetch READMEs for repositories where the README file has been modified on GitHub since the last sync.

**Acceptance Scenarios**:

1. **Given** a user starts syncing their starred repositories for the first time, **When** the system fetches repository metadata, **Then** it also fetches the README file for each repository in parallel with the metadata fetch
2. **Given** a repository has a README file, **When** the system fetches the README, **Then** it stores the README content and the README's SHA hash from GitHub README API
3. **Given** a user performs a subsequent sync, **When** the system checks a repository, **Then** it compares the stored README SHA with the current SHA from GitHub README API
4. **Given** the README SHA has changed since the last sync, **When** the system detects this change, **Then** it fetches the updated README file and updates the stored content and SHA
5. **Given** the README SHA has not changed since the last sync, **When** the system checks the repository, **Then** it skips fetching the README file and uses the stored content
6. **Given** a repository has no README file, **When** the system attempts to fetch it, **Then** it handles the absence gracefully, stores a null/empty README indicator, and does not fail the sync operation
7. **Given** README fetching fails due to a network error, **When** the error occurs, **Then** the system logs the error, stores a failed fetch indicator for that repository, and continues syncing other repositories

---

### User Story 2 - Parallel Fetching Performance (Priority: P2)

As a user waiting for a sync to complete, I want README files to be fetched in parallel with repository metadata so that the overall sync time is minimized.

**Why this priority**: Parallel execution significantly improves user experience by reducing total sync time. Once conditional fetching is implemented (User Story 1), parallel execution optimizes the process further, especially for users with many starred repositories.

**Independent Test**: Can be tested by measuring sync time with parallel fetching enabled versus sequential fetching, verifying that parallel execution completes faster than sequential for the same set of repositories.

**Acceptance Scenarios**:

1. **Given** the system is fetching repository metadata via GitHub API, **When** the metadata for each repository is retrieved, **Then** the system initiates README fetch requests in parallel without waiting for all metadata fetches to complete
2. **Given** multiple repositories are being synced, **When** README fetches are initiated, **Then** the system processes multiple README fetch requests concurrently rather than sequentially
3. **Given** the system is fetching READMEs in parallel, **When** one README fetch fails or times out, **Then** it does not block other README fetches from continuing
4. **Given** the sync process is interrupted, **When** a checkpoint is created, **Then** the checkpoint includes the last updated timestamp for each repository to enable conditional fetching on resume
5. **Given** a sync is resumed from a checkpoint, **When** fetching continues, **Then** README fetches proceed in parallel for the remaining repositories
6. **Given** the system is fetching READMEs in parallel, **When** rate limits are encountered, **Then** the system gracefully handles rate limit errors and implements appropriate backoff or queueing

---

### User Story 3 - README Content Storage & Display (Priority: P3)

As a user viewing my synced repositories, I want to see the README content for each repository so that I can understand what the project does without leaving Obsidian.

**Why this priority**: This provides the user-facing benefit of having README content available. While fetching and storing READMEs (User Stories 1 and 2) enables this feature, displaying the content is what users actually interact with and benefit from.

**Independent Test**: Can be tested by syncing a repository and opening the README markdown file in the vault to verify content is displayed correctly with proper formatting.

**Acceptance Scenarios**:

1. **Given** a repository with a successfully fetched README, **When** the user opens the README markdown file in the vault, **Then** the README content displays with proper markdown formatting in Obsidian
2. **Given** a repository with no README file, **When** viewing the repository in the plugin, **Then** the system displays a "No README available" message and no vault file is created
3. **Given** a repository where README fetch failed, **When** viewing the repository in the plugin, **Then** the system displays an error indicator and may offer a "Retry README fetch" option
4. **Given** README content includes relative links or images, **When** stored in the vault file, **Then** the system either preserves the links as-is or converts them to absolute GitHub URLs
5. **Given** README content is very large (>1MB), **When** stored in the vault, **Then** the system either stores the full content or provides a truncated version with a link to view online

---

### Edge Cases

- **Missing README file**: What happens when a repository has no README?
  - System should handle gracefully, store a null/empty indicator, and continue sync without failing

- **README in non-standard location**: What if README is named differently (README.md, readme.txt, README.rst, etc.)?
  - System should check for common README variations and fetch the first one found based on GitHub's API precedence

- **Binary README content**: What if the README contains binary data or is not text-based?
  - System should detect non-text content, skip fetching or store metadata-only, and log a warning

- **Large README files**: What happens when a README is very large (several MB)?
  - System should implement size limits, truncate or skip READMEs exceeding the limit, and log a warning

- **Private repositories**: What happens if a user has starred private repositories they no longer have access to?
  - System should handle access denied errors gracefully, skip README fetch for that repository, and continue sync

- **Rate limiting during parallel fetches**: What happens when GitHub API rate limits are hit during parallel README fetching?
  - System should respect rate limits, implement queuing or backoff, and continue fetching when limits reset

- **README with encoding issues**: What if the README has character encoding problems or invalid UTF-8?
  - System should attempt to detect and handle encoding issues, fall back to safe encoding, or store error indicator

- **Repository renamed/deleted**: What happens if a repository from the last sync was renamed or deleted on GitHub?
  - System should handle 404 errors, remove or mark the repository as unavailable, and continue with other repositories

- **Corrupted README data in storage**: What if previously stored README data is corrupted or invalid?
  - System should detect corruption during load, mark the repository for re-fetch, and attempt to fetch fresh README content

- **Very long README filenames**: What if a repository has an unusually long README filename or path?
  - System should validate filenames, handle within file system limits, and skip or truncate if necessary

- **README changes multiple times between syncs**: What if the repository is updated multiple times between syncs?
  - System should fetch the latest README based on the current SHA; intermediate versions are not captured (only latest state is stored)

- **Forked repositories**: What happens if a starred repository is a fork and the README points to the original repo?
  - System should fetch the README as it appears in the forked repository (the starred one), not the upstream source

- **User-edited README files**: What happens if a user manually edits a README file in their vault?
  - System must detect local file modifications and compare with GitHub version; if both changed, prompt user to choose: overwrite local with remote, keep local edits, or view diff before deciding

- **Filename collisions**: What if a README file name conflicts with an existing file in the user's vault root?
  - System should detect conflicts before creating files and prompt user to resolve (rename existing file, choose different name pattern, or skip)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST fetch README content for each starred repository during the sync process using the GitHub REST API endpoint `api.github.com/repos/{owner}/{repo}/readme`
- **FR-002**: System MUST store README content as individual markdown files directly in the vault root folder using flat structure
- **FR-002a**: System MUST name README files using consistent format `{owner}-{repo}-README.md` to prevent naming conflicts
- **FR-003**: System MUST store the README's SHA hash from the GitHub README API response to enable accurate change detection
- **FR-004**: System MUST compare the stored README SHA with the current SHA from GitHub README API before fetching content
- **FR-005**: System MUST fetch README content only if the README SHA has changed since the last sync (ensures README-only changes trigger fetches, not unrelated repo changes)
- **FR-006**: System MUST fetch README content during first-time sync (when no previous SHA exists)
- **FR-007**: System MUST initiate README fetch requests in parallel with repository metadata fetching
- **FR-008**: System MUST process up to 5 README fetch requests concurrently rather than sequentially (prioritizing rate limit safety)
- **FR-009**: System MUST handle missing README files gracefully without failing the sync operation
- **FR-010**: System MUST store a null/empty indicator for repositories with no README file
- **FR-011**: System MUST check for common README file variations (README.md, readme.md, README.txt, README.rst, etc.)
- **FR-012**: System MUST include README metadata (file path, SHA hash, fetch status) in the checkpoint file for resume functionality, while actual README content is stored in vault markdown files
- **FR-013**: System MUST use the stored README SHA from checkpoint when resuming a sync to determine if README needs re-fetching
- **FR-014**: System MUST implement size limits for README content (e.g., maximum 5MB) and skip or truncate READMEs exceeding the limit
- **FR-015**: System MUST log errors when README fetch fails but continue syncing other repositories
- **FR-016**: System MUST store a failed fetch indicator for repositories where README fetch failed
- **FR-017**: System MUST handle GitHub API rate limits during parallel README fetching with appropriate backoff or queuing
- **FR-018**: System MUST preserve README formatting (markdown) when storing and displaying content
- **FR-019**: System MUST provide a way for users to view README content for each synced repository
- **FR-020**: System MUST display appropriate indicators for repositories with no README or failed README fetches
- **FR-021**: System MUST handle repositories that are no longer accessible (404, access denied) gracefully without failing the entire sync
- **FR-022**: System MUST detect filename collisions before creating README files in vault root and prompt user to resolve conflicts
- **FR-023**: System MUST track local file modification state for each README vault file to detect user edits
- **FR-024**: When both local and remote README have changed, system MUST prompt user with options: overwrite local with GitHub version, keep local edits, or view diff before deciding
- **FR-025**: System MUST provide a diff view showing changes between local edited version and GitHub version when user selects that option

### Key Entities

- **Repository Metadata**: Extended to include README information:
  - Repository ID, name, description, URL
  - Star count, primary language
  - Owner information
  - Starred timestamp
  - **README vault file path** (absolute or relative path to the markdown file in vault)
  - **README SHA hash** (from GitHub README API, used for accurate change detection)
  - **Local modification state** (whether user has edited the vault file since last sync)
  - **README fetch status** (success, failed, not_available)
  - **README last fetched timestamp** (when the README was last downloaded)

- **README Vault File**: Represents a markdown file stored in the vault containing repository README content:
  - Raw markdown/text content from GitHub
  - Original README file name (e.g., "README.md", "README.rst")
  - SHA hash (for change detection)
  - Size in bytes
  - Fetch timestamp (can be derived from file modification time)
  - Source repository URL (referenced in file metadata or frontmatter)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Sync completes in less than 50% of the time compared to sequential README fetching for users with 100+ starred repositories
- **SC-002**: Subsequent syncs for unchanged repositories skip 100% of README fetches (zero unnecessary downloads)
- **SC-003**: README content is successfully fetched and stored for 95% of repositories that have a README file
- **SC-004**: Sync operation does not fail even if 20% of README fetch requests fail (graceful degradation)
- **SC-005**: README content reflects the latest version on GitHub within 1 minute of the repository being updated
- **SC-006**: Users can view README content for successfully fetched repositories within 2 seconds of selecting the repository
- **SC-007**: README fetching during first-time sync adds no more than 30% additional time compared to metadata-only sync for the same set of repositories
- **SC-008**: Memory usage remains constant regardless of the number of repositories being synced (streaming/chunked processing)
- **SC-009**: Checkpoint file size remains minimal as it stores only README metadata (file paths, SHA hashes) rather than full content; vault storage for README files scales with repository count
- **SC-010**: Parallel README fetching processes exactly 5 repositories concurrently to balance performance with GitHub API rate limit safety
- **SC-011**: Users are notified of failed README fetches with specific error messages (rate limit, access denied, not found) for 100% of failures

## Assumptions

- GitHub README API endpoint returns `sha` field that uniquely identifies README content version
- GitHub REST API endpoint `api.github.com/repos/{owner}/{repo}/readme` provides README content in base64 encoding along with SHA hash
- README SHA provides more accurate change detection than repository-level timestamps (detects README-only changes)
- Concurrency level of 5 parallel requests provides good balance between performance and GitHub API rate limit safety
- README files are primarily text-based (markdown, text, reStructuredText, etc.)
- Most repositories have README files in common locations (root directory, standard names)
- Average README file size is less than 100KB
- Users have sufficient disk space in their vault to store README markdown files
- Users want README content available offline within Obsidian as part of their knowledge base
- Users may want to edit or annotate fetched READMEs in their vault
- README changes are important enough to warrant fetching when the README file itself is updated
- Parallel fetching provides significant performance benefits over sequential fetching
- README content from public repositories does not pose security concerns when stored locally
- Private repository starred by the user implies access to fetch README (unless access was revoked)
- The checkpoint file stores README metadata only (file paths, SHA hashes), not full content
- GitHub API rate limits allow for reasonable parallel fetching (with proper backoff handling)

## Out of Scope *(optional)*

- The following are explicitly excluded from this feature:
  - README editing or modification within the plugin
  - Automatic README refresh on a schedule (only during manual sync)
  - Differential rendering or syntax highlighting for different README formats (markdown only, plain text for others)
  - README content search or indexing
  - README change history or versioning (only latest version is stored)
  - README content from non-GitHub sources (e.g., GitLab, Bitbucket repositories)
  - Automatic README fetching from dependency or related repositories (only starred repositories)
  - README content sharing or export to external tools
  - Real-time README updates (only during sync operations)
  - README preview with live rendering of code blocks or diagrams
  - Handling of very large binary files that might be named README (e.g., README.pdf)
  - Authentication for private repositories beyond the user's existing GitHub token
  - README localization or multi-language README handling (fetches first/default README only)
