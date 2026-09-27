ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 5;
UPDATE public.quotes SET tax_rate = 0 WHERE subtotal > 0 AND tax = 0;

CREATE OR REPLACE FUNCTION public.recalc_quote_totals(_quote_id uuid)
RETURNS void LANGUAGE plpgsql SET search_path = public AS $$
DECLARE _sub numeric; _rate numeric;
BEGIN
  SELECT coalesce(sum(amount),0) INTO _sub FROM quote_items WHERE quote_id = _quote_id;
  SELECT tax_rate INTO _rate FROM quotes WHERE id = _quote_id;
  UPDATE quotes SET subtotal = _sub,
    tax = round(_sub * coalesce(_rate,5) / 100),
    total = _sub + round(_sub * coalesce(_rate,5) / 100)
  WHERE id = _quote_id;
END $$;

CREATE OR REPLACE FUNCTION public.trg_quote_items_recalc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP IN ('UPDATE','DELETE') THEN PERFORM recalc_quote_totals(OLD.quote_id); END IF;
  IF TG_OP IN ('INSERT','UPDATE') THEN PERFORM recalc_quote_totals(NEW.quote_id); END IF;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS quote_items_recalc ON public.quote_items;
CREATE TRIGGER quote_items_recalc AFTER INSERT OR UPDATE OR DELETE ON public.quote_items
FOR EACH ROW EXECUTE FUNCTION public.trg_quote_items_recalc();

CREATE OR REPLACE FUNCTION public.trg_quote_taxrate_recalc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.tax := round(NEW.subtotal * NEW.tax_rate / 100);
  NEW.total := NEW.subtotal + NEW.tax;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS quotes_taxrate_recalc ON public.quotes;
CREATE TRIGGER quotes_taxrate_recalc BEFORE UPDATE OF tax_rate ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.trg_quote_taxrate_recalc();