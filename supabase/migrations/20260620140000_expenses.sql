-- Business expenses (admin only)

CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (
    category IN ('purchase', 'miscellaneous', 'transport', 'others')
  ),
  description text NOT NULL,
  amount_inr integer NOT NULL CHECK (amount_inr > 0),
  expense_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON public.expenses(expense_date DESC);
CREATE INDEX idx_expenses_category ON public.expenses(category);

ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin all expenses" ON public.expenses
  FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
