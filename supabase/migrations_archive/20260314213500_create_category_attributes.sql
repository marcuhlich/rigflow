-- Create category_attributes table to store which metadata fields are enabled per category
CREATE TABLE public.category_attributes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL,
  attribute_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, attribute_key)
);

-- Enable RLS
ALTER TABLE public.category_attributes ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own category attributes" ON public.category_attributes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own category attributes" ON public.category_attributes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own category attributes" ON public.category_attributes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own category attributes" ON public.category_attributes
  FOR DELETE USING (auth.uid() = user_id);

-- Update trigger (if function exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'update_updated_at_column' AND routine_schema = 'public'
  ) THEN
    CREATE TRIGGER update_category_attributes_updated_at
      BEFORE UPDATE ON public.category_attributes
      FOR EACH ROW
      EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Function to initialize default attributes for new categories
CREATE OR REPLACE FUNCTION public.init_category_default_attributes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Insert default enabled attributes for all categories
  INSERT INTO public.category_attributes (user_id, category_id, attribute_key, enabled)
  VALUES
    (NEW.user_id, NEW.name, 'weight_kg', true),
    (NEW.user_id, NEW.name, 'units_per_case', true),
    (NEW.user_id, NEW.name, 'dimensions_cm', true),
    (NEW.user_id, NEW.name, 'unit_price', true),
    (NEW.user_id, NEW.name, 'image_url', true),
    (NEW.user_id, NEW.name, 'attributes', true),
    (NEW.user_id, NEW.name, 'tags', true)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger for new categories (only if user_categories table exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_categories' AND table_schema = 'public'
  ) THEN
    CREATE TRIGGER init_category_attributes
      AFTER INSERT ON public.user_categories
      FOR EACH ROW
      EXECUTE FUNCTION public.init_category_default_attributes();
      
    -- Initialize attributes for existing categories
    INSERT INTO public.category_attributes (user_id, category_id, attribute_key, enabled)
    SELECT user_id, name, attr.key, true
    FROM public.user_categories
    CROSS JOIN (
      VALUES
        ('weight_kg'),
        ('units_per_case'),
        ('dimensions_cm'),
        ('unit_price'),
        ('image_url'),
        ('attributes'),
        ('tags')
    ) AS attr(key)
    ON CONFLICT (user_id, category_id, attribute_key) DO NOTHING;
  END IF;
END $$;
