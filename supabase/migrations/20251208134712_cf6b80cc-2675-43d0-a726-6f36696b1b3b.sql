-- Enable realtime for checklists table
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklists;

-- Enable realtime for checklist_items table  
ALTER PUBLICATION supabase_realtime ADD TABLE public.checklist_items;