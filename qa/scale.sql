-- 大量資料壓測：模擬一家「很忙」的店（交易內，最後 rollback）
begin;
create temp table r(k text, v text) on commit drop; grant all on r to authenticated;
create temp table fx(k text primary key, id uuid) on commit drop; grant all on fx to authenticated;
do $$
declare B uuid := 'b86fc4d2-5baa-4398-a8e9-fe57f0d7ce8c'; u uuid := gen_random_uuid();
begin
  insert into auth.users(id, instance_id, aud, role, email) values (u,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','qa-scale@qa.invalid');
  insert into profiles(user_id, tenant_id, display_name, role, is_active) values (u,B,'qa','owner',true);
  insert into fx values ('u',u),('B',B);
  -- 300 客戶、600 案件（200 進行中）
  insert into clients(tenant_id,name) select B, '客戶'||g from generate_series(1,300) g;
  insert into projects(tenant_id,client_id,name,status,contract_amount,address)
    select B, (select id from clients where tenant_id=B order by random() limit 1), '案件'||g||' 中山路'||g||'號',
           (array['進行中','完工','結案'])[1 + g % 3], 100000 + g*1000, '雲林縣斗六市中山路'||g||'號'
    from generate_series(1,600) g;
  -- 每案 6 階段、每階段 3 筆回報
  insert into project_stages(tenant_id,project_id,name,sort_order,percent)
    select B, p.id, s.n, s.i*10, (random()*100)::int from projects p, (values (1,'拆除'),(2,'水電'),(3,'泥作'),(4,'木作'),(5,'油漆'),(6,'清潔')) s(i,n) where p.tenant_id=B;
  insert into progress_logs(tenant_id,project_id,stage_id,percent)
    select B, st.project_id, st.id, (random()*100)::int from project_stages st, generate_series(1,3) where st.tenant_id=B;
  -- 報價：每案 2 版、每版 8 項
  insert into quotes(tenant_id,project_id,title,subtotal,tax,total) select B, p.id, '報價', 100000, 5000, 105000 from projects p, generate_series(1,2) where p.tenant_id=B;
  insert into quote_items(quote_id,description,quantity,unit_price,amount) select q.id, '品項'||g, 1, 1000, 1000 from quotes q, generate_series(1,8) g where q.tenant_id=B;
  -- 應收每案 3 期、各有收款；支出每案 20 筆；應付每案 3 筆
  insert into receivables(tenant_id,project_id,label,amount,due_date) select B, p.id, '第'||g||'期', 30000, current_date + (g*30 - 60) from projects p, generate_series(1,3) g where p.tenant_id=B;
  insert into receipts(receivable_id,amount,received_date) select id, 10000, current_date - 5 from receivables where tenant_id=B;
  insert into expenses(tenant_id,project_id,description,amount,category,expense_date) select B, p.id, '材料'||g, 500 + g, 'material', current_date - (g % 60) from projects p, generate_series(1,20) g where p.tenant_id=B;
  insert into payables(tenant_id,project_id,vendor_name,amount,due_date) select B, p.id, '廠商'||g, 20000, current_date + g from projects p, generate_series(1,3) g where p.tenant_id=B;
  insert into payments(payable_id,amount,paid_date) select id, 5000, current_date - 3 from payables where tenant_id=B;
  analyze clients; analyze projects; analyze project_stages; analyze progress_logs; analyze quotes; analyze quote_items;
  analyze receivables; analyze receipts; analyze expenses; analyze payables; analyze payments;
  insert into r select '資料量', json_build_object('projects',(select count(*) from projects where tenant_id=B),'expenses',(select count(*) from expenses where tenant_id=B),
     'receivables',(select count(*) from receivables where tenant_id=B),'progress_logs',(select count(*) from progress_logs where tenant_id=B),'quote_items',(select count(*) from quote_items qi join quotes q on q.id=qi.quote_id where q.tenant_id=B))::text;
end $$;

set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='u'),'role','authenticated')::text, true);

do $$
declare t0 timestamptz; n int; j jsonb;
begin
  -- 前端各頁實際發出的查詢（等價 SQL）
  t0 := clock_timestamp(); select count(*) into n from (select p.*, (select row(c.id,c.name) from clients c where c.id=p.client_id) from projects p order by p.created_at desc) x;
  insert into r values ('案件列表(600)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from (select * from v_project_progress) x;
  insert into r values ('案件進度彙總', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from (select e.*, (select p.name from projects p where p.id=e.project_id) from expenses e order by e.expense_date desc) x;
  insert into r values ('支出列表(12000)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from (select r.*, (select p.name from projects p where p.id=r.project_id) from receivables r order by r.due_date) x;
  insert into r values ('應收列表(1800)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from (select * from quotes where is_latest order by created_at desc) x;
  insert into r values ('報價列表', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from v_project_finance_summary;
  insert into r values ('財務彙總view', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); j := rpc_dashboard_month();
  insert into r values ('總覽本月帳務RPC', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms / margins='||jsonb_array_length(j->'margins'));
  t0 := clock_timestamp(); select count(*) into n from (select * from project_stages where project_id = (select id from projects limit 1)) x;
  insert into r values ('單一案件階段', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); perform rpc_report_progress(_stage_id => (select id from project_stages limit 1), _percent => 70);
  insert into r values ('回報進度RPC', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); perform rpc_quote_new_version((select id from quotes where is_latest limit 1));
  insert into r values ('報價新版本RPC', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); insert into receipts(receivable_id,amount) select id, 1 from receivables limit 1;
  insert into r values ('登記收款(含狀態觸發)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
end $$;

reset role;
-- LINE 端（service role 走 line_* 函式）
do $$
declare t0 timestamptz; n int; lu text := 'Uqa'||md5(random()::text);
begin
  insert into line_bindings(tenant_id,user_id,line_user_id,bound_at) values ((select id from fx where k='B'),(select id from fx where k='u'),lu,now());
  t0 := clock_timestamp(); select count(*) into n from line_projects(lu);
  insert into r values ('LINE選案件(200進行中)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); select count(*) into n from line_projects(lu, 12, '中山路15');
  insert into r values ('LINE關鍵字找案件', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms / 找到'||n);
  t0 := clock_timestamp(); perform line_money_summary(lu);
  insert into r values ('LINE收付款摘要', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
  t0 := clock_timestamp(); perform line_daily_digest();
  insert into r values ('每日推播彙整(全平台)', round(extract(epoch from clock_timestamp()-t0)*1000)||'ms');
end $$;
select json_object_agg(k,v order by k) from r;
rollback;
