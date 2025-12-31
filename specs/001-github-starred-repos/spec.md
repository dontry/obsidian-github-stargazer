# Feature Specification: GitHub Starred Repositories Manager

**Feature Branch**: `001-github-starred-repos`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "I want to build an Obsidian plugin to manage users' github starred repositories. So it should pull the metadata of the repository to the local and also the README file by using github API with user's Auth token. If the repository has been pulled then it should keep it updated and sync it. A user can write notes about the linked repository side-by-side. So the user can un-star repositories in a batch. It should allow users to add custom tags tothe repository for categorization."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Sync Starred Repositories (Priority: P1)

A user wants to import all their GitHub starred repositories into Obsidian so they can manage and annotate them locally. The user provides their GitHub personal access token, and the system fetches all starred repositories with their metadata and README files.

**Why this priority**: This is the foundational feature. Without the ability to import starred repositories, no other features can function. This delivers immediate value by giving users a local copy of their GitHub stars.

**Independent Test**: Can be fully tested by configuring a GitHub token, triggering the sync, and verifying that starred repositories appear in Obsidian with metadata and READMEs.

**Acceptance Scenarios**:

1. **Given** the plugin is installed and configured with a valid GitHub token, **When** the user initiates sync for the first time, **Then** all starred repositories are imported with metadata (name, description, stars, language, URL) and README files
2. **Given** the plugin has previously synced repositories, **When** the user initiates sync again, **Then** only new or updated repositories are fetched, and existing data is preserved
3. **Given** the user provides an invalid GitHub token, **When** sync is attempted, **Then** the system displays a clear error message explaining the authentication problem
4. **Given** the user has no starred repositories, **When** sync is initiated, **Then** the system displays a message indicating no repositories were found

---

### User Story 2 - Browse and Filter Repositories (Priority: P2)

A user wants to view their imported starred repositories in an organized way. They can browse all repositories, search by name or description, and filter by tags or programming language to find relevant repositories quickly.

**Why this priority**: Once repositories are imported, users need an efficient way to view and find them. This enables all subsequent interactions with individual repositories.

**Independent Test**: Can be tested by importing repositories, then verifying the list view, search functionality, and filters work correctly.

**Acceptance Scenarios**:

1. **Given** repositories have been synced, **When** the user opens the repository view, **Then** all repositories are displayed in a list with key metadata (name, description, star count, language)
2. **Given** the repository list is displayed, **When** the user enters a search term, **Then** the list filters to show only repositories matching the search in name or description
3. **Given** repositories have custom tags assigned, **When** the user selects a tag filter, **Then** only repositories with that tag are displayed
4. **Given** repositories use different programming languages, **When** the user selects a language filter, **Then** only repositories using that language are displayed

---

### User Story 3 - Add Notes and Link Resources to Repositories (Priority: P3)

A user wants to write personal notes about why they starred a repository, how they plan to use it, or documentation from their experimentation. Users can also link related external resources such as Google Code Wiki pages (https://codewiki.google/) to provide additional context and documentation. Notes and linked resources are stored alongside the repository metadata and can be edited at any time.

**Why this priority**: Notes and resource links add significant value by allowing users to capture their reasoning, context, and related documentation. This transforms the plugin from a simple sync tool into a comprehensive knowledge management system that connects GitHub repositories with internal documentation.

**Independent Test**: Can be tested by selecting a repository, adding notes with linked resources, saving, and verifying the notes and links persist and can be edited.

**Acceptance Scenarios**:

1. **Given** a repository is selected, **When** the user opens the notes panel, **Then** a text editor is displayed for that repository
2. **Given** the notes panel is open, **When** the user writes and saves notes, **Then** the notes are persisted and associated with the repository
3. **Given** a repository has existing notes, **When** the user opens the notes panel, **Then** the previous notes are displayed and can be edited
4. **Given** the user switches between repositories, **When** navigating, **Then** each repository's notes are loaded independently without mixing
5. **Given** the notes panel is open, **When** the user adds a Google Code Wiki URL (or other external resource), **Then** the link is saved and displayed as a clickable reference in the notes
6. **Given** a repository has linked resources, **When** the user views the repository details, **Then** all linked resources are displayed and accessible
7. **Given** the user wants to remove a linked resource, **When** they delete the link, **Then** it is removed from the repository while preserving other notes

---

### User Story 4 - Tag Repositories for Categorization (Priority: P4)

A user wants to organize their starred repositories using custom tags like "frontend", "backend", "tutorial", "library", "production-ready". Tags are created by the user and can be applied to multiple repositories for flexible categorization.

**Why this priority**: Tags enable personal organization systems, making it easier to find repositories by purpose or context. This is a powerful feature for users with many starred repositories.

**Independent Test**: Can be tested by creating custom tags, applying them to repositories, and filtering by tags to verify the organization system works.

**Acceptance Scenarios**:

1. **Given** the tag management interface is open, **When** the user creates a new tag, **Then** the tag is added to their available tags
2. **Given** a repository is selected, **When** the user applies one or more tags, **Then** those tags are associated with the repository
3. **Given** repositories have tags applied, **When** the user filters by a specific tag, **Then** only repositories with that tag are displayed
4. **Given** a tag is no longer needed, **When** the user deletes a tag, **Then** the tag is removed from all repositories

---

### User Story 5 - Batch Un-Star Repositories (Priority: P5)

A user wants to remove GitHub stars from multiple repositories at once directly from Obsidian. They can select multiple repositories in the UI and un-star them in batch, with the option to keep or remove the local copy.

**Why this priority**: This is a convenience feature for managing large collections. It's lower priority because users can still un-star repositories individually on GitHub, but batch operations significantly improve efficiency.

**Independent Test**: Can be tested by selecting multiple repositories and executing the batch un-star operation, then verifying on GitHub that the stars were removed.

**Acceptance Scenarios**:

1. **Given** repositories are displayed, **When** the user selects multiple repositories, **Then** all selected repositories are highlighted as selected
2. **Given** multiple repositories are selected, **When** the user executes batch un-star, **Then** the system confirms the action and removes stars from GitHub for all selected repositories
3. **Given** batch un-star is executed, **When** the operation completes, **Then** the user is prompted whether to keep or remove local copies of the repositories
4. **Given** the user chooses to keep local copies after un-starring, **When** the confirmation is processed, **Then** repository data remains in Obsidian but is marked as un-starred

---

### Edge Cases

- What happens when a starred repository is deleted from GitHub after being synced?
- How does the system handle private repositories in the user's starred list?
- What happens when README files are extremely large (>1MB)?
- How does the system handle rate limiting from the GitHub API?
- What happens when the user's token loses access to repositories they previously starred?
- How does the system handle repositories with no README file?
- What happens when tags are deleted that are applied to many repositories?
- How does the system handle network interruptions during sync?
- What happens when repository names or descriptions contain special characters or emoji?
- How does the system handle repositories that have been renamed on GitHub?
- What happens when a linked external resource (like Google Code Wiki) becomes inaccessible or returns 404?
- How does the system handle invalid URLs when users add external resource links?
- What happens when the same external resource is linked to multiple repositories?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to configure their GitHub personal access token in plugin settings
- **FR-002**: System MUST fetch all starred repositories from GitHub API using the authenticated user's token
- **FR-003**: System MUST store repository metadata including: name, full name, description, star count, primary language, URL, owner, creation date, last updated date
- **FR-004**: System MUST fetch and store README content for each starred repository
- **FR-005**: System MUST support incremental sync to fetch only new or updated repositories
- **FR-006**: System MUST display a browsable list of all synced repositories
- **FR-007**: System MUST provide search functionality to filter repositories by name or description
- **FR-008**: Users MUST be able to create custom tags for categorization
- **FR-009**: Users MUST be able to apply multiple tags to a single repository
- **FR-010**: Users MUST be able to filter repositories by applied tags
- **FR-011**: Users MUST be able to filter repositories by programming language
- **FR-012**: Users MUST be able to write and save notes for each repository
- **FR-013**: System MUST persist notes and associate them with specific repositories
- **FR-014**: Users MUST be able to link external resources (such as Google Code Wiki pages) to repositories in their notes
- **FR-015**: System MUST validate URLs when users add external resource links
- **FR-016**: System MUST display linked resources as clickable references in the repository view
- **FR-017**: Users MUST be able to remove linked resources from repositories
- **FR-018**: Users MUST be able to select multiple repositories at once
- **FR-019**: Users MUST be able to un-star multiple selected repositories in batch
- **FR-020**: System MUST provide option to keep or remove local copies when un-starring repositories
- **FR-021**: System MUST handle GitHub API rate limiting gracefully with appropriate user feedback
- **FR-022**: System MUST display clear error messages for authentication failures
- **FR-023**: System MUST sync repository data when manually triggered by the user
- **FR-024**: System MUST support viewing repository details including metadata, README, notes, and linked resources in a single view

### Key Entities

- **Starred Repository**: A GitHub repository that the user has starred. Contains metadata (name, description, star count, language, URL, owner, dates), README content, user notes, applied tags, and linked external resources. Uniquely identified by GitHub repository ID.

- **Tag**: A user-created label for categorizing repositories. Has a name (user-defined) and can be applied to multiple repositories. Tags are created, managed, and deleted by the user.

- **Repository Note**: User-written content associated with a specific repository. Contains free-form text with markdown formatting supported. Can include links to external resources like Google Code Wiki pages. Each repository has at most one note. Notes are created, edited, and deleted by the user.

- **Linked External Resource**: A URL pointing to external documentation or resources (e.g., Google Code Wiki page at https://codewiki.google/) associated with a repository. Each repository can have multiple linked resources. Resources are created and deleted by the user. URLs are validated when added.

- **GitHub Personal Access Token**: User's authentication credential for accessing GitHub API. Stored securely in plugin settings. Used for all authenticated requests to GitHub.

## Clarifications

### Session 2025-12-31

- Q: Which testing framework should be used for unit and integration tests? → A: Vitest (not Jest)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can complete initial sync of 100 starred repositories in under 30 seconds
- **SC-002**: Users can find any specific repository from a collection of 500+ using search or filters in under 5 seconds
- **SC-003**: 95% of users successfully add notes or link external resources to at least one repository within their first session
- **SC-004**: Batch un-star operation completes for 50 repositories in under 10 seconds
- **SC-005**: System handles GitHub API rate limiting without data loss or requiring manual retry
- **SC-006**: Users report that the plugin helps them organize and recall their starred repositories more effectively than GitHub alone
- **SC-007**: Users can link external resources (like Google Code Wiki pages) to repositories in under 5 seconds
