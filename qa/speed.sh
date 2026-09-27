#!/bin/bash
# Edge Function 回應時間 + 正式站頁面下載
U=https://bzavntmsfgtsluiheypp.supabase.co
for i in $(seq 1 20); do curl -s -o /dev/null -w '%{time_total}\n' -X POST $U/functions/v1/line-webhook -d '{"events":[]}'; done | sort -n | awk '{a[NR]=$1} END{printf "edge webhook x20: min %.0fms p50 %.0fms max %.0fms\n", a[1]*1000, a[int(NR/2)]*1000, a[NR]*1000}'
S=https://engineer-lite.lovable.app
for p in / /projects /expenses; do curl -s -o /dev/null -w "page $p: ttfb %{time_starttransfer}s total %{time_total}s size %{size_download}B\n" $S$p; done
# 首頁實際載入的 JS（gzip 後大小）
curl -s $S/ | grep -aoE '/assets/[^"'"'"' ]+\.(js|css)' | sort -u > first.txt
tot=0; for a in $(cat first.txt); do s=$(curl -s -H 'Accept-Encoding: gzip, br' -o /dev/null -w '%{size_download}' $S$a); tot=$((tot+s)); done
echo "first-load assets: $(wc -l < first.txt) files, compressed ${tot}B"
