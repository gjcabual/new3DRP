-- Database Setup Script for 3D Room Planner
-- Run this in Supabase SQL Editor

-- 1. Create users table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create items table
CREATE TABLE IF NOT EXISTS public.items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT,
  model_file_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create item_prices table
CREATE TABLE IF NOT EXISTS public.item_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  price NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(item_id, store_name)
);

-- 4. Create room_plans table
CREATE TABLE IF NOT EXISTS public.room_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name TEXT,
  room_width NUMERIC(5, 2) NOT NULL,
  room_length NUMERIC(5, 2) NOT NULL,
  furniture_data JSONB DEFAULT '[]'::jsonb,
  cost_total NUMERIC(10, 2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_item_prices_item_id ON public.item_prices(item_id);
CREATE INDEX IF NOT EXISTS idx_room_plans_user_id ON public.room_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);

-- 6. Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_plans ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies for users table
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 8. RLS Policies for items table
-- Everyone can read items (public read)
CREATE POLICY "Items are publicly readable"
  ON public.items FOR SELECT
  USING (true);

-- Only admins can insert/update/delete items
CREATE POLICY "Only admins can manage items"
  ON public.items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 9. RLS Policies for item_prices table
-- Everyone can read prices (public read)
CREATE POLICY "Prices are publicly readable"
  ON public.item_prices FOR SELECT
  USING (true);

-- Only admins can insert/update/delete prices
CREATE POLICY "Only admins can manage prices"
  ON public.item_prices FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid() AND users.role = 'admin'
    )
  );

-- 10. RLS Policies for room_plans table
-- Users can read their own room plans
CREATE POLICY "Users can read own room plans"
  ON public.room_plans FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own room plans
CREATE POLICY "Users can create own room plans"
  ON public.room_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own room plans
CREATE POLICY "Users can update own room plans"
  ON public.room_plans FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own room plans
CREATE POLICY "Users can delete own room plans"
  ON public.room_plans FOR DELETE
  USING (auth.uid() = user_id);

-- 11. Create function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 12. Create trigger to run function on new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 14. Create triggers for updated_at
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_items_updated_at
  BEFORE UPDATE ON public.items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_item_prices_updated_at
  BEFORE UPDATE ON public.item_prices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_room_plans_updated_at
  BEFORE UPDATE ON public.room_plans
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 15. Sample data for testing (optional)
-- Item catalog entries
INSERT INTO public.items (model_key, name, category, model_file_path)
VALUES
  ('table1', 'Center Table', 'tables', 'table1.obj'),
  ('wardrobe1', 'Wardrobe Modern', 'wardrobe', 'wardrobe_modern.obj'),
  ('wardrobe2', 'Wardrobe Traditional', 'wardrobe', 'wardrobe_traditional.obj'),
  ('wardrobe3', 'Wardrobe Open Frame', 'wardrobe', 'wardrobe_openframe.obj')
ON CONFLICT (model_key) DO NOTHING;

-- Price references for each item
INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 8450
FROM public.items
WHERE model_key = 'table1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 8725
FROM public.items
WHERE model_key = 'table1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 11950
FROM public.items
WHERE model_key = 'wardrobe1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 12200
FROM public.items
WHERE model_key = 'wardrobe1'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 14900
FROM public.items
WHERE model_key = 'wardrobe2'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 15250
FROM public.items
WHERE model_key = 'wardrobe2'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Alpha', 17850
FROM public.items
WHERE model_key = 'wardrobe3'
ON CONFLICT (item_id, store_name) DO NOTHING;

INSERT INTO public.item_prices (item_id, store_name, price)
SELECT id, 'Store Beta', 18100
FROM public.items
WHERE model_key = 'wardrobe3'
ON CONFLICT (item_id, store_name) DO NOTHING;

