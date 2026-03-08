
-- Add fields to event_sets
ALTER TABLE public.event_sets 
  ADD COLUMN IF NOT EXISTS event_date_start date,
  ADD COLUMN IF NOT EXISTS event_date_end date,
  ADD COLUMN IF NOT EXISTS is_favorite boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS notes text;

-- Add image_url to inventory_items
ALTER TABLE public.inventory_items
  ADD COLUMN IF NOT EXISTS image_url text;

-- Create storage bucket for item images
INSERT INTO storage.buckets (id, name, public)
VALUES ('item-images', 'item-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload their own item images
CREATE POLICY "Users can upload item images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update their item images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete their item images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'item-images' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Item images are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'item-images');
