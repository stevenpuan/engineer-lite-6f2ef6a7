#!/bin/bash
# 前端 bundle 掃描：有沒有外洩的金鑰；回應 header
S=https://engineer-lite.lovable.app
rm -rf js && mkdir js
curl -s -D hdr.txt $S/ -o index.html
for p in / /projects /expenses /receivables /payables /quotes /clients /line /stage-templates /admin/tenants /admin/users /admin/modules /login; do
  curl -s $S$p | grep -aoE '/assets/[^"'"'"' ]+\.js' ; done | sort -u > list.txt
while read a; do curl -s "$S$a" -o "js/$(basename $a)"; done < list.txt
# 動態 import 的 chunk
grep -aohE 'assets/[A-Za-z0-9_.-]+\.js' js/*.js | sort -u | while read a; do [ -f "js/$(basename $a)" ] || curl -s "$S/$a" -o "js/$(basename $a)"; done
echo "chunks: $(ls js | wc -l)  total bytes: $(cat js/* | wc -c)"
echo "--- secret scan"
grep -alE 'service_role|sk-ant-|LINE_CHANNEL_SECRET|LINE_CHANNEL_ACCESS_TOKEN|SUPABASE_SERVICE|x-cron-secret|line_cron_secret' js/* && echo "FAIL secret-like string found" || echo "ok no secrets"
# JWT 型字串：只允許 anon
for j in $(grep -aohE 'eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+' js/* | sort -u); do
  role=$(echo $j | cut -d. -f2 | tr '_-' '/+' | base64 -d 2>/dev/null | grep -o '"role":"[a-z_]*"'); echo "jwt in bundle: $role"; done
echo "--- headers"
grep -iE 'strict-transport|content-security|x-frame|x-content-type|referrer-policy|permissions-policy' hdr.txt || echo "(none of the security headers)"
