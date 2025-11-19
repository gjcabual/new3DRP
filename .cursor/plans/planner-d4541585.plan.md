<!-- d4541585-7125-4dc3-9578-99800436b127 83612866-4feb-4a49-883e-bc087b7d1c29 -->
# Snapshot Capture & Center Table Subcategory

1. Snapshot Capture Fix
   - Review `js/utils/snapshot.js` to confirm which DOM node is passed to `html2canvas`
   - Update the capture target to include the `<a-scene>` canvas (use `scene.renderer.domElement` or `scene.canvas`) so the workspace renders in the snapshot
   - Ensure UI elements are hidden/restored as before; verify the downloaded image shows the room and furniture

2. Center Table Subcategory
   - In `planner.html`, change the Tables section root item so clicking on “Center Table” opens a new sub-panel (similar to the existing wardrobe subcategory)
   - Add markup for the new subcategory with two draggable items: Center Table 1 & Center Table 2
   - Update `js/planner.js` with metadata keys (`centerTable1`, `centerTable2`) and register Supabase storage filenames (`center_table1.obj`, `center_table2.obj`) in `STORAGE_MODEL_FILES`
   - Extend item loading / drag handling to allow these new model keys; ensure they appear in the cost estimator and render properly
   - Replicate the Wardrobe UI toggle logic (show/hide subcategories, back button if needed)

3. Testing & Docs
   - Verify snapshot button captures the room
   - Drag both center tables into the room to confirm models load from Supabase storage
   - Update any relevant documentation or comments if necessary

### To-dos

- [ ] Remove in-wall cost board from HTML and JS
- [ ] Update cost panel to collapse to icon-only state
- [ ] Fix wardrobe2 model file reference to match bucket filename