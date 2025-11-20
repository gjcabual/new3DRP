<!-- 84ebea08-e206-49d2-adab-f39afaa1305d cb02fbd3-2f7e-443e-b34f-62f8040eadfa -->
# Fix Grid Background and Preserve Items on Navigation

## 1. Fix Grid Background Display

**Files to modify:**

- `planner.html` - Update sky and grid floor setup
- `js/planner.js` - Fix createInfiniteGrid function

**Changes:**

- Change sky color to match grid background or remove it
- Fix grid floor material application (may need different approach)
- Ensure grid pattern is visible and renders correctly
- Use A-Frame's built-in grid component or fix SVG texture approach

## 2. Fix Floor Glitching Issue

**Files to modify:**

- `planner.html` - Adjust grid floor position and properties
- `js/planner.js` - Update grid floor creation

**Changes:**

- Fix z-fighting between grid floor and room floor
- Adjust grid floor position to be below room floor (negative Y or lower)
- Ensure grid floor doesn't interfere with room floor rendering
- May need to disable grid floor inside room boundaries or adjust rendering order

## 3. Preserve Items on Navigation from Profile/Admin

**Files to modify:**

- `profile.html` - Update back button to preserve workspace state
- `admin.html` - Update back button to preserve workspace state
- `js/planner.js` - Ensure restoreWorkspaceState is called on page load

**Changes:**

- The back buttons already link to planner.html, which should restore state
- Verify that restoreWorkspaceState is being called properly on page load
- Ensure workspace state is saved before navigation
- May need to add explicit state save before navigation if not already happening

## 4. Update Profile and Admin Pages Theme

**Files to modify:**

- `css/profile.css` - Update to dark theme matching planner
- `css/admin.css` - Update to dark theme with Next.js-style UI
- `profile.html` - May need minor HTML adjustments
- `admin.html` - May need minor HTML adjustments

**Changes:**

- Change profile page background to dark theme (`#1a1a1a` or similar)
- Update all cards, buttons, and text to match dark theme
- For admin page, implement Next.js-style UI:
- Clean, modern card-based layout
- Subtle borders and shadows
- Better spacing and typography
- Dark theme with proper contrast
- Modern form inputs and buttons
- Card-based sections with hover effects

## 5. Fix Sources Button Not Working

**Files to modify:**

- `js/planner.js` - Fix sources button click handler
- `css/planner.css` - Verify sources list styling

**Changes:**

- Check the click event listener for `.cost-source-toggle` buttons
- Ensure the sources list is properly positioned and visible
- Fix any issues with event delegation or button selection
- Verify the sources list markup is correctly generated in `renderCost()`

### To-dos

- [ ] Redesign side panels to match dark system theme
- [ ] Move cost panel below profile to fix overlap
- [ ] Ensure workspace state persists on browser refresh
- [ ] Check furniture positions after dimension change and turn red if outside
- [ ] Add infinite gridlines floor background instead of black sky