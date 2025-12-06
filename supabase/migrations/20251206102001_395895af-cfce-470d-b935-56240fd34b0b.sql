-- Add new category "Effektgeräte"
ALTER TYPE item_category ADD VALUE IF NOT EXISTS 'Effektgeräte';

-- Add new columns to inventory_items
ALTER TABLE public.inventory_items
ADD COLUMN IF NOT EXISTS lent_to TEXT,
ADD COLUMN IF NOT EXISTS lent_until DATE,
ADD COLUMN IF NOT EXISTS accessories TEXT,
ADD COLUMN IF NOT EXISTS dmx_start_address INTEGER,
ADD COLUMN IF NOT EXISTS dmx_channels INTEGER,
ADD COLUMN IF NOT EXISTS dmx_universe INTEGER,
ADD COLUMN IF NOT EXISTS unit_price DECIMAL(10, 2);