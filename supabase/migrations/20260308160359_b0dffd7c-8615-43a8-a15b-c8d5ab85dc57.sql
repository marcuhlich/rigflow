
-- Table for per-instance DMX configurations
CREATE TABLE public.dmx_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id uuid NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  instance_number integer NOT NULL,
  dmx_start_address integer NOT NULL CHECK (dmx_start_address >= 1 AND dmx_start_address <= 512),
  dmx_universe integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (item_id, instance_number)
);

-- RLS
ALTER TABLE public.dmx_instances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dmx instances"
  ON public.dmx_instances FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = dmx_instances.item_id
      AND inventory_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can create dmx instances for their items"
  ON public.dmx_instances FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = dmx_instances.item_id
      AND inventory_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can update their own dmx instances"
  ON public.dmx_instances FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = dmx_instances.item_id
      AND inventory_items.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete their own dmx instances"
  ON public.dmx_instances FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.inventory_items
    WHERE inventory_items.id = dmx_instances.item_id
      AND inventory_items.user_id = auth.uid()
  ));
