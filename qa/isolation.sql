-- 店鋪隔離／權限測試（全部在交易內，最後 rollback，不留任何資料）
begin;
create temp table r(k text, v text) on commit drop;
create temp table fx(k text primary key, id uuid) on commit drop;
grant all on r, fx to authenticated;

-- ── 測試資料（postgres 身分建立）──
do $$
declare
  A uuid := '807eea2b-124a-4956-a82f-dc41bb381f79';
  B uuid := 'b86fc4d2-5baa-4398-a8e9-fe57f0d7ce8c';
  bo uuid := gen_random_uuid(); ba uuid := gen_random_uuid();
  c uuid; p uuid; q uuid; qi uuid; rv uuid; rc uuid; e uuid; pa uuid; pm uuid; s uuid; pl uuid; pb uuid; al uuid;
  ap uuid; ast uuid;
begin
  insert into auth.users(id, instance_id, aud, role, email) values
    (bo, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qa-b-owner@qa.invalid'),
    (ba, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'qa-b-asst@qa.invalid');
  insert into profiles(user_id, tenant_id, display_name, email, role, is_active) values
    (bo, B, 'QA B 老闆', 'qa-b-owner@qa.invalid', 'owner', true),
    (ba, B, 'QA B 助理', 'qa-b-asst@qa.invalid', 'assistant', true);
  insert into clients(tenant_id, name) values (B, 'QA-B 客戶') returning id into c;
  insert into projects(tenant_id, client_id, name, status, contract_amount) values (B, c, 'QA-B 案件', '進行中', 999999) returning id into p;
  insert into quotes(tenant_id, project_id, title) values (B, p, 'QA-B 報價') returning id into q;
  insert into quote_items(quote_id, description, quantity, unit_price) values (q, 'QA-B 品項', 1, 100) returning id into qi;
  insert into receivables(tenant_id, project_id, label, amount) values (B, p, 'QA-B 期款', 5000) returning id into rv;
  insert into receipts(receivable_id, amount) values (rv, 1000) returning id into rc;
  insert into expenses(tenant_id, project_id, description, amount) values (B, p, 'QA-B 支出', 300) returning id into e;
  insert into payables(tenant_id, project_id, vendor_name, amount) values (B, p, 'QA-B 廠商', 2000) returning id into pa;
  insert into payments(payable_id, amount) values (pa, 500) returning id into pm;
  insert into project_stages(tenant_id, project_id, name) values (B, p, 'QA-B 階段') returning id into s;
  insert into progress_logs(tenant_id, project_id, stage_id, percent) values (B, p, s, 50) returning id into pl;
  insert into price_book(tenant_id, name, unit_price) values (B, 'QA-B 單價', 123) returning id into pb;
  insert into activity_logs(tenant_id, action) values (B, 'qa') returning id into al;
  select id into ap from projects where tenant_id = A order by created_at limit 1;
  select id into ast from project_stages where tenant_id = A limit 1;
  insert into fx values ('A',A),('B',B),('bo',bo),('ba',ba),('ao','290f381d-6675-490e-a430-3a91022d0a02'),
    ('client',c),('project',p),('quote',q),('quote_item',qi),('receivable',rv),('receipt',rc),('expense',e),
    ('payable',pa),('payment',pm),('stage',s),('progress_log',pl),('price_book',pb),('activity_log',al),
    ('a_project',ap),('a_stage',ast);
end $$;

set local role authenticated;

-- ── 以 A 店老闆身分攻擊 B 店 ──
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='ao'),'role','authenticated')::text, true);

do $$
declare
  B uuid := (select id from fx where k='B');
  t text; n int;
  tabs text[] := array['clients','projects','quotes','quote_items','receivables','receipts','expenses','payables','payments',
                       'project_stages','progress_logs','price_book','activity_logs'];
  keys text[] := array['client','project','quote','quote_item','receivable','receipt','expense','payable','payment',
                       'stage','progress_log','price_book','activity_log'];
begin
  for i in 1..array_length(tabs,1) loop
    t := tabs[i];
    execute format('select count(*) from %I where id = $1', t) into n using (select id from fx where k=keys[i]);
    insert into r values ('A讀B_'||t, n::text);
    execute format('with u as (update %I set id = id where id = $1 returning 1) select count(*) from u', t) into n using (select id from fx where k=keys[i]);
    insert into r values ('A改B_'||t, n::text);
    execute format('with u as (delete from %I where id = $1 returning 1) select count(*) from u', t) into n using (select id from fx where k=keys[i]);
    insert into r values ('A刪B_'||t, n::text);
  end loop;
  select count(*) into n from tenants where id = B;                 insert into r values ('A讀B_tenants', n::text);
  select count(*) into n from tenant_modules where tenant_id = B;   insert into r values ('A讀B_tenant_modules', n::text);
  select count(*) into n from profiles where tenant_id = B;         insert into r values ('A讀B_profiles', n::text);
  select count(*) into n from v_project_finance_summary where project_id = (select id from fx where k='project'); insert into r values ('A讀B_v_finance', n::text);
  select count(*) into n from v_project_progress where project_id = (select id from fx where k='project');        insert into r values ('A讀B_v_progress', n::text);
  select count(*) into n from jsonb_array_elements(coalesce(rpc_dashboard_month()->'margins','[]')) m where m->>'project_id' = (select id from fx where k='project')::text;
  insert into r values ('A月帳含B毛利', n::text);
end $$;

-- 寫入別家店（每一項都應該被擋）
do $$
declare B uuid := (select id from fx where k='B'); bp uuid := (select id from fx where k='project');
begin
  begin insert into clients(tenant_id,name) values (B,'x'); insert into r values ('A寫B_clients','ALLOWED'); exception when others then insert into r values ('A寫B_clients','blocked '||sqlstate); end;
  begin insert into projects(tenant_id,name) values (B,'x'); insert into r values ('A寫B_projects','ALLOWED'); exception when others then insert into r values ('A寫B_projects','blocked '||sqlstate); end;
  begin insert into expenses(tenant_id,description,amount) values (B,'x',1); insert into r values ('A寫B_expenses','ALLOWED'); exception when others then insert into r values ('A寫B_expenses','blocked '||sqlstate); end;
  begin insert into price_book(tenant_id,name) values (B,'x'); insert into r values ('A寫B_price_book','ALLOWED'); exception when others then insert into r values ('A寫B_price_book','blocked '||sqlstate); end;
  begin insert into stage_templates(tenant_id,name) values (B,'x'); insert into r values ('A寫B_stage_templates','ALLOWED'); exception when others then insert into r values ('A寫B_stage_templates','blocked '||sqlstate); end;
  -- 自家店資料掛到別家案件
  begin insert into receivables(tenant_id,project_id,label,amount) values ((select id from fx where k='A'),bp,'x',1); insert into r values ('A應收掛B案件','ALLOWED'); exception when others then insert into r values ('A應收掛B案件','blocked '||sqlstate); end;
  begin insert into expenses(tenant_id,project_id,description,amount) values ((select id from fx where k='A'),bp,'x',1); insert into r values ('A支出掛B案件','ALLOWED'); exception when others then insert into r values ('A支出掛B案件','blocked '||sqlstate); end;
  begin insert into quote_items(quote_id,description) values ((select id from fx where k='quote'),'x'); insert into r values ('A加B報價明細','ALLOWED'); exception when others then insert into r values ('A加B報價明細','blocked '||sqlstate); end;
  begin insert into receipts(receivable_id,amount) values ((select id from fx where k='receivable'),1); insert into r values ('A登記B收款','ALLOWED'); exception when others then insert into r values ('A登記B收款','blocked '||sqlstate); end;
  begin insert into payments(payable_id,amount) values ((select id from fx where k='payable'),1); insert into r values ('A登記B付款','ALLOWED'); exception when others then insert into r values ('A登記B付款','blocked '||sqlstate); end;
  begin perform rpc_report_progress(_stage_id => (select id from fx where k='stage'), _percent => 90); insert into r values ('A回報B進度','ALLOWED'); exception when others then insert into r values ('A回報B進度','blocked '||sqlstate); end;
  begin perform rpc_apply_stage_template(bp, (select id from stage_templates limit 1)); insert into r values ('A套範本到B案件','ALLOWED'); exception when others then insert into r values ('A套範本到B案件','blocked '||sqlstate); end;
  begin perform rpc_quote_new_version((select id from fx where k='quote')); insert into r values ('A複製B報價','ALLOWED'); exception when others then insert into r values ('A複製B報價','blocked '||sqlstate); end;
  -- 把自家案件搬到別家店
  begin update projects set tenant_id = (select id from fx where k='B') where id = (select id from fx where k='a_project');
        insert into r values ('A把案件搬到B', case when found then 'ALLOWED' else 'blocked 0 rows' end);
  exception when others then insert into r values ('A把案件搬到B','blocked '||sqlstate); end;
end $$;

-- ── 以 B 店老闆身分（非平台管理員）──
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='bo'),'role','authenticated')::text, true);
do $$
declare n int; A uuid := (select id from fx where k='A');
begin
  select count(*) into n from projects where tenant_id = A;   insert into r values ('B讀A_projects', n::text);
  select count(*) into n from expenses where tenant_id = A;   insert into r values ('B讀A_expenses', n::text);
  select count(*) into n from receivables where tenant_id = A; insert into r values ('B讀A_receivables', n::text);
  select count(*) into n from tenants where id = A;           insert into r values ('B讀A_tenants', n::text);
  select count(*) into n from projects where tenant_id = (select id from fx where k='B'); insert into r values ('B讀自己_projects(應=1)', n::text);
  select count(*) into n from pa_tenant_list(); insert into r values ('B叫pa_tenant_list筆數(應0)', n::text);
  begin perform pa_toggle_module((select id from fx where k='B'), 'dispatch', true); insert into r values ('B自己開加購模組','ALLOWED'); exception when others then insert into r values ('B自己開加購模組','blocked '||sqlstate); end;
  begin update tenant_modules set enabled = true where tenant_id = (select id from fx where k='B') and module_key='dispatch'; insert into r values ('B直接改模組表','ALLOWED '||(case when found then 'row' else '0row' end)); exception when others then insert into r values ('B直接改模組表','blocked '||sqlstate); end;
  begin update tenants set status = 'active' where id = (select id from fx where k='B'); insert into r values ('B改自己店鋪資料','ALLOWED '||(case when found then 'row' else '0row' end)); exception when others then insert into r values ('B改自己店鋪資料','blocked '||sqlstate); end;
  begin insert into line_events(line_user_id,event_type) values ('x','x'); insert into r values ('B寫LINE事件表','ALLOWED'); exception when others then insert into r values ('B寫LINE事件表','blocked '||sqlstate); end;
  begin update profiles set role = 'owner' where user_id = (select id from fx where k='bo'); insert into r values ('B改自己profile','ALLOWED '||(case when found then 'row' else '0row' end)); exception when others then insert into r values ('B改自己profile','blocked '||sqlstate); end;
  begin insert into platform_admins(user_id) values ((select id from fx where k='bo')); insert into r values ('B自封平台管理員','ALLOWED'); exception when others then insert into r values ('B自封平台管理員','blocked '||sqlstate); end;
end $$;

-- ── 以 B 店助理身分 ──
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='ba'),'role','authenticated')::text, true);
do $$
declare n int; t text;
begin
  foreach t in array array['clients','projects','quotes','receivables','receipts','expenses','payables','payments','project_stages','progress_logs','price_book'] loop
    execute format('with u as (delete from %I returning 1) select count(*) from u', t) into n;
    insert into r values ('B助理刪_'||t, n::text);
  end loop;
  select count(*) into n from projects; insert into r values ('B助理讀自己案件(應=1)', n::text);
  insert into r values ('B助理月帳有毛利', (rpc_dashboard_month() ? 'margins')::text);
  begin update profiles set role = 'owner' where user_id = (select id from fx where k='ba'); insert into r values ('B助理升級老闆','ALLOWED'); exception when others then insert into r values ('B助理升級老闆','blocked '||sqlstate); end;
end $$;

reset role;
select json_object_agg(k, v order by k) from r;
rollback;
