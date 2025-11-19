# Database Setup Instructions

## Step 1: Create Tables in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor** in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of `database-setup.sql`
5. Click **Run** to execute the script

This will create:

- `users` table (extends auth.users)
- `items` table (stores furniture items)
- `item_prices` table (stores prices from different stores)
- `room_plans` table (stores user's saved room plans)
- All necessary indexes, RLS policies, and triggers

## Step 2: Set Up Storage Bucket

1. Go to **Storage** in the Supabase dashboard
2. Create a new bucket named `wardrobe-models`
3. Set the bucket to **Public**
4. Upload your 3 OBJ files:
   - `wardrobe_modern.obj`
   - `wardrobe_traditional.obj`
   - `wardrobe_openframe.obj`

## Step 3: Run Migration Script

1. Open your application in a browser
2. Sign up or sign in
3. Open browser console (F12)
4. Run: `runMigration()`
5. Note: You need to be marked as admin first (see Step 4)

## Step 4: Mark a User as Admin

1. Go to **Table Editor** in Supabase dashboard
2. Select the `users` table
3. Find your user record
4. Edit the `role` field and change it from `user` to `admin`
5. Save

## Step 5: Verify Setup

- Try accessing the admin panel at `admin.html`
- You should see the wardrobe prices
- Try saving a snapshot in the planner
- Verify items and prices are loaded correctly

## Step 6: Seed Item & Price Data (Copy/Paste)

Paste the snippet below into the Supabase SQL Editor after Step 1 to preload furniture items and their prices. Update the `model_file_path` values only if your storage filenames differ.

```sql
-- Seed Items
INSERT INTO public.items (model_key, name, category, model_file_path) VALUES
  ('table1', 'Center Table', 'tables', 'table1.obj'),
  ('wardrobe1', 'Wardrobe Modern', 'wardrobe', 'wardrobe_modern.obj'),
  ('wardrobe2', 'Wardrobe Traditional', 'wardrobe', 'wardrobe_traditional.obj'),
  ('wardrobe3', 'Wardrobe Open Frame', 'wardrobe', 'wardrobe_openframe.obj')
ON CONFLICT (model_key) DO NOTHING;

-- Seed Price References
INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 8450 FROM public.items WHERE model_key = 'table1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 8725 FROM public.items WHERE model_key = 'table1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 11950 FROM public.items WHERE model_key = 'wardrobe1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 12200 FROM public.items WHERE model_key = 'wardrobe1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 14900 FROM public.items WHERE model_key = 'wardrobe2'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 15250 FROM public.items WHERE model_key = 'wardrobe2'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 17850 FROM public.items WHERE model_key = 'wardrobe3'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 18100 FROM public.items WHERE model_key = 'wardrobe3'
ON CONFLICT (item_id, store_name) DO NOTHING;
```

## Troubleshooting

### If migration script fails:

- Make sure you're signed in
- Check that you have admin role in the users table
- Check browser console for error messages

### If prices don't load:

- Verify the migration script ran successfully
- Check the `items` and `item_prices` tables in Supabase
- Check browser console for fetch errors

### If 3D models don't load:

- Verify the storage bucket is public
- Check that files are uploaded correctly
- Verify file names match exactly (case-sensitive)
