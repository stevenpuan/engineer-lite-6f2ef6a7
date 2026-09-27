#!/bin/bash
# 未登入（只有公開 key）能不能讀／寫任何東西
K=sb_publishable_FigA0B0CbWzI2r91fuUOCQ_ail59FUR
U=https://bzavntmsfgtsluiheypp.supabase.co
fail=0
for t in activity_logs clients expenses line_bindings line_events line_pending modules payables payments platform_admins price_book profiles progress_logs project_stages projects quote_items quotes receipts receivables stage_templates tenant_modules tenants v_project_finance_summary v_project_progress; do
  body=$(curl -s -w '|%{http_code}' "$U/rest/v1/$t?select=*&limit=1" -H "apikey: $K")
  code=${body##*|}; data=${body%|*}
  if [[ "$code" == "200" && "$data" != "[]" ]]; then echo "FAIL read $t -> $data"; fail=1; else echo "ok   read $t ($code ${data:0:40})"; fi
done
# 寫入
for t in clients tenants tenant_modules profiles platform_admins; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/rest/v1/$t" -H "apikey: $K" -H 'content-type: application/json' -d '{"name":"x"}')
  [[ "$code" =~ ^2 ]] && { echo "FAIL write $t $code"; fail=1; } || echo "ok   write $t ($code)"
done
# RPC
for f in pa_tenant_list pa_create_tenant rpc_dashboard_month current_tenant_id has_module is_platform_admin rpc_line_new_bind_code line_ctx line_projects line_create_expense line_daily_digest mark_overdue_receivables purge_line_data seed_stage_templates; do
  r=$(curl -s -w '|%{http_code}' -X POST "$U/rest/v1/rpc/$f" -H "apikey: $K" -H 'content-type: application/json' -d '{}')
  code=${r##*|}
  [[ "$code" =~ ^2 ]] && { echo "FAIL rpc $f $code ${r:0:80}"; fail=1; } || echo "ok   rpc $f ($code)"
done
# Storage
code=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/storage/v1/object/list/expense-photos" -H "apikey: $K" -H "Authorization: Bearer $K" -H 'content-type: application/json' -d '{"prefix":""}')
r=$(curl -s -X POST "$U/storage/v1/object/list/expense-photos" -H "apikey: $K" -H "Authorization: Bearer $K" -H 'content-type: application/json' -d '{"prefix":""}')
[[ "$r" == "[]" || ! "$code" =~ ^2 ]] && echo "ok   storage list ($code $r)" || { echo "FAIL storage list $r"; fail=1; }
code=$(curl -s -o /dev/null -w '%{http_code}' "$U/storage/v1/object/public/expense-photos/x.jpg")
[[ "$code" =~ ^2 ]] && { echo "FAIL storage public"; fail=1; } || echo "ok   storage public url ($code)"
# Auth signup should be closed
r=$(curl -s -w '|%{http_code}' -X POST "$U/auth/v1/signup" -H "apikey: $K" -H 'content-type: application/json' -d '{"email":"qa-probe-'$RANDOM'@example.com","password":"Xx123456789!"}')
echo "info signup -> ${r:0:160}"
# Edge functions
c1=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/functions/v1/line-webhook" -d '{"events":[]}')
c2=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/functions/v1/line-webhook" -H 'x-line-signature: AAAA' -d '{"events":[]}')
c3=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/functions/v1/line-daily-push" -d '{}')
c4=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$U/functions/v1/line-daily-push" -H 'x-cron-secret: wrong' -d '{}')
echo "edge webhook nosig=$c1 badsig=$c2 push nosecret=$c3 badsecret=$c4"
[[ "$c1" == 401 && "$c2" == 401 && "$c3" =~ ^40 && "$c4" =~ ^40 ]] && echo "ok   edge auth" || { echo "FAIL edge auth"; fail=1; }
echo "RESULT fail=$fail"
