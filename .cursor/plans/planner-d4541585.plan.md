<!-- d4541585-7125-4dc3-9578-99800436b127 b195ba2b-22c2-4c3b-9137-53d966bef7bc -->
# Cost Panel Updates & In-Wall Board Removal

1. Remove In-Wall Cost Board

- Remove the entire `#cost-board` entity from `planner.html` (the white plane with estimated prices inside the 3D scene)
- Remove or disable `renderPriceBoard()` function calls in `js/planner.js` since the board no longer exists
- Clean up any related positioning code that references the cost board

2. Cost Panel Icon-Only Collapse

- Update `css/planner.css` so when `#cost-panel.collapsed`, it shrinks to show only the header/icon (similar to instructions panel behavior)
- Modify the collapse animation to transform the panel to a minimal width showing just the 💰 icon
- Ensure the toggle button still works and the panel can expand back to full size
- Update `toggleCostPanel()` in `js/planner.js` if needed to handle the new collapse state

3. Fix Wardrobe Model File References

- Update the wardrobe model file mappings in `js/planner.js` to match the actual bucket filenames:
- wardrobe1 → `wardrobe_modern.obj`
- wardrobe2 → `wardrobe_traditional.obj` (fix any incorrect reference)
- wardrobe3 → `wardrobe_openframe.obj`
- Ensure `getModelUrl()` correctly resolves wardrobe2 to the `wardrobe_traditional.obj` file from the `wardrobe-models` bucket

### To-dos

- [ ] Remove in-wall cost board from HTML and JS
- [ ] Update cost panel to collapse to icon-only state