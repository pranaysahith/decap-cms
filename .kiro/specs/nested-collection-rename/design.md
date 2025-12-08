# Design Document

## Overview

This design document outlines the implementation approach for enabling file and folder renaming in nested collections when `subfolders` is configured to `false`. The feature will allow users to rename files, move files between folders, and rename entire folders while maintaining data integrity and supporting advanced features like i18n and editorial workflow.

The implementation spans both frontend and backend components:
- **Frontend**: UI controls for renaming, validation, and state management
- **Backend**: File move operations, path updates, and atomic commits

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        UI Layer                              │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │ Entry Editor     │  │ Tree Navigation  │                │
│  │ - Filename Input │  │ - Folder Rename  │                │
│  │ - Path Input     │  │ - Context Menu   │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Redux Actions Layer                       │
│  - updateEntryPath()                                         │
│  - renameFolder()                                            │
│  - validatePath()                                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend Layer                             │
│  - persistEntry() with newPath support                      │
│  - moveFiles() for folder renames                           │
│  - validateUniquePath()                                      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Backend Implementation Layer                    │
│  (GitHub, GitLab, Bitbucket, etc.)                          │
│  - File move operations                                      │
│  - Atomic commits                                            │
└─────────────────────────────────────────────────────────────┘
```

### Component Interaction Flow

1. **User initiates rename**: User modifies filename or path in UI
2. **Warning display**: System displays warning about potential URL/404 impact
3. **Validation**: Frontend validates the new path for uniqueness and validity
4. **State update**: Redux action updates entry draft with new path
5. **Persist**: Backend persists entry with move operation (delete old + create new)
6. **Update references**: System updates all related references (i18n files)
7. **Commit**: Changes are committed atomically to the repository

## Components and Interfaces

### Frontend Components

#### 1. EntryPathEditor Component

A new component for editing entry paths in the entry editor.

```typescript
interface EntryPathEditorProps {
  collection: Collection;
  entry: EntryMap;
  onChange: (path: string, filename: string) => void;
  disabled: boolean;
}

interface EntryPathEditorState {
  path: string;
  filename: string;
  validationError: string | null;
}
```

**Responsibilities:**
- Display current path and filename
- Allow editing of path and filename separately
- Validate changes in real-time
- Show validation errors
- Display warning about potential URL/404 impact when renaming

**Design Rationale:**
The URL/404 warning is critical for user awareness. When users rename files or folders, they may not immediately realize that existing URLs pointing to the old path will break. This warning should be:
- Displayed prominently but not intrusively (e.g., as an info banner)
- Shown whenever the user modifies the filename or path
- Dismissible but persistent across the editing session
- Clear about the consequences (broken links, 404 errors)

#### 2. FolderRenameControl Component

A context menu or inline control for renaming folders in the tree navigation.

```typescript
interface FolderRenameControlProps {
  collection: Collection;
  folderPath: string;
  onRename: (oldPath: string, newPath: string) => Promise<void>;
}

interface FolderRenameControlState {
  isEditing: boolean;
  newName: string;
  validationError: string | null;
}
```

**Responsibilities:**
- Trigger rename mode for folders
- Validate new folder names
- Dispatch rename action
- Show progress and errors
- Display warning about potential URL/404 impact when renaming

**Design Rationale:**
Folder renames have an even broader impact than file renames since they affect all entries within the folder. The warning should emphasize:
- Multiple URLs will be affected
- All entries in the folder will have new paths
- The scope of the change (number of affected entries)

### Backend Interfaces

#### 1. Enhanced DataFile Interface

```typescript
interface DataFile {
  path: string;
  slug: string;
  raw: string;
  newPath?: string;  // NEW: Target path for move operation
}
```

#### 2. Backend Implementation Interface Extension

```typescript
interface BackendImplementation {
  // Existing methods...
  
  // NEW: Move files atomically
  moveFiles?(
    moves: Array<{ oldPath: string; newPath: string }>,
    commitMessage: string
  ): Promise<void>;
  
  // NEW: Check if path exists
  pathExists?(path: string): Promise<boolean>;
}
```

### Redux Actions

#### 1. Entry Path Actions

```typescript
// Update entry path in draft
function updateEntryPath(
  path: string,
  filename: string
): ThunkAction;

// Validate path uniqueness
function validateEntryPath(
  collection: Collection,
  path: string,
  filename: string,
  currentSlug?: string
): ThunkAction;
```

#### 2. Folder Rename Actions

```typescript
// Rename folder and all contained entries
function renameFolder(
  collection: Collection,
  oldPath: string,
  newPath: string
): ThunkAction;

// Get all entries in a folder
function getEntriesInFolder(
  collection: Collection,
  folderPath: string
): ThunkAction;
```

## Data Models

### Entry Draft Extension

The entry draft state will be extended to track path changes:

```typescript
interface EntryDraftState {
  entry: EntryMap;
  fieldsMetaData: Map<string, any>;
  fieldsErrors: Map<string, any>;
  hasChanged: boolean;
  key: string;
  
  // NEW: Track original path for move detection
  originalPath?: string;
  
  // NEW: Track path validation state
  pathValidation?: {
    isValid: boolean;
    error?: string;
  };
}
```

### Folder Rename Operation

```typescript
interface FolderRenameOperation {
  collection: string;
  oldPath: string;
  newPath: string;
  affectedEntries: Array<{
    slug: string;
    oldPath: string;
    newPath: string;
  }>;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  error?: string;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

**Note on Requirements Numbering:** The requirements document jumps from Requirement 1 to Requirement 3, with no Requirement 2 defined. This appears to be an organizational decision, possibly reserving Requirement 2 for future file movement functionality between folders (as distinct from renaming). The properties below follow the actual requirement numbers in the requirements document.

### Property 1: Filename uniqueness validation

*For any* folder and any new filename, when validating a filename change, the validation should fail if and only if another file with that name already exists in the target folder (excluding the current file being renamed).

**Validates: Requirements 1.3**

**Note:** The requirements document has a numbering issue with two items labeled "2" in Requirement 1. This property validates the second item 2 (filename uniqueness), which should be numbered 1.3.

### Property 2: File rename atomicity

*For any* entry with a filename change, when the entry is persisted, the old file should no longer exist and the new file should exist with identical content.

**Validates: Requirements 1.4**

**Note:** Corresponds to acceptance criteria 3 in Requirement 1 (should be numbered 1.4 after fixing the duplicate "2").

### Property 3: Slug updates with filename

*For any* entry with a filename change, after persisting, the entry slug should match the new filename (without extension).

**Validates: Requirements 1.5**

**Note:** Corresponds to acceptance criteria 4 in Requirement 1 (should be numbered 1.5 after fixing the duplicate "2").

### Property 4: Filename sanitization

*For any* string containing invalid characters, when used as a filename, the system should sanitize it according to slug configuration rules, removing or replacing all invalid characters.

**Validates: Requirements 1.6**

**Note:** Corresponds to acceptance criteria 5 in Requirement 1 (should be numbered 1.6 after fixing the duplicate "2").

### Property 5: Folder path validation

*For any* folder path string, the validation should succeed if and only if the path contains only valid characters and follows the expected path format.

**Validates: Requirements 3.2**

### Property 6: Folder name uniqueness validation

*For any* parent directory and any new folder name, when validating a folder rename, the validation should fail if and only if another folder with that name already exists in the parent directory.

**Validates: Requirements 3.2**

### Property 7: Folder rename updates all entries

*For any* folder containing entries, when the folder is renamed, all entries within that folder should have their paths updated to reflect the new folder name.

**Validates: Requirements 3.3**

### Property 8: Folder rename atomicity

*For any* folder rename operation, all file moves should be committed in a single atomic commit.

**Validates: Requirements 3.4**

### Property 9: Recursive path updates

*For any* folder containing subfolders, when the parent folder is renamed, all nested paths in all subfolders should be updated recursively.

**Validates: Requirements 3.5**

### Property 10: Move operation atomicity

*For any* file move operation, the old file deletion and new file creation should occur in a single commit.

**Validates: Requirements 4.1, 4.2**

### Property 11: Move operation failure safety

*For any* move operation that fails, the system should not leave orphaned files or partial changes in the repository.

**Validates: Requirements 4.3**

### Property 12: Batch move atomicity

*For any* set of multiple file moves (such as folder rename), all moves should be committed in a single atomic commit.

**Validates: Requirements 4.4**

### Property 13: Move operation fallback

*For any* backend that does not support native move operations, the system should successfully complete moves using delete-then-create operations.

**Validates: Requirements 4.5**

### Property 14: Validation blocks save

*For any* entry with validation errors, the save operation should be blocked until all errors are resolved.

**Validates: Requirements 6.4**

### Property 15: Error correction clears errors

*For any* validation error, when the user corrects the issue, the error message should be cleared and saving should be allowed.

**Validates: Requirements 6.5**

### Property 16: Workflow creates unpublished entry

*For any* file rename when editorial workflow is enabled, the system should create an unpublished entry with the new path rather than directly modifying the published file.

**Validates: Requirements 7.1**

### Property 17: Workflow publish moves file

*For any* unpublished entry with a path change, when published, the file should be moved to the new location in the main branch.

**Validates: Requirements 7.2**

### Property 18: Workflow delete preserves original

*For any* unpublished entry with a path change, when deleted, the original published entry should remain unchanged at its original path.

**Validates: Requirements 7.3**

### Property 19: Workflow conflict detection

*For any* unpublished entry with a path change that conflicts with an existing file, the system should detect the conflict at publish time and prevent publishing.

**Validates: Requirements 7.5**

### Property 20: i18n file rename consistency

*For any* entry in an i18n collection, when renamed, all locale-specific files should be renamed to maintain the i18n naming convention.

**Validates: Requirements 8.1**

### Property 21: i18n file move consistency

*For any* entry in an i18n collection, when moved, all locale-specific files should be moved to the new location.

**Validates: Requirements 8.2**

### Property 22: i18n folder rename consistency

*For any* folder containing i18n entries, when renamed, all locale files for all entries should have their paths updated.

**Validates: Requirements 8.3**

### Property 23: i18n MULTIPLE_FOLDERS structure preservation

*For any* i18n collection with MULTIPLE_FOLDERS structure, when entries are moved, the locale folder structure should be maintained.

**Validates: Requirements 8.4**

### Property 24: i18n MULTIPLE_FILES naming preservation

*For any* i18n collection with MULTIPLE_FILES structure, when entries are renamed, the locale file naming convention should be maintained.

**Validates: Requirements 8.5**

### Property 25: Legacy path behavior

*For any* collection with meta.path.index_file configured, the system should use the legacy path generation behavior for backward compatibility.

**Validates: Requirements 9.3**

### Property 26: Backend capability detection

*For any* backend that does not support required operations, the system should gracefully disable rename functionality without errors.

**Validates: Requirements 9.4**

## Error Handling

### Validation Errors

1. **Duplicate filename error**: When a user attempts to rename a file to a name that already exists
   - Error message: "A file with this name already exists in this folder"
   - Recovery: User must choose a different filename

2. **Duplicate folder name error**: When a user attempts to rename a folder to a name that already exists
   - Error message: "A folder with this name already exists in this directory"
   - Recovery: User must choose a different folder name

3. **Invalid characters error**: When a filename or folder name contains invalid characters
   - Error message: "Invalid characters in name: [list of characters]"
   - Recovery: User must remove or replace invalid characters

4. **Path too long error**: When the resulting path exceeds system limits
   - Error message: "The path is too long. Please use a shorter name."
   - Recovery: User must shorten the filename or path

### Persistence Errors

1. **Move operation failure**: When the backend fails to move a file
   - Error message: "Failed to move file: [error details]"
   - Recovery: Retry operation or revert to original path
   - Rollback: Ensure no partial changes remain

2. **Conflict at publish time**: When publishing a path change that conflicts with an existing file
   - Error message: "Cannot publish: A file already exists at the target location"
   - Recovery: User must resolve the conflict or choose a different path

### Backend Errors

1. **Unsupported operation**: When the backend doesn't support required operations
   - Error message: None (feature is disabled)
   - Recovery: Feature is gracefully disabled in UI

2. **Permission denied**: When the user lacks permissions to move files
   - Error message: "Permission denied: Cannot move files in this repository"
   - Recovery: User must obtain necessary permissions

3. **Network failure**: When network issues prevent operations
   - Error message: "Network error: Please check your connection and try again"
   - Recovery: Retry operation when connection is restored

## Testing Strategy

### Unit Testing

Unit tests will verify specific behaviors and edge cases:

1. **Path validation tests**
   - Test valid and invalid path formats
   - Test duplicate detection
   - Test character sanitization

2. **UI component tests**
   - Test EntryPathEditor renders correctly
   - Test FolderRenameControl triggers actions
   - Test error message display

3. **Redux action tests**
   - Test updateEntryPath action
   - Test renameFolder action
   - Test validation actions

4. **Backend method tests**
   - Test persistEntry with newPath
   - Test moveFiles operation
   - Test pathExists check

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **fast-check** (JavaScript property-based testing library). Each test will run a minimum of 100 iterations.

1. **Filename validation properties**
   - Generate random filenames and folder structures
   - Verify uniqueness validation works correctly
   - Verify sanitization handles all character types

2. **Move operation properties**
   - Generate random entries and paths
   - Verify atomicity of moves
   - Verify content preservation

3. **Folder rename properties**
   - Generate random folder structures
   - Verify all entries are updated
   - Verify recursive updates work correctly

4. **i18n properties**
   - Generate random i18n entries
   - Verify all locale files are handled correctly
   - Verify structure preservation

5. **Workflow properties**
   - Generate random workflow scenarios
   - Verify unpublished entries are created correctly
   - Verify conflict detection works

### Integration Testing

Integration tests will verify end-to-end workflows:

1. **File rename workflow**
   - Create entry → Edit filename → Save → Verify move

2. **Folder rename workflow**
   - Create folder with entries → Rename folder → Verify all moves

3. **Workflow integration**
   - Enable workflow → Rename file → Publish → Verify move

4. **i18n integration**
   - Create i18n entry → Rename → Verify all locale files moved

### Testing with Different Backends

Tests should run against multiple backend implementations:
- GitHub (REST and GraphQL)
- GitLab
- Bitbucket
- Test backend (for unit tests)

Each backend may have different capabilities, so tests should verify:
- Feature detection works correctly
- Fallback mechanisms work when features are unavailable
- Errors are handled gracefully

## Implementation Notes

### Backward Compatibility

1. **index_file configuration**: When `meta.path.index_file` is configured, the system should continue using the legacy behavior where the filename is fixed to the index file name.

2. **subfolders=true**: When `nested.subfolders` is `true`, rename controls should not be displayed, maintaining current behavior.

3. **Non-nested collections**: Collections without nested configuration should not show rename controls.

### Performance Considerations

1. **Folder rename optimization**: When renaming folders with many entries, batch all operations into a single commit to minimize API calls.

2. **Validation caching**: Cache path existence checks to avoid redundant API calls during validation.

3. **Debounced validation**: Debounce validation checks as the user types to reduce API load.

### Security Considerations

1. **Path traversal prevention**: Validate that paths don't contain `..` or other path traversal attempts.

2. **Permission checks**: Verify user has write permissions before allowing renames.

3. **Sanitization**: Always sanitize user input for filenames and paths to prevent injection attacks.

### Accessibility

1. **Keyboard navigation**: Ensure all rename controls are keyboard accessible.

2. **Screen reader support**: Provide appropriate ARIA labels for rename controls.

3. **Error announcements**: Ensure validation errors are announced to screen readers.

4. **Focus management**: Manage focus appropriately when entering/exiting rename mode.
