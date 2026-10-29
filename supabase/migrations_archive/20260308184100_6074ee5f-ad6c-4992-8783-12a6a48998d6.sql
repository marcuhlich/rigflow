
-- Lending history table
CREATE TABLE public.lending_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id uuid REFERENCES public.inventory_items(id) ON DELETE CASCADE NOT NULL,
  item_name text NOT NULL,
  lent_to text NOT NULL,
  lent_at date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  returned_at date,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lending_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own lending history" ON public.lending_history
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own lending history" ON public.lending_history
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own lending history" ON public.lending_history
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own lending history" ON public.lending_history
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
