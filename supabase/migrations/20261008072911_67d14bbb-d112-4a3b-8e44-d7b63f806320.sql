alter table public.tenants add column if not exists max_users integer;

create or replace function public._team_guard(_uid uuid)
returns uuid language plpgsql stable security definer set search_path to 'public' as $$
declare _t uuid;
begin
  if not is_tenant_owner() then raise exception 'Not authorized'; end if;
  _t := current_tenant_id();
  if _uid is not null then
    if _uid = auth.uid() then raise exception 'cannot_change_self'; end if;
    if not exists (select 1 from profiles where user_id = _uid and tenant_id = _t) then raise exception 'Not authorized'; end if;
  end if;
  return _t;
end $$;

create or replace function public._team_check_limit(_t uuid)
returns void language plpgsql stable security definer set search_path to 'public' as $$
declare _max int; _n int;
begin
  select max_users into _max from tenants where id = _t;
  if _max is null then return; end if;
  select count(*) into _n from profiles where tenant_id = _t and is_active;
  if _n >= _max then raise exception 'user_limit_reached:%', _max; end if;
end $$;

create or replace function public.rpc_team_info()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare _t uuid := _team_guard(null);
begin
  return jsonb_build_object(
    'max_users', (select max_users from tenants where id = _t),
    'active_count', (select count(*) from profiles where tenant_id = _t and is_active),
    'users', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', p.user_id, 'email', coalesce(p.email, u.email), 'display_name', p.display_name,
        'role', p.role, 'is_active', p.is_active, 'created_at', p.created_at, 'is_me', p.user_id = auth.uid()
      ) order by p.created_at)
      from profiles p join auth.users u on u.id = p.user_id where p.tenant_id = _t), '[]'::jsonb));
end $$;

create or replace function public.rpc_team_create_user(_email text, _password text, _display_name text default null, _role text default 'assistant')
returns uuid language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare _t uuid := _team_guard(null); _uid uuid := gen_random_uuid(); _e text := lower(trim(_email));
begin
  if _role not in ('owner','assistant') then raise exception 'bad_role'; end if;
  if length(coalesce(_password,'')) < 8 then raise exception 'password_too_short'; end if;
  if exists (select 1 from auth.users where lower(email) = _e) then raise exception 'email_exists'; end if;
  perform _team_check_limit(_t);
  insert into auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, aud, role,
    raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token, email_change,
    email_change_token_new, email_change_token_current, phone_change, phone_change_token, reauthentication_token, created_at, updated_at)
  values (_uid, '00000000-0000-0000-0000-000000000000', _e, crypt(_password, gen_salt('bf')), now(), 'authenticated', 'authenticated',
    jsonb_build_object('provider','email','providers',array['email']),
    jsonb_build_object('display_name', coalesce(nullif(trim(_display_name),''), _e)),
    '', '', '', '', '', '', '', '', now(), now());
  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (_uid, _uid, _e, jsonb_build_object('sub', _uid::text, 'email', _e, 'email_verified', true), 'email', now(), now(), now());
  insert into profiles (user_id, tenant_id, display_name, email, role)
  values (_uid, _t, coalesce(nullif(trim(_display_name),''), _e), _e, _role);
  return _uid;
end $$;

create or replace function public.rpc_team_set_active(_user_id uuid, _active boolean)
returns void language plpgsql security definer set search_path to 'public' as $$
declare _t uuid := _team_guard(_user_id);
begin
  if _active and not (select is_active from profiles where user_id = _user_id) then perform _team_check_limit(_t); end if;
  update profiles set is_active = _active, updated_at = now() where user_id = _user_id and tenant_id = _t;
end $$;

create or replace function public.rpc_team_set_role(_user_id uuid, _role text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare _t uuid := _team_guard(_user_id);
begin
  if _role not in ('owner','assistant') then raise exception 'bad_role'; end if;
  update profiles set role = _role, updated_at = now() where user_id = _user_id and tenant_id = _t;
end $$;

create or replace function public.rpc_team_reset_password(_user_id uuid, _password text)
returns void language plpgsql security definer set search_path to 'public', 'extensions' as $$
declare _t uuid := _team_guard(_user_id);
begin
  if length(coalesce(_password,'')) < 8 then raise exception 'password_too_short'; end if;
  update auth.users set encrypted_password = crypt(_password, gen_salt('bf')), updated_at = now() where id = _user_id;
end $$;

create or replace function public.pa_set_max_users(_tenant_id uuid, _max integer)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  if not is_platform_admin() then raise exception 'Not authorized'; end if;
  update tenants set max_users = case when _max is null or _max <= 0 then null else _max end, updated_at = now() where id = _tenant_id;
end $$;

revoke all on function public._team_guard(uuid), public._team_check_limit(uuid) from public, anon, authenticated;
revoke all on function public.rpc_team_info(), public.rpc_team_create_user(text,text,text,text), public.rpc_team_set_active(uuid,boolean),
  public.rpc_team_set_role(uuid,text), public.rpc_team_reset_password(uuid,text), public.pa_set_max_users(uuid,integer) from public, anon;
grant execute on function public.rpc_team_info(), public.rpc_team_create_user(text,text,text,text), public.rpc_team_set_active(uuid,boolean),
  public.rpc_team_set_role(uuid,text), public.rpc_team_reset_password(uuid,text), public.pa_set_max_users(uuid,integer) to authenticated;