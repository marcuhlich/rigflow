
-- 1. Create user_categories table
CREATE TABLE public.user_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  is_dmx_capable boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

-- 2. Enable RLS
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

-- 3. RLS policies
CREATE POLICY "Users can view their own categories" ON public.user_categories
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories" ON public.user_categories
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories" ON public.user_categories
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories" ON public.user_categories
  FOR DELETE USING (auth.uid() = user_id);

-- 4. Seed default categories for all existing users
INSERT INTO public.user_categories (user_id, name, is_dmx_capable, sort_order)
SELECT u.id, cat.name, cat.is_dmx, cat.sort_order
FROM auth.users u
CROSS JOIN (VALUES
  ('Kabel', false, 0),
  ('Lautsprecher', false, 1),
  ('Lichttechnik', true, 2),
  ('Mikrofone', false, 3),
  ('Zubehör', false, 4),
  ('Effektgeräte', true, 5)
) AS cat(name, is_dmx, sort_order)
ON CONFLICT (user_id, name) DO NOTHING;

-- 5. Change inventory_items.category from enum to text
ALTER TABLE public.inventory_items
  ALTER COLUMN category TYPE text USING category::text;

-- 6. Create function to seed default categories for new users
CREATE OR REPLACE FUNCTION public.seed_default_categories()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_categories (user_id, name, is_dmx_capable, sort_order) VALUES
    (NEW.id, 'Kabel', false, 0),
    (NEW.id, 'Lautsprecher', false, 1),
    (NEW.id, 'Lichttechnik', true, 2),
    (NEW.id, 'Mikrofone', false, 3),
    (NEW.id, 'Zubehör', false, 4),
    (NEW.id, 'Effektgeräte', true, 5);
  RETURN NEW;
END;
$$;

-- 7. Create trigger for new user signups
CREATE TRIGGER on_auth_user_created_seed_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.seed_default_categories();
