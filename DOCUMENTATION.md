# 3D Room Planner - Complete Documentation

## Overview

The 3D Room Planner is a web-based application that allows users to design and visualize room layouts in 3D space. Users can drag and drop furniture items, view cost estimations, save snapshots of their designs, and manage their saved plans. The application uses A-Frame for 3D rendering, Supabase for backend services (authentication, database, and storage), and vanilla JavaScript for the frontend logic.

## Architecture

### Technology Stack

- **Frontend Framework**: Vanilla JavaScript (ES6+)
- **3D Rendering**: A-Frame 1.5.0
- **Backend**: Supabase (PostgreSQL database, Authentication, Storage)
- **UI Libraries**: HTML2Canvas (for screenshot capture)
- **Styling**: CSS3 with custom components

### Project Structure

```
TEST/
├── index.html              # Welcome/Setup page
├── planner.html            # Main 3D planner interface
├── profile.html            # User profile page
├── admin.html              # Admin dashboard
├── database-setup.sql      # Database schema and setup
├── README-DATABASE-SETUP.md # Database setup instructions
├── css/
│   ├── index.css          # Welcome page styles (modern dark theme)
│   ├── planner.css        # Main planner styles
│   ├── profile.css        # Profile page styles
│   ├── admin.css          # Admin panel styles
│   ├── auth.css           # Authentication modal styles
│   └── dialog.css         # Dialog modal styles (includes welcome dialog)
├── js/
│   ├── index.js           # Welcome page logic
│   ├── planner.js         # Main planner application logic
│   ├── profile.js         # Profile page logic
│   ├── admin.js           # Admin panel logic
│   ├── auth/
│   │   ├── auth.js        # Authentication functions
│   │   └── auth-ui.js     # Authentication UI management
│   ├── components/        # A-Frame custom components
│   │   ├── movement.js    # Camera movement controls
│   │   ├── draggable-furniture.js  # Drag and drop functionality
│   │   ├── clickable-furniture.js  # Furniture selection/interaction
│   │   ├── floor-resize.js         # Dynamic floor resizing
│   │   ├── smart-placement.js      # Collision detection and placement
│   │   ├── position-debug.js       # Debug visualization
│   │   └── profile-menu.js         # Profile dropdown menu
│   └── utils/
│       ├── supabase.js    # Supabase client initialization
│       ├── snapshot.js    # Screenshot capture and local storage
│       ├── migrate-data.js # Data migration utilities
│       ├── debug.js       # Debug utilities
│       ├── dialog.js      # Dialog utility (alert, confirm, prompt)
│       ├── workspace-state.js # Workspace state management
│       └── cost-estimation.js # Cost estimation utilities
└── models/                # 3D model files (OBJ format)
    ├── table1.obj
    ├── wardrobe1.obj
    ├── wardrobe2.obj
    └── wardrobe3.obj
```

## Core Modules

### 1. Authentication Module (`js/auth/`)

#### `auth.js`

Handles all authentication operations with Supabase:

- **`signUp(email, password, role)`**: Creates a new user account
- **`signIn(email, password)`**: Authenticates existing user
- **`signOut()`**: Signs out the current user
- **`getCurrentUser()`**: Retrieves the currently authenticated user
- **`checkAuth()`**: Checks if a user is currently authenticated
- **`isAdmin()`**: Verifies if the current user has admin privileges
- **`getUserProfile()`**: Fetches user profile data from the database

#### `auth-ui.js`

Manages the authentication UI and state:

- **`showAuthModal(callback)`**: Displays the authentication modal
- **`hideAuthModal()`**: Hides the authentication modal
- **`switchAuthMode()`**: Toggles between sign-in and sign-up modes
- **`handleAuthSubmit()`**: Processes authentication form submission
- **`updateAuthUI()`**: Updates UI elements based on authentication state

### 2. Welcome Page Module (`js/index.js`)

Handles the initial setup page where users enter room dimensions:

- **`startPlanner()`**: Validates and stores room dimensions (width, length, height) to localStorage, then redirects to planner
- **Input validation**: Ensures all three dimensions are between 1M and 20M
- **Keyboard navigation**: Supports Enter key to start planner and Tab navigation between inputs

### 3. Main Planner Module (`js/planner.js`)

The core application logic for the 3D room planner:

#### Key Functions:

- **`loadItemsAndPrices()`**: Fetches furniture items and prices from Supabase
- **`calculateEstimatedPrice(prices)`**: Calculates average price from multiple store prices
- **`getModelUrl(modelKey)`**: Resolves model file URLs (Supabase Storage or local)
- **`getItemName(modelKey)`**: Gets display name for furniture items
- **`initializeRoom()`**: Sets up the 3D room with dimensions from localStorage (width, length, height)
- **`createRoomWalls(width, length, height)`**: Dynamically creates room walls with specified height
- **`showWelcomeDialog()`**: Displays welcome dialog with instructions (one-time only, tracked via localStorage)
- **`handleDragStart(e)`**: Initiates drag operation from furniture library
- **`handleDrop(e)`**: Handles furniture placement in the 3D scene
- **`renderCost()`**: Updates cost estimation display
- **`toggleCostPanel()`**: Shows/hides the cost panel
- **`deleteFurniture()`**: Removes furniture from the scene
- **`rotateFurnitureLeft()` / `rotateFurnitureRight()`**: Rotates selected furniture
- **`saveWorkspaceState()`**: Saves current room state to localStorage
- **`restoreRoom(roomData)`**: Restores room from saved state
- **`restoreWorkspaceState()`**: Legacy function to restore workspace state

#### Data Structures:

- **`ITEMS_DATA`**: Map of model_key → item data
- **`PRICE_LIST`**: Map of model_key → estimated price
- **`ITEM_METADATA`**: Map of model_key → metadata (name, model_file_path)
- **`costState`**: Object tracking furniture costs and totals
- **`furnitureCounter`**: Counter for unique furniture IDs

### 4. A-Frame Components (`js/components/`)

#### `movement.js`

Custom camera movement component for first-person navigation:

- **WASD controls**: Move forward/backward/left/right
- **Q/E keys**: Move up/down
- **Mouse**: Look around
- **Configurable speed**: Adjustable movement speed

#### `draggable-furniture.js`

Enables dragging furniture within the 3D scene:

- **Drag detection**: Raycasting to detect drag interactions
- **Wall collision**: Prevents furniture from passing through walls
- **Visual feedback**: Color changes during drag (green = valid, red = invalid)
- **Boundary checking**: Ensures furniture stays within room bounds
- **Default color**: Orange (#FF8C00) for furniture objects

#### `clickable-furniture.js`

Handles furniture selection and interaction:

- **Click detection**: Selects furniture on click
- **Visual feedback**: Green highlight for selected items
- **Control panel**: Shows/hides furniture control panel
- **Deselection**: Click outside to deselect

#### `floor-resize.js`

Dynamically resizes the floor plane based on room dimensions:

- **Auto-resize**: Updates floor size when room dimensions change
- **Material properties**: Non-reflective brown material (#8B4513)

#### `smart-placement.js`

Intelligent furniture placement with collision detection:

- **Position adjustment**: Automatically adjusts furniture position
- **Collision detection**: Prevents overlapping furniture
- **Visual feedback**: Orange highlight during adjustment

#### `profile-menu.js`

Manages the profile circle and dropdown menu:

- **`updateProfileMenu(isAuthenticated, user)`**: Updates profile UI
- **`toggleProfileMenu()`**: Shows/hides dropdown menu
- **`getInitials(email)`**: Extracts user initials from email
- **Admin link visibility**: Shows admin dashboard link for admin users

### 5. Utility Modules (`js/utils/`)

#### `supabase.js`

Initializes and exports the Supabase client:

- **Configuration**: Sets up Supabase connection with project URL and anon key
- **Client export**: Provides `supabase` object for use throughout the application

#### `snapshot.js`

Handles screenshot capture and local storage:

- **`capturePlannerScreenshot()`**: Uses html2canvas to capture the 3D scene
- **`downloadDataUrl(dataUrl, filename)`**: Downloads screenshot as PNG file
- **`handleSnapshotClick()`**: Main handler for snapshot button
- **`collectRoomPlanData()`**: Gathers room and furniture data for saving
- **`addLocalRoomPlan(plan)`**: Saves plan to localStorage
- **`getLocalRoomPlans()`**: Retrieves all saved plans from localStorage
- **`deleteLocalRoomPlan(planId)`**: Removes a plan from localStorage
- **`slugifyFileName(name)`**: Converts plan name to safe filename

#### `migrate-data.js`

Data migration utilities (for admin use):

- **`runMigration()`**: Migrates data between database structures

#### `debug.js`

Debug utilities for development:

- **Debug logging**: Enhanced console logging
- **Visual debugging**: Position and collision visualization

#### `dialog.js`

Dialog utility for replacing browser alerts, confirms, and prompts:

- **`showDialog(message, title)`**: Shows a simple dialog with OK button
- **`showConfirm(message, title)`**: Shows confirmation dialog with Yes/No buttons
- **`showPrompt(message, defaultValue, title)`**: Shows input dialog with OK/Cancel buttons
- **Welcome dialog support**: Custom styling for welcome dialog with dark theme

#### `workspace-state.js`

Workspace state management utilities:

- **`goBackToPlanner()`**: Navigates back to planner while preserving workspace state
- Saves state before navigation to ensure items persist

#### `cost-estimation.js`

Cost estimation management:

- **`getSavedCostEstimations()`**: Retrieves saved cost estimations from localStorage
- **`saveCostEstimation(name)`**: Saves current cost estimation with a name
- **`deleteCostEstimation(id)`**: Deletes a saved cost estimation

### 6. Profile Module (`js/profile.js`)

Manages the user profile page:

- **`loadProfileData()`**: Loads user profile and saved plans
- **`renderPlans(plans)`**: Displays saved room plans
- **`deletePlan(planId)`**: Deletes a saved plan
- **`handleLogout()`**: Signs out the user

### 7. Admin Module (`js/admin.js`)

Admin panel for managing furniture items and prices:

- **`initAdmin()`**: Initializes admin panel (checks admin privileges)
- **`loadAllItems()`**: Loads all items and prices from database
- **`renderItems()`**: Displays items in the admin interface
- **`addNewItem()`**: Creates a new furniture item
- **`addPriceToItem()`**: Adds a price entry for an item
- **`updateItemPrice(itemId, priceId, newPrice)`**: Updates an existing price
- **`deleteItemPrice(itemId, priceId)`**: Deletes a price entry
- **`deleteItem(itemId)`**: Deletes an item and all its prices

## Database Schema

### Tables

#### `users`

Extends Supabase auth.users with additional profile data:

- `id` (UUID, PK, FK → auth.users)
- `email` (TEXT)
- `role` (TEXT, default: 'user')
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `items`

Stores furniture item catalog:

- `id` (UUID, PK)
- `model_key` (TEXT, UNIQUE) - Identifier for the 3D model
- `name` (TEXT) - Display name
- `category` (TEXT) - Item category (Tables, Bedroom, etc.)
- `model_file_path` (TEXT) - Path to OBJ file
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

#### `item_prices`

Stores prices from different stores:

- `id` (UUID, PK)
- `item_id` (UUID, FK → items)
- `store_name` (TEXT)
- `price` (NUMERIC(10,2))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)
- UNIQUE constraint on (item_id, store_name)

#### `room_plans`

Stores user's saved room plans (currently using localStorage instead):

- `id` (UUID, PK)
- `user_id` (UUID, FK → users)
- `name` (TEXT)
- `room_width` (NUMERIC(5,2))
- `room_length` (NUMERIC(5,2))
- `room_height` (NUMERIC(5,2)) - Room height dimension
- `furniture_data` (JSONB) - Array of furniture objects
- `cost_total` (NUMERIC(10,2))
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

### Row Level Security (RLS)

- **Users**: Can read/update their own profile
- **Items**: Public read, admin-only write
- **Item Prices**: Public read, admin-only write
- **Room Plans**: Users can only access their own plans

## Storage

### Supabase Storage Bucket: `wardrobe-models`

Stores 3D model files (OBJ format):

- `wardrobe_modern.obj`
- `wardrobe_traditional.obj`
- `wardrobe_openframe.obj`

Bucket is set to **Public** for direct access.

## User Flow

### 1. Initial Setup (`index.html`)

- **Modern Dark Theme Interface**:
  - Dark background (#0a0a0a) with subtle grid pattern
  - 3D wireframe cube visualization (isometric projection, animated)
  - Clean, minimalist design inspired by Next.js aesthetic
- **Room Dimension Input**:
  - User enters three dimensions: Width (W), Height (H), and Length (L)
  - Inputs positioned around the 3D cube visualization
  - Real-time validation (1-20M per dimension)
  - Keyboard navigation support (Tab, Enter)
- **Validation & Navigation**:
  - Validates all three dimensions are provided and within range
  - Stores dimensions in localStorage (roomWidth, roomLength, roomHeight)
  - Redirects to planner page on successful validation

### 2. Main Planner (`planner.html`)

- **Welcome Dialog (First Visit Only)**:

  - Automatically displays on first visit after entering dimensions
  - Shows room dimensions and comprehensive instructions
  - Includes controls, furniture, and cost board information
  - One-time display (tracked via localStorage `welcomeDialogShown`)
  - Can be closed via button, backdrop click, or Escape key
  - Users can hover over the "?" button anytime to see instructions again

- **Unauthenticated users**:

  - Can view and use the planner
  - See floating snapshot button (requires sign-in)
  - Cannot save plans

- **Authenticated users**:

  - Profile circle visible (top-right)
  - Cost panel visible (below profile)
  - Can save snapshots (downloads PNG + saves to localStorage)
  - Access to profile page

- **Admin users**:
  - All user features
  - Access to admin dashboard
  - Can manage items and prices

### 3. Profile Page (`profile.html`)

- Displays user information
- Shows saved room plans with:
  - Plan name and creation date
  - Total estimated cost
  - Room dimensions (width × length × height)
  - Furniture count
  - Snapshot filename
- Can delete plans
- Back button preserves workspace state when returning to planner

### 4. Admin Panel (`admin.html`)

- Dark theme matching the application aesthetic
- Next.js-style card-based UI

- Add new furniture items
- Add prices to items
- View and manage all items and prices
- Update or delete prices

## Key Features

### 3D Scene Management

- Dynamic room creation based on user input (width, length, height)
- Room walls created with specified height (defaults to 3M if not provided)
- Real-time furniture placement
- Collision detection
- Wall boundary enforcement
- Furniture rotation
- Cost calculation
- Workspace state persistence (auto-saves on page unload and visibility change)

### Cost Estimation

- Real-time cost calculation as furniture is added
- Displays item quantities and unit costs
- Shows total project cost
- Collapsible cost panel (shows icon when collapsed)

### Snapshot System

- Captures screenshot of entire 3D scene
- Downloads as PNG file
- Saves plan metadata to localStorage
- Includes room dimensions, furniture data, and total cost

### Welcome Dialog System

- One-time welcome dialog on first visit to planner
- Displays room dimensions and comprehensive instructions
- Dark theme matching the application aesthetic
- Instructions include:
  - Movement controls (W/A/S/D, Q/E, Mouse)
  - Furniture interaction (drag, click, panel)
  - Cost board information
  - Tip about hovering over "?" button for instructions
- Tracked via localStorage to prevent repeated displays
- Users can access instructions anytime via hover on "?" button

### Authentication

- Email/password authentication via Supabase
- Automatic profile creation on signup
- Role-based access control (user/admin)
- Session persistence

## Styling

### Color Scheme

- **Index Page**: Dark theme (#0a0a0a) with subtle grid pattern, white text
- **3D Scene**: Black (#000000) background
- **Floor**: Brown (#8B4513)
- **Furniture**: Orange (#FF8C00) by default, Green (#4CAF50) when selected, Red (#FF6B6B) when near walls
- **UI Panels**: Dark theme (rgba(15, 15, 15, 0.96))
- **Profile Circle**: Dark gradient (#343434 to #181818)
- **Welcome Dialog**: Dark theme matching planner interface

### Typography

- **Font Family**: System fonts (-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif)
- Consistent across all pages (admin, profile, planner, index)
- Modern, clean typography with proper letter-spacing

### Index Page Design

- **3D Wireframe Cube**:
  - Isometric projection with 6 faces
  - Animated floating effect
  - White wireframe borders with varying opacity
  - Responsive sizing (180px on desktop, scales down on mobile)
- **Input Layout**:
  - Dimension inputs (W, H, L) positioned around the cube
  - Modern underline-style inputs
  - Labels in uppercase bold font
  - Proper spacing to prevent overlap
- **Responsive Design**:
  - Adapts to different screen sizes
  - Mobile-friendly with adjusted cube and input sizes
  - Maintains square aspect ratio for room visualization container

## Configuration

### Supabase Configuration

Set in `js/utils/supabase.js`:

- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_ANON_KEY`: Your Supabase anon/public key

### Model Files

- Local models: `models/` directory
- Supabase Storage: `wardrobe-models` bucket
- Model mapping defined in `STORAGE_MODEL_FILES` constant in `planner.js`

## Development Notes

### Adding New Furniture Items

1. Add item to database via admin panel or SQL
2. Upload OBJ file to Supabase Storage (if needed)
3. Update `STORAGE_MODEL_FILES` in `planner.js` if using storage
4. Add item to furniture library in `planner.html`

### Customizing Colors

- Floor color: `planner.html` line 380
- Furniture default color: `js/components/draggable-furniture.js` line 19
- UI theme colors: CSS files

### Debugging

- Enable debug mode in `js/utils/debug.js`
- Use browser console for detailed logging
- Position debug component available for furniture placement issues

## Browser Compatibility

- Modern browsers with WebGL support
- Chrome, Firefox, Safari, Edge (latest versions)
- Mobile browsers may have limited functionality

## Recent Updates

### Version Updates

#### Latest Features (2025)

1. **Redesigned Welcome Page**:

   - Modern dark theme with Next.js-inspired aesthetic
   - 3D wireframe cube visualization
   - Added Height (H) dimension input alongside Width and Length
   - Improved responsive design for all screen sizes
   - Better input positioning and spacing

2. **Welcome Dialog System**:

   - One-time welcome dialog on first visit to planner
   - Comprehensive instructions display
   - Dark theme matching application aesthetic
   - Persistent instruction access via "?" button hover

3. **Enhanced Room Dimensions**:

   - Full 3D room support (width × length × height)
   - Room walls created with specified height
   - Height stored in localStorage and used throughout application

4. **Improved User Experience**:
   - Better validation messages
   - Keyboard navigation support
   - Workspace state persistence improvements
   - Enhanced responsive design

## Future Enhancements

- Load saved plans from database (currently using localStorage)
- More furniture categories and items
- Furniture color customization
- Export plans as JSON
- Share plans with other users
- Advanced lighting and shadows
- VR mode support
- Room height visualization in 3D scene
