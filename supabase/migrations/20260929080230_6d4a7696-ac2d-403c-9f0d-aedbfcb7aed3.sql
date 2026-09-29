create or replace function public.purge_line_data()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from line_events where created_at < now() - interval '90 days';
  delete from line_pending where expires_at < now();
  update line_bindings set bind_code = null, code_expires_at = null
   where code_expires_at is not null and code_expires_at < now() - interval '1 day';
end;
$$;

create or replace function public.purge_old_logs()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.activity_logs where created_at < now() - interval '90 days';
  perform public.purge_line_data();
end;
$$;

revoke all on function public.purge_old_logs() from public, anon, authenticated;

select cron.schedule('purge-old-logs', '0 19 * * *', $$ select public.purge_old_logs(); $$);