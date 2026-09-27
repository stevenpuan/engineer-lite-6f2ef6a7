-- 奕廣工程行（第一個試用客戶）上線前資料庫層測試：全部在交易內，最後 rollback
begin;
create temp table r(n serial, k text, v text) on commit drop;
grant all on r to authenticated; grant usage on sequence r_n_seq to authenticated;
create temp table fx(k text primary key, id uuid) on commit drop; grant all on fx to authenticated;
insert into fx values
  ('Y','8adb7d8f-6696-45cd-9c73-2563bea3f1f1'), ('yo','2899f323-3fc8-4547-8d66-af52fd30750c'),
  ('A','807eea2b-124a-4956-a82f-dc41bb381f79'), ('ao','290f381d-6675-490e-a430-3a91022d0a02');

set local role authenticated;

-- ── 1. 奕廣老闆：完整業務流程 ──
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='yo'),'role','authenticated')::text, true);
do $$
declare c uuid; p uuid; q quotes; st uuid; rv uuid; pa uuid; e uuid; j jsonb; n int; tpl uuid; ti uuid; tx text;
begin
  insert into r(k,v) values ('current_tenant=奕廣', (current_tenant_id() = (select id from fx where k='Y'))::text);
  insert into r(k,v) values ('is_owner', is_tenant_owner()::text);
  insert into r(k,v) values ('模組 ai_ocr(應 false)', has_module('ai_ocr')::text);
  insert into r(k,v) values ('模組 invoice(應 true)', has_module('invoice')::text);
  select count(*) into n from stage_templates; insert into r(k,v) values ('自家預設範本數', n::text);

  insert into clients(name, phone) values ('QA 王先生', '0912000000') returning id into c;
  insert into projects(client_id, name, status, contract_amount, address) values (c, 'QA 斗六地基工程', '進行中', 800000, '雲林縣斗六市') returning id into p;
  select id into tpl from stage_templates order by created_at limit 1;
  perform rpc_apply_stage_template(p, tpl);
  select count(*) into n from project_stages where project_id = p; insert into r(k,v) values ('套範本後階段數', n::text);
  select id into st from project_stages where project_id = p order by sort_order limit 1;
  perform rpc_report_progress(_stage_id => st, _percent => 40);
  select overall_percent::text into tx from v_project_progress where project_id = p; insert into r(k,v) values ('回報後整體%', coalesce(tx,'null'));

  insert into quotes(project_id) values (p) returning * into q;
  insert into r(k,v) values ('報價自動編號/名稱', q.quote_no || ' / ' || q.title);
  insert into quote_items(quote_id, description, unit, quantity, unit_price, amount) values (q.id, '開挖', '式', 1, 120000, 120000);
  perform rpc_price_book_remember('開挖', '式', 120000);
  select count(*) into n from price_book; insert into r(k,v) values ('單價庫筆數', n::text);

  insert into receivables(project_id, label, amount, due_date) values (p, '簽約金', 240000, current_date + 7) returning id into rv;
  insert into receipts(receivable_id, amount) values (rv, 100000);
  insert into r(k,v) values ('部分收款狀態', (select status from receivables where id = rv));
  insert into receipts(receivable_id, amount) values (rv, 140000);
  insert into r(k,v) values ('收滿狀態', (select status from receivables where id = rv));

  insert into expenses(project_id, description, amount, category, receipt_no, seller_tax_id) values (p, '水泥', 10500, 'material', 'AB12345678', '12345678') returning id into e;
  insert into r(k,v) values ('支出預設狀態', (select status from expenses where id = e));
  insert into payables(project_id, vendor_name, amount, due_date) values (p, '怪手租賃', 50000, current_date + 3) returning id into pa;
  insert into payments(payable_id, amount) values (pa, 20000);
  insert into r(k,v) values ('部分付款狀態', (select status from payables where id = pa));

  -- 發票：銷項 + 從支出匯入進項（二聯式→不可扣抵）+ 三聯式買方=本店統編→可扣抵
  insert into tax_invoices(direction, invoice_no, counterparty_name, counterparty_tax_id, sales_amount, tax_amount, project_id, receivable_id)
    values ('out', 'ZZ00000001', 'QA 王先生', null, 228571, 11429, p, rv);
  select rpc_tax_import_expenses() into n; insert into r(k,v) values ('從支出匯入筆數', n::text);
  insert into r(k,v) values ('匯入進項可扣抵(二聯式應 false)', (select deductible::text || ' ' || coalesce(deduct_note,'') from tax_invoices where expense_id = e));
  insert into tax_invoices(direction, invoice_no, counterparty_name, buyer_tax_id, sales_amount, tax_amount, deductible)
    values ('in', 'ZZ00000002', '五金行', '14854598', 20000, 1000, true) returning id into ti;
  j := rpc_tax_summary(extract(year from current_date)::int);
  insert into r(k,v) values ('本期稅額統計', (select x::text from jsonb_array_elements(j) x where (x->>'period')::int = (extract(year from current_date)::int*100 + (((extract(month from current_date)::int - 1) / 2) * 2 + 1))));
  insert into r(k,v) values ('我的統編', coalesce(rpc_my_tenant_tax_id(), 'null'));

  j := rpc_dashboard_month();
  insert into r(k,v) values ('總覽', jsonb_build_object('received', j->'month_received', 'paid', j->'month_paid', 'expense', j->'month_expense', 'margins_total', j->'margins_total')::text);

  select count(*) into n from rpc_line_members(); insert into r(k,v) values ('LINE 成員數', n::text);
  j := rpc_line_issue_code((select id from fx where k='yo'));
  insert into r(k,v) values ('LINE 邀請碼', (j->>'code') || ' 到 ' || (j->>'expires_at'));

  insert into fx values ('y_project', p), ('y_client', c), ('y_expense', e), ('y_quote', q.id), ('y_receivable', rv), ('y_invoice', ti);
end $$;

-- ── 2. 奕廣老闆讀／寫伯洸 ──
do $$
declare n int; A uuid := (select id from fx where k='A'); t text;
begin
  foreach t in array array['clients','projects','quotes','receivables','expenses','payables','project_stages','progress_logs','price_book','stage_templates','tax_invoices','line_bindings','activity_logs'] loop
    execute format('select count(*) from %I where tenant_id = $1', t) into n using A;
    insert into r(k,v) values ('奕廣讀伯洸_'||t||'(應0)', n::text);
  end loop;
  select count(*) into n from tenants where id = A; insert into r(k,v) values ('奕廣讀伯洸_tenants(應0)', n::text);
  select count(*) into n from profiles where tenant_id = A; insert into r(k,v) values ('奕廣讀伯洸_profiles(應0)', n::text);
  select count(*) into n from quote_items qi join quotes q on q.id = qi.quote_id where q.tenant_id = A; insert into r(k,v) values ('奕廣讀伯洸_quote_items(應0)', n::text);
  begin insert into clients(tenant_id,name) values (A,'x'); insert into r(k,v) values ('奕廣寫伯洸客戶','ALLOWED'); exception when others then insert into r(k,v) values ('奕廣寫伯洸客戶','blocked '||sqlstate); end;
  begin insert into tax_invoices(tenant_id,direction,invoice_no,sales_amount,tax_amount) values (A,'out','ZZ00000009',1,0); insert into r(k,v) values ('奕廣寫伯洸發票','ALLOWED'); exception when others then insert into r(k,v) values ('奕廣寫伯洸發票','blocked '||sqlstate); end;
  begin perform rpc_line_issue_code((select id from fx where k='ao')); insert into r(k,v) values ('奕廣替伯洸發LINE碼','ALLOWED'); exception when others then insert into r(k,v) values ('奕廣替伯洸發LINE碼','blocked'); end;
  select count(*) into n from pa_tenant_list(); insert into r(k,v) values ('奕廣叫平台租戶列表(應0)', n::text);
  begin perform pa_toggle_module((select id from fx where k='Y'), 'ai_ocr', true); insert into r(k,v) values ('奕廣自己開 AI 記帳','ALLOWED'); exception when others then insert into r(k,v) values ('奕廣自己開 AI 記帳','blocked '||sqlstate); end;
end $$;

-- ── 3. 伯洸（平台管理員）讀奕廣店內帳 ──
select set_config('request.jwt.claims', json_build_object('sub',(select id from fx where k='ao'),'role','authenticated')::text, true);
do $$
declare n int; Y uuid := (select id from fx where k='Y'); t text;
begin
  foreach t in array array['clients','projects','quotes','receivables','expenses','payables','tax_invoices'] loop
    execute format('select count(*) from %I where tenant_id = $1', t) into n using Y;
    insert into r(k,v) values ('平台讀奕廣_'||t||'(應0)', n::text);
  end loop;
  begin insert into expenses(project_id,description,amount) values ((select id from fx where k='y_project'),'x',1); insert into r(k,v) values ('伯洸支出掛奕廣案件','ALLOWED'); exception when others then insert into r(k,v) values ('伯洸支出掛奕廣案件','blocked '||sqlstate); end;
  select count(*) into n from pa_line_members(Y); insert into r(k,v) values ('平台看奕廣成員(應1)', n::text);
end $$;

reset role;
select k, v from r order by n;
rollback;
