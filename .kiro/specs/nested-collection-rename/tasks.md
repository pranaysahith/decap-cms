# Implementation Plan

- [x] 1. Extend backend interfaces and data models
  - Add `newPath` field to DataFile interface ✓
  - Add `moveFiles` method to backend implementation interface ✓
  - Add `pathExists` method to backend implementation interface ✓
  - Update TypeScript type definitions ✓
  - _Requirements: 4.1, 4.2, 4.4_

- [ ]* 1.1 Write property test for DataFile interface
  - **Property 1: Filename uniqueness validation**
  - **Validates: Requirements 1.2**

- [x] 2. Implement backend move operations
  - [x] 2.1 Implement moveFiles in GitHub backend ✓
    - Support both REST and GraphQL APIs ✓
    - Implement atomic commit for multiple file moves ✓
    - Handle file deletion and creation in single commit ✓
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 2.2 Write property test for move atomicity
    - **Property 10: Move operation atomicity**
    - **Validates: Requirements 4.1, 4.2**

  - [ ]* 2.3 Write property test for batch move atomicity
    - **Property 12: Batch move atomicity**
    - **Validates: Requirements 4.4**

  - [x] 2.4 Implement pathExists in GitHub backend ✓
    - Check if file exists at given path ✓
    - Handle API errors gracefully ✓
    - _Requirements: 1.2, 3.2**

  - [x] 2.5 Implement moveFiles and pathExists in other backends ✓
    - GitLab backend ✓
    - Bitbucket backend ✓
    - Azure backend ✓
    - Gitea backend ✓
    - _Requirements: 4.1, 4.2, 4.4_

  - [ ]* 2.6 Write property test for move operation fallback
    - **Property 13: Move operation fallback**
    - **Validates: Requirements 4.5**

  - [ ]* 2.7 Write property test for move failure safety
    - **Property 11: Move operation failure safety**
    - **Validates: Requirements 4.3**

- [x] 3. Update core backend persistEntry method
  - [x] 3.1 Modify persistEntry to handle newPath in DataFile ✓
    - Detect when newPath differs from path ✓
    - Update slug generation for moved files ✓
    - Pass newPath to implementation ✓
    - _Requirements: 1.3, 2.3, 4.1_

  - [ ]* 3.2 Write property test for file rename atomicity
    - **Property 2: File rename atomicity**
    - **Validates: Requirements 1.4**

  - [ ]* 3.3 Write property test for file move atomicity
    - **Property 6: Folder name uniqueness validation**
    - **Validates: Requirements 2.3**

  - [x] 3.4 Update i18n file handling for moves ✓
    - Modify getI18nFiles to support newPath for all locale files ✓
    - Ensure all locale files are moved together ✓
    - _Requirements: 8.1, 8.2_

  - [ ]* 3.5 Write property test for i18n file rename consistency
    - **Property 20: i18n file rename consistency**
    - **Validates: Requirements 8.1**

  - [ ]* 3.6 Write property test for i18n file move consistency
    - **Property 21: i18n file move consistency**
    - **Validates: Requirements 8.2**

  - [x] 3.7 Update media file path handling ✓
    - Update updateAssetProxies to handle path changes ✓
    - Move media files when entry path changes (if collection-specific) ✓
    - Update media file references in entry data ✓
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

  - [ ]* 3.8 Write property test for relative media path updates
    - **Property 16: Relative media path updates (Note: Property number mismatch in design doc)**
    - **Validates: Requirements 5.1**

  - [ ]* 3.9 Write property test for collection media folder moves
    - **Property 17: Collection media folder moves (Note: Property number mismatch in design doc)**
    - **Validates: Requirements 5.2**

  - [ ]* 3.10 Write property test for global media folder preservation
    - **Property 18: Global media folder preservation (Note: Property number mismatch in design doc)**
    - **Validates: Requirements 5.3**

- [x] 4. Update selectCustomPath to support filename changes ✓
  - Modified to allow custom filename (not just folder path) ✓
  - Preserve existing behavior for index_file configuration ✓
  - Generate filename from title for new entries ✓
  - Preserve current filename for existing entries ✓
  - _Requirements: 1.1, 2.1, 9.3_

- [x] 5. Checkpoint - Ensure all backend tests pass





  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Extend entry draft reducer








  - [x] 6.1 Add originalPath tracking to entry draft state



    - Store original path when entry is loaded
    - Use for detecting path changes
    - _Requirements: 1.3, 2.3_

  - [x] 6.2 Add pathValidation state to entry draft




    - Track validation status
    - Store validation errors
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [ ]* 6.3 Write property test for slug updates with filename
    - **Property 3: Slug updates with filename**
    - **Validates: Requirements 1.5**

  - [ ]* 6.4 Write property test for meta path updates
    - **Property 7: Folder rename updates all entries (Note: Property number mismatch in design doc)**
    - **Validates: Requirements 2.4**

- [x] 7. Create Redux actions for path management






  - [x] 7.1 Implement updateEntryPath action


    - Update entry draft with new path and filename
    - Trigger validation
    - Mark entry as changed
    - _Requirements: 1.1, 2.1_

  - [x] 7.2 Implement validateEntryPath action

    - Check path uniqueness using backend pathExists
    - Validate path format
    - Sanitize filename
    - Update pathValidation state
    - _Requirements: 1.2, 2.2, 6.1, 6.2, 6.3_

  - [ ]* 7.3 Write property test for filename uniqueness validation
    - **Property 1: Filename uniqueness validation**
    - **Validates: Requirements 1.3**

  - [ ]* 7.4 Write property test for folder path validation
    - **Property 5: Folder path validation (Note: No such property in design doc)**
    - **Validates: Requirements 2.2**

  - [ ]* 7.5 Write property test for filename sanitization
    - **Property 4: Filename sanitization**
    - **Validates: Requirements 1.6**

  - [x] 7.6 Implement renameFolder action


    - Get all entries in folder
    - Update paths for all entries
    - Batch persist all changes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [ ]* 7.7 Write property test for folder name uniqueness validation
    - **Property 6: Folder name uniqueness validation**
    - **Validates: Requirements 3.2**

  - [ ]* 7.8 Write property test for folder rename updates all entries
    - **Property 7: Folder rename updates all entries**
    - **Validates: Requirements 3.3**

  - [ ]* 7.9 Write property test for folder rename atomicity
    - **Property 8: Folder rename atomicity**
    - **Validates: Requirements 3.4**

  - [ ]* 7.10 Write property test for recursive path updates
    - **Property 9: Recursive path updates**
    - **Validates: Requirements 3.5**

- [x] 8. Create EntryPathEditor UI component






  - [x] 8.1 Create component structure


    - Build form with path and filename inputs
    - Add validation error display
    - Add URL/404 warning banner
    - Style according to design system
    - _Requirements: 1.1, 1.2, 2.1_

  - [x] 8.2 Implement real-time validation


    - Debounce validation calls
    - Display validation errors inline
    - Disable save when errors present
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [ ]* 8.3 Write property test for validation blocks save
    - **Property 14: Validation blocks save**
    - **Validates: Requirements 6.4**

  - [ ]* 8.4 Write property test for error correction clears errors
    - **Property 15: Error correction clears errors**
    - **Validates: Requirements 6.5**

  - [x] 8.5 Integrate with entry editor




    - Add component to entry editor when conditions met
    - Only show for nested collections with subfolders=false
    - Hide when index_file is configured
    - _Requirements: 1.1, 2.1, 9.1, 9.2, 9.3_

  - [ ]* 8.6 Add accessibility features
    - Keyboard navigation support
    - ARIA labels for screen readers
    - Focus management
    - _Requirements: 1.1, 2.1_

- [x] 9. Create FolderRenameControl UI component





  - [x] 9.1 Create component structure


    - Build context menu or inline control
    - Add rename input field
    - Add URL/404 warning with affected entry count
    - Style according to design system
    - _Requirements: 3.1_

  - [x] 9.2 Implement rename workflow


    - Enter rename mode on trigger
    - Validate new folder name
    - Dispatch renameFolder action
    - Show progress indicator
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 9.3 Integrate with NestedCollection tree navigation


    - Add rename control to tree nodes
    - Only show for nested collections with subfolders=false
    - Handle folder selection and editing
    - _Requirements: 3.1, 9.1, 9.2_

  - [x] 9.4 Add accessibility features


    - Keyboard navigation support
    - ARIA labels for screen readers
    - Focus management
    - _Requirements: 3.1_

- [x] 10. Checkpoint - Ensure all UI tests pass






  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Implement editorial workflow support




  - [x] 11.1 Update unpublished entry handling for path changes


    - Store both old and new paths in unpublished entry
    - Display both paths in UI
    - _Requirements: 7.1, 7.4_

  - [ ]* 11.2 Write property test for workflow creates unpublished entry
    - **Property 16: Workflow creates unpublished entry**
    - **Validates: Requirements 7.1**

  - [x] 11.3 Implement publish-time path change


    - Move file to new location when publishing
    - Validate no conflicts exist
    - _Requirements: 7.2, 7.5_

  - [ ]* 11.4 Write property test for workflow publish moves file
    - **Property 17: Workflow publish moves file**
    - **Validates: Requirements 7.2**

  - [ ]* 11.5 Write property test for workflow conflict detection
    - **Property 19: Workflow conflict detection**
    - **Validates: Requirements 7.5**




  - [x] 11.6 Implement unpublished entry deletion
    - Discard path changes without affecting published entry
    - Clean up unpublished entry data
    - _Requirements: 7.3_

  - [ ]* 11.7 Write property test for workflow delete preserves original
    - **Property 18: Workflow delete preserves original**
    - **Validates: Requirements 7.3**

- [-] 12. Implement i18n-specific handling
  - [ ] 12.1 Update i18n folder rename logic
    - Handle MULTIPLE_FOLDERS structure
    - Handle MULTIPLE_FILES structure
    - Update all locale files for all entries
    - _Requirements: 8.3, 8.4, 8.5_

  - [ ]* 12.2 Write property test for i18n folder rename consistency
    - **Property 22: i18n folder rename consistency**
    - **Validates: Requirements 8.3**

  - [ ]* 12.3 Write property test for i18n MULTIPLE_FOLDERS structure preservation
    - **Property 23: i18n MULTIPLE_FOLDERS structure preservation**
    - **Validates: Requirements 8.4**

  - [ ]* 12.4 Write property test for i18n MULTIPLE_FILES naming preservation
    - **Property 24: i18n MULTIPLE_FILES naming preservation**
    - **Validates: Requirements 8.5**

- [ ] 13. Implement feature detection and backward compatibility
  - [ ] 13.1 Add backend capability detection
    - Check if backend supports moveFiles
    - Check if backend supports pathExists
    - Gracefully disable features when not supported
    - _Requirements: 9.4, 9.5_

  - [ ]* 13.2 Write property test for backend capability detection
    - **Property 26: Backend capability detection**
    - **Validates: Requirements 9.4**

  - [ ] 13.3 Add configuration checks
    - Check for subfolders=false
    - Check for nested configuration
    - Check for index_file configuration
    - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 13.4 Write property test for legacy path behavior
    - **Property 25: Legacy path behavior**
    - **Validates: Requirements 9.3**

  - [ ] 13.5 Update UI to respect feature flags
    - Hide rename controls when feature is disabled
    - Show appropriate messaging when unavailable
    - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 14. Add error handling and recovery
  - [ ] 14.1 Implement validation error handling
    - Display clear error messages
    - Provide recovery suggestions
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 14.2 Implement persistence error handling
    - Handle move operation failures
    - Implement rollback on failure
    - Display error messages with retry options
    - _Requirements: 4.3_

  - [ ] 14.3 Implement conflict detection
    - Detect conflicts at save time
    - Detect conflicts at publish time (workflow)
    - Provide conflict resolution UI
    - _Requirements: 1.3, 3.2, 7.5_

- [ ] 15. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
