<!-- 990a901d-0ec0-4d26-938f-4c6d80de115f 661c7fad-824c-485f-b399-4e6015011e46 -->
# Add Browser Close Confirmation and Enable New Furniture Items

## Overview

1. Add confirmation dialog when user clicks browser close button
2. Enable new furniture items with subcategories: mirrors, beds, shelves, chairs, desks

## Implementation Details

### 1. Browser Close Confirmation (`js/planner.js`)

- Modify existing `beforeunload` event listener (line ~1543) to show browser confirmation dialog
- Return a string message to trigger browser's native confirmation dialog
- Keep existing auto-save functionality

### 2. Add New Furniture Items Configuration (`js/planner.js`)

- Add new model files to `STORAGE_BUCKET_FILES` Set:
- mirror1.obj, mirror2.obj
- bed1.obj, bed2.obj
- shelf1.obj, shelf2.obj
- chair1.obj, chair2.obj
- desk1.obj, desk2.obj
- Add entries to `STORAGE_MODEL_FILES` object mapping model_key to filename
- Add fallback names to `FALLBACK_ITEM_NAMES` for each new item

### 3. Update Furniture Library UI (`planner.html`)

- Enable existing disabled items and convert to subcategory buttons:
- Bed: Change from disabled to enabled subcategory button (data-category="bed")
- Chair: Change from disabled to enabled subcategory button (data-category="chair")
- Desk: Change from disabled to enabled subcategory button (data-category="desk")
- Add new category sections:
- Mirror category with subcategory button
- Shelf category with subcategory button
- Each subcategory button should call appropriate function (showBedSubcategory, showChairSubcategory, etc.)

### 4. Create Subcategory Functions (`js/planner.js`)

- Create functions following existing pattern (like `showWardrobeSubcategory`):
- `showMirrorSubcategory()` - displays mirror1, mirror2
- `showBedSubcategory()` - displays bed1, bed2
- `showShelfSubcategory()` - displays shelf1, shelf2
- `showChairSubcategory()` - displays chair1, chair2
- `showDeskSubcategory()` - displays desk1, desk2
- Each function should:
- Get item names from metadata using `getItemName()`
- Create subcategory panel with Back button
- Display draggable items with proper data-model attributes
- Call `initializeDragAndDrop()` and `updateSubcategoryUI()`

### 5. Update Subcategory UI Helper (`js/planner.js`)

- Update `updateSubcategoryUI()` function to include selectors for new items:
- `[data-model^="mirror"]`
- `[data-model^="bed"]`
- `[data-model^="shelf"]`
- `[data-model^="chair"]`
- `[data-model^="desk"]`

### 6. Wall-Mounted Fixture Behavior (`js/components/wall-mounted-furniture.js`)

- Create new A-Frame component `wall-mounted-furniture` for mirrors and shelves
- Component should:
- Detect which wall the item is closest to (north, south, east, west)
- Constrain movement to only along that wall (1D movement parallel to wall)
- Keep item at fixed distance from wall (snap to wall surface)
- Auto-rotate item to face away from wall (perpendicular to wall)
- Prevent movement away from walls (only allow sliding along wall)
- Similar schema to `draggable-furniture` but with wall constraint logic
- Use raycasting to detect wall proximity and calculate constrained position

### 7. Apply Wall-Mounted Component to Mirrors and Shelves (`js/planner.js`)

- When creating furniture entities for mirror1, mirror2, shelf1, shelf2:
- Use `wall-mounted-furniture` component instead of `draggable-furniture`
- Set appropriate initial position near a wall
- Ensure proper component attributes are set

### 8. Add Skeleton Loader Effect for Placeholder Box (`js/planner.js`)

- Replace static placeholder box with animated skeleton loader
- Create helper function `createSkeletonLoader()` to generate animated placeholder
- Skeleton loader should have:
- Pulsing/shimmer animation effect (opacity or color animation)
- Visual indication that model is loading
- Same dimensions as current placeholder (1.5 x 0.8 x 1.5)
- Smooth fade-out when model loads
- Update both `handleDrop()` and `restoreRoom()` functions to use skeleton loader
- Animation options:
- Pulsing opacity (0.4 to 0.8)
- Shimmer effect (gradient animation)
- Breathing effect (scale animation)
- Or combination of effects

## Files to Modify

- `js/planner.js` - Add confirmation, model file mappings, subcategory functions, apply wall-mounted component, add skeleton loader function and update placeholder creation
- `planner.html` - Update furniture library UI to enable new items with subcategories
- `js/components/wall-mounted-furniture.js` - NEW FILE: Create wall-mounted fixture component

## Notes

- Prices and source stores are already in Supabase (per user)
- Items will be loaded from database via existing `loadItemsAndPrices()` function
- Model files are in Supabase bucket and will be loaded via `getModelUrl()` function
- Follow existing patterns for wardrobe and center table subcategories
- Mirrors and shelves are fixtures, not furniture - they should stick to walls and only move along them
- Skeleton loader provides better UX by clearly indicating loading state

### To-dos

- [ ] Modify beforeunload event listener in planner.js to show browser confirmation dialog when user tries to close browser
- [ ] Add new model files (mirror1/2, bed1/2, shelf1/2, chair1/2, desk1/2) to STORAGE_BUCKET_FILES, STORAGE_MODEL_FILES, and FALLBACK_ITEM_NAMES in planner.js
- [ ] Update planner.html to enable bed, chair, desk items and add mirror and shelf categories with subcategory buttons
- [ ] Create subcategory functions (showMirrorSubcategory, showBedSubcategory, showShelfSubcategory, showChairSubcategory, showDeskSubcategory) in planner.js
- [ ] Update updateSubcategoryUI() function to include selectors for new furniture items