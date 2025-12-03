# Nested Collection Changes

## Summary
Updated nested collections to remove the requirement for `index.md` files and enable dynamic filename generation based on entry titles.

## Changes Made

### 1. Folder Names as Tree Titles
**File**: `packages/decap-cms-core/src/components/Collection/NestedCollection.js`
- Modified `getNodeTitle()` to use folder names directly instead of looking for index file titles
- Simplified logic to always return `node.title`

### 2. Dynamic Filename Generation
**File**: `packages/decap-cms-core/src/reducers/entryDraft.js`
- Added `cleanTitleForFilename()` function to sanitize titles for use as filenames
- Updated `selectCustomPath()` to:
  - Support backward compatibility with `index_file` configuration
  - Generate dynamic filenames from entry titles for new entries
  - Preserve existing filenames when moving entries between folders
  - Only generate new filenames for new entries (when `newRecord` is true)

### 3. Optional index_file Configuration
**Files**: 
- `packages/decap-cms-core/src/types/redux.ts`
- `packages/decap-cms-core/index.d.ts`
- `packages/decap-cms-core/src/constants/configSchema.js`

Made `index_file` optional in the `meta.path` configuration:
```typescript
meta?: { path?: { label: string; widget: string; index_file?: string } }
```

### 4. Updated Tests
**File**: `packages/decap-cms-core/src/constants/__tests__/configSchema.spec.js`
- Updated tests to verify both configurations work:
  - With `index_file` (backward compatibility)
  - Without `index_file` (new behavior)

### 5. Updated Example Configs
**Files**:
- `dev-test/config.yml`
- `dev-test/backends/test/config.yml`

Removed `index_file` from example nested collection configurations.

## Behavior

### Old Behavior (with index_file)
```yaml
meta: { path: { widget: string, label: 'Path', index_file: 'index' } }
```
- Required `index.md` in each folder
- All files named `index.md`
- Folder title came from index file's title field

### New Behavior (without index_file)
```yaml
meta: { path: { widget: string, label: 'Path' } }
```
- No index file required
- Folder names used as tree node titles
- New files get dynamic names based on cleaned title (e.g., "My Article" → `my-article.md`)
- Files created in subfolders based on UI context (current filter path)
- When moving existing files between folders, the filename is preserved

## Backward Compatibility
The changes maintain full backward compatibility. Collections with `index_file` configured will continue to work as before.

## File Moving Fix
Fixed a critical bug where updating the path field on an existing entry would move **all files in the source directory** to the destination directory instead of just the specific entry being edited.

### Root Cause
Multiple backend implementations (GitHub, GitLab, Azure, Bitbucket, and local server) had logic that would:
1. Detect a file move operation
2. List **all files** in the source directory
3. Move **all of them** to the destination directory

This was likely intended for some legacy use case but caused unintended bulk moves.

### Files Fixed
- `packages/decap-cms-backend-github/src/API.ts` - Simplified `updateTree()` to only move the specific file
- `packages/decap-cms-backend-gitlab/src/API.ts` - Removed "move children" logic from `getCommitItems()`
- `packages/decap-cms-backend-azure/src/API.ts` - Removed "move children" logic from `getCommitItems()`
- `packages/decap-cms-backend-bitbucket/src/API.ts` - Simplified move logic to only move the specific file
- `packages/decap-server/src/middlewares/utils/fs.ts` - Removed "move children" logic from `move()` function
- `packages/decap-cms-core/src/reducers/entryDraft.js` - Ensured existing entries preserve their filename when moved

### The Fix Ensures
- New entries get filenames generated from their title
- Existing entries preserve their current filename when moved to a different folder
- **Only the specific file being edited is moved**, not all files in the source directory
- All backend implementations now have consistent, safe move behavior
