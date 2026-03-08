
-- Event Sets table
CREATE TABLE public.event_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Event Set Items (linking sets to inventory items)
CREATE TABLE public.event_set_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  set_id UUID NOT NULL REFERENCES public.event_sets(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES public.inventory_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(set_id, item_id)
);

-- Enable RLS
ALTER TABLE public.event_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_set_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for event_sets
CREATE POLICY "Users can view their own sets" ON public.event_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own sets" ON public.event_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own sets" ON public.event_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own sets" ON public.event_sets FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for event_set_items (via set ownership)
CREATE POLICY "Users can view items in their sets" ON public.event_set_items FOR SELECT USING (EXISTS (SELECT 1 FROM public.event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid()));
CREATE POLICY "Users can add items to their sets" ON public.event_set_items FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid()));
CREATE POLICY "Users can update items in their sets" ON public.event_set_items FOR UPDATE USING (EXISTS (SELECT 1 FROM public.event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid()));
CREATE POLICY "Users can delete items from their sets" ON public.event_set_items FOR DELETE USING (EXISTS (SELECT 1 FROM public.event_sets WHERE event_sets.id = event_set_items.set_id AND event_sets.user_id = auth.uid()));

-- Trigger for updated_at on event_sets
CREATE TRIGGER update_event_sets_updated_at BEFORE UPDATE ON public.event_sets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
