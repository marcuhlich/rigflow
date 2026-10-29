-- Create checklists table
CREATE TABLE public.checklists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  event_name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('pre-event', 'post-event', 'general')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create checklist_items table
CREATE TABLE public.checklist_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'skipped')),
  notes TEXT,
  item_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for checklists
CREATE POLICY "Users can view their own checklists" 
ON public.checklists FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own checklists" 
ON public.checklists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checklists" 
ON public.checklists FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own checklists" 
ON public.checklists FOR DELETE 
USING (auth.uid() = user_id);

-- RLS policies for checklist_items (via checklist ownership)
CREATE POLICY "Users can view items of their checklists" 
ON public.checklist_items FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.checklists 
  WHERE checklists.id = checklist_items.checklist_id 
  AND checklists.user_id = auth.uid()
));

CREATE POLICY "Users can create items in their checklists" 
ON public.checklist_items FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.checklists 
  WHERE checklists.id = checklist_items.checklist_id 
  AND checklists.user_id = auth.uid()
));

CREATE POLICY "Users can update items in their checklists" 
ON public.checklist_items FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.checklists 
  WHERE checklists.id = checklist_items.checklist_id 
  AND checklists.user_id = auth.uid()
));

CREATE POLICY "Users can delete items from their checklists" 
ON public.checklist_items FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.checklists 
  WHERE checklists.id = checklist_items.checklist_id 
  AND checklists.user_id = auth.uid()
));

-- Update triggers
CREATE TRIGGER update_checklists_updated_at
BEFORE UPDATE ON public.checklists
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_checklist_items_updated_at
BEFORE UPDATE ON public.checklist_items
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();