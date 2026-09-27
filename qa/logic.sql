-- 邏輯判斷規則測試（奕廣老闆身分，交易內，最後 rollback）
begin;
create temp table r(n serial, k text, v text) on commit drop;
grant all on r to authenticated; grant usage on sequence r_n_seq to authenticated;
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub','2899f323-3fc8-4547-8d66-af52fd30750c','role','authenticated')::text, true);
do $$
declare p uuid; rv uuid; rc uuid; pa uuid; q1 quotes; v2 uuid; v3 uuid; n int; j jsonb; s text; asst uuid;
  today date := (now() at time zone 'Asia/Taipei')::date;
begin
  insert into projects(name, status, contract_amount) values ('QA 邏輯', '進行中', 100000) returning id into p;

  -- L1 應收狀態
  insert into receivables(project_id, label, amount, due_date) values (p, '一期', 10000, today + 10) returning id into rv;
  insert into r(k,v) values ('L1 新應收', (select status from receivables where id=rv));
  insert into receipts(receivable_id, amount) values (rv, 4000) returning id into rc;
  insert into r(k,v) values ('L1 收 4000', (select status from receivables where id=rv));
  insert into receipts(receivable_id, amount) values (rv, 6000);
  insert into r(k,v) values ('L1 收滿', (select status from receivables where id=rv));
  delete from receipts where id = rc;
  insert into r(k,v) values ('L1 刪一筆收款', (select status from receivables where id=rv));
  update receivables set amount = 5000 where id = rv;
  insert into r(k,v) values ('L1 應收改小到已收額', (select status from receivables where id=rv));
  update receivables set amount = 20000, due_date = today - 1 where id = rv;
  insert into r(k,v) values ('L1 改大+到期日已過（應 overdue）', (select status from receivables where id=rv));
  reset role; perform mark_overdue_receivables(); set local role authenticated;
  insert into r(k,v) values ('L1 夜間逾期標記後', (select status from receivables where id=rv));
  update receivables set due_date = today + 30 where id = rv;
  insert into r(k,v) values ('L1 逾期後延長到期日（應 partial）', (select status from receivables where id=rv));
  update receivables set due_date = today - 5 where id = rv;
  reset role; perform mark_overdue_receivables(); set local role authenticated;
  insert into receipts(receivable_id, amount) values (rv, 1000);
  insert into r(k,v) values ('L1 逾期中再收部分款（應仍 overdue）', (select status from receivables where id=rv));

  -- L2 應付
  insert into payables(project_id, vendor_name, amount) values (p, '廠商', 10000) returning id into pa;
  insert into payments(payable_id, amount) values (pa, 10000);
  insert into r(k,v) values ('L2 付清', (select status from payables where id=pa));
  update payables set amount = 12000 where id = pa;
  insert into r(k,v) values ('L2 應付改大', (select status from payables where id=pa));

  -- L3 報價
  insert into quotes(project_id) values (p) returning * into q1;
  insert into quote_items(quote_id, description, quantity, unit_price, amount) values (q1.id, 'A', 2, 100, 200);
  insert into r(k,v) values ('L3 5% 合計', (select subtotal||'/'||tax||'/'||total from quotes where id=q1.id));
  update quotes set tax_rate = 0 where id = q1.id;
  insert into r(k,v) values ('L3 改免稅', (select subtotal||'/'||tax||'/'||total from quotes where id=q1.id));
  v2 := rpc_quote_new_version(q1.id);
  insert into r(k,v) values ('L3 新版本稅率（應 0）', (select tax_rate||' / '||tax||' / no='||quote_no from quotes where id=v2));
  v3 := rpc_quote_new_version(v2);
  select count(*) into n from quotes where coalesce(parent_quote_id,id) = q1.id and is_latest;
  insert into r(k,v) values ('L3 版本鏈最新數（應1）', n::text);
  -- 模擬前台刪除最新版（v3）後把根設為最新
  delete from quotes where id = v3;
  update quotes set is_latest = true where id = q1.id;
  insert into r(k,v) values ('L3 刪 v3 後最新版', (select string_agg('v'||version, ',' order by version) from quotes where coalesce(parent_quote_id,id) = q1.id and is_latest));
  insert into quote_items(quote_id, description, quantity, unit_price, amount) values (q1.id, 'B', 3, 100, 999);
  insert into r(k,v) values ('L3 品項金額亂填 3×100 送 999', (select amount::text from quote_items where quote_id=q1.id and description='B'));
  begin update quotes set tax_rate = -5 where id = q1.id; insert into r(k,v) values ('L3 稅率 -5', 'ALLOWED'); exception when others then insert into r(k,v) values ('L3 稅率 -5', 'blocked'); end;

  -- L5 發票
  begin insert into tax_invoices(direction, invoice_no, tax_type, sales_amount, tax_amount) values ('out','ZZ10000001','zero',1000,50);
        insert into r(k,v) values ('L5 零稅率卻有稅額', 'ALLOWED'); exception when others then insert into r(k,v) values ('L5 零稅率卻有稅額','blocked'); end;
  insert into tax_invoices(direction, invoice_no, invoice_date, sales_amount, tax_amount) values ('out','ZZ10000002','2026-10-31',1000,50);
  insert into tax_invoices(direction, invoice_no, invoice_date, sales_amount, tax_amount) values ('out','ZZ10000003','2026-11-01',1000,50);
  insert into r(k,v) values ('L5 期別 10/31、11/01', (select string_agg(period_key::text, ',' order by invoice_no) from tax_invoices where invoice_no in ('ZZ10000002','ZZ10000003')));
  insert into tax_invoices(direction, invoice_no, invoice_date, buyer_tax_id, sales_amount, tax_amount, deductible) values ('in','ZZ10000004','2026-05-10','14854598',100000,5000,true);
  j := rpc_tax_summary(2026);
  insert into r(k,v) values ('L5 5-6月留抵→7-8→9-10', (select string_agg((x->>'label')||':應納'||(x->>'tax_payable')||'/留抵'||(x->>'credit_carried'), ' ') from jsonb_array_elements(j) x where (x->>'period')::int between 202605 and 202611));
  begin insert into tax_invoices(direction, invoice_no, sales_amount, tax_amount) values ('out','ZZ10000002',1,0);
        insert into r(k,v) values ('L5 同號銷項重複', 'ALLOWED'); exception when others then insert into r(k,v) values ('L5 同號銷項重複','blocked'); end;
  update tax_invoices set status = 'void' where invoice_no = 'ZZ10000002';
  begin insert into tax_invoices(direction, invoice_no, sales_amount, tax_amount) values ('out','ZZ10000002',1,0);
        insert into r(k,v) values ('L5 作廢後可重開同號', 'ok'); exception when others then insert into r(k,v) values ('L5 作廢後可重開同號','blocked'); end;

  -- L6 刪案件連動
  delete from projects where id = p;
  insert into r(k,v) values ('L6 刪案件後 應收/報價/應付/發票', (select count(*) from receivables where project_id=p)||'/'||(select count(*) from quotes where project_id=p)||'/'||(select count(*) from payables where id=pa and project_id is null)||'/'||(select count(*) from tax_invoices where invoice_no like 'ZZ1%'));
end $$;
reset role;
select k, v from r order by n;
rollback;
