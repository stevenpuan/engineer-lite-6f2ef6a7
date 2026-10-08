CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  builtin_key text,
  name text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT expense_categories_builtin_or_name CHECK ((builtin_key IS NOT NULL AND name IS NULL) OR (builtin_key IS NULL AND name IS NOT NULL))
);
CREATE UNIQUE INDEX expense_categories_tenant_builtin ON public.expense_categories (tenant_id, builtin_key) WHERE builtin_key IS NOT NULL;
CREATE UNIQUE INDEX expense_categories_tenant_name ON public.expense_categories (tenant_id, name) WHERE name IS NOT NULL;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.expense_categories TO authenticated;
GRANT ALL ON public.expense_categories TO service_role;
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Tenant members can manage expense categories" ON public.expense_categories FOR ALL TO authenticated USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id());
CREATE TRIGGER expense_categories_fill_tenant BEFORE INSERT ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION fill_tenant_id();
CREATE TRIGGER update_expense_categories_updated_at BEFORE UPDATE ON public.expense_categories FOR EACH ROW EXECUTE FUNCTION update_updated_at();