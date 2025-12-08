# Requirements Document

## Introduction

This document specifies the requirements for enabling file and folder renaming functionality in nested collections when the `subfolders` configuration is set to `false`. Currently, users cannot rename files or folders in nested collections with this configuration, limiting content management flexibility. This feature will allow users to reorganize their content structure by renaming both individual files and folders within nested collections.

## Glossary

- **Nested Collection**: A collection type in Decap CMS that organizes entries in a hierarchical folder structure
- **Subfolders Configuration**: A boolean setting (`nested.subfolders`) that controls whether nested collections display subfolder navigation (default: `true`)
- **Entry**: A content item stored as a file in the repository
- **Slug**: A unique identifier for an entry, typically derived from the filename
- **Meta Path**: The directory path where an entry is stored, relative to the collection folder
- **Backend Implementation**: The storage layer (GitHub, GitLab, Bitbucket, etc.) that handles file operations
- **Entry Draft**: The in-memory representation of an entry being edited
- **Custom Path**: A user-specified path for storing an entry, overriding the default path generation

## Requirements

### Requirement 1

**User Story:** As a content editor, I want to rename files in nested collections when subfolders is false, so that I can correct filenames and improve content organization without changing the folder structure.

#### Acceptance Criteria

1. WHEN a user edits an entry in a nested collection with subfolders set to false THEN the system SHALL provide a UI control to modify the filename
2. WHEN a user changes a filename or folder name, it should alert the user that it could impact the URL and result in unwanted 404 errors.
2. WHEN a user changes the filename of an entry THEN the system SHALL validate that the new filename is unique within the current folder
3. WHEN a user saves an entry with a modified filename THEN the system SHALL persist the file with the new name and delete the old file
4. WHEN a filename change is persisted THEN the system SHALL update the entry slug to match the new filename
5. WHEN a filename contains invalid characters THEN the system SHALL sanitize the filename according to the slug configuration rules


### Requirement 3

**User Story:** As a content editor, I want to rename folders in nested collections when subfolders is false, so that I can improve the organization and naming of my content hierarchy.

#### Acceptance Criteria

1. WHEN a user views a nested collection with subfolders set to false THEN the system SHALL provide a UI control to rename folders in the tree navigation
2. WHEN a user renames a folder THEN the system SHALL validate that the new folder name is unique within the parent directory
3. WHEN a folder rename is confirmed THEN the system SHALL update all entries within that folder to reflect the new path
4. WHEN a folder rename is persisted THEN the system SHALL move all files from the old folder path to the new folder path in a single commit
5. WHEN a folder contains subfolders THEN the system SHALL recursively update all nested paths

### Requirement 4

**User Story:** As a developer, I want the backend to support atomic file move operations, so that file and folder renames are reliable and maintain data integrity.

#### Acceptance Criteria

1. WHEN the backend persists an entry with a new path THEN the system SHALL support a move operation that deletes the old file and creates the new file
2. WHEN a move operation is executed THEN the system SHALL perform both operations in a single commit
3. WHEN a move operation fails THEN the system SHALL not leave orphaned files or partial changes
4. WHEN moving multiple files (folder rename) THEN the system SHALL batch all operations into a single commit
5. WHEN the backend does not support move operations THEN the system SHALL fall back to delete-then-create operations


### Requirement 6

**User Story:** As a content editor, I want to see validation errors before saving when renaming files or folders, so that I can correct issues without losing my work.

#### Acceptance Criteria

1. WHEN a user enters a filename that already exists in the target folder THEN the system SHALL display an error message indicating the conflict
2. WHEN a user enters a folder name that already exists in the parent directory THEN the system SHALL display an error message indicating the conflict
3. WHEN a user enters invalid characters in a filename or folder name THEN the system SHALL display an error message with the list of invalid characters
4. WHEN validation errors are present THEN the system SHALL prevent the save operation until errors are resolved
5. WHEN a user corrects validation errors THEN the system SHALL clear the error messages and allow saving

### Requirement 7

**User Story:** As a content editor, I want rename operations to work with the editorial workflow, so that I can review path changes before they are published.

#### Acceptance Criteria

1. WHEN editorial workflow is enabled and a user renames a file THEN the system SHALL create an unpublished entry with the new path
2. WHEN an unpublished entry with a path change is published THEN the system SHALL move the file to the new location in the main branch
3. WHEN an unpublished entry with a path change is deleted THEN the system SHALL discard the path change without affecting the published entry
4. WHEN viewing an unpublished entry with a path change THEN the system SHALL display both the old and new paths
5. WHEN a path change conflicts with an existing file THEN the system SHALL detect the conflict at publish time and prevent publishing

### Requirement 8

**User Story:** As a content editor, I want rename operations to work with i18n collections, so that all locale files are moved together.

#### Acceptance Criteria

1. WHEN an entry in an i18n collection is renamed THEN the system SHALL rename all locale-specific files
2. WHEN an entry in an i18n collection is moved THEN the system SHALL move all locale-specific files to the new location
3. WHEN a folder containing i18n entries is renamed THEN the system SHALL update paths for all locale files in all entries
4. WHEN i18n structure is MULTIPLE_FOLDERS THEN the system SHALL maintain the locale folder structure during moves
5. WHEN i18n structure is MULTIPLE_FILES THEN the system SHALL maintain the locale file naming convention during renames

### Requirement 9

**User Story:** As a developer, I want the rename functionality to maintain backward compatibility, so that existing collections without the feature continue to work unchanged.

#### Acceptance Criteria

1. WHEN a collection has subfolders set to true THEN the system SHALL not display rename controls
2. WHEN a collection does not have the nested configuration THEN the system SHALL not display rename controls
3. WHEN a collection has meta.path.index_file configured THEN the system SHALL use the legacy path behavior
4. WHEN the backend does not support the required operations THEN the system SHALL gracefully disable rename functionality
5. WHEN rename functionality is disabled THEN the system SHALL not show rename UI controls
