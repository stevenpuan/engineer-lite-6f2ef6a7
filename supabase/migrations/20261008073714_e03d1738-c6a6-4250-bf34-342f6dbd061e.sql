alter table public.quotes add column if not exists mgmt_rate numeric not null default 0,
  add column if not exists mgmt_fee numeric not null default 0;

create or replace function public.trg_quote_taxrate_recalc()
returns trigger language plpgsql set search_path to 'public' as $$
begin
  NEW.mgmt_fee := round(NEW.subtotal * coalesce(NEW.mgmt_rate,0) / 100);
  NEW.tax := round((NEW.subtotal + NEW.mgmt_fee) * NEW.tax_rate / 100);
  NEW.total := NEW.subtotal + NEW.mgmt_fee + NEW.tax;
  return NEW;
end $$;

drop trigger if exists quotes_taxrate_recalc on public.quotes;
create trigger quotes_taxrate_recalc before insert or update of subtotal, tax, total, tax_rate, mgmt_rate, mgmt_fee
  on public.quotes for each row execute function public.trg_quote_taxrate_recalc();

create or replace function public.recalc_quote_totals(_quote_id uuid)
returns void language plpgsql set search_path to 'public' as $$
begin
  update quotes set subtotal = (select coalesce(sum(amount),0) from quote_items where quote_id = _quote_id)
  where id = _quote_id;
end $$;