# 系統測試腳本

全部可重複執行；資料庫測試都在交易內 rollback，不會留下資料。

| 檔案 | 用途 | 怎麼跑 |
|---|---|---|
| `anon.sh` | 未登入能不能讀寫任何表、RPC、Storage、Edge Function | `bash qa/anon.sh`（最後一行 `RESULT fail=0` 才算過） |
| `isolation.sql` | 店鋪隔離、老闆／助理權限、平台管理 RPC | 貼到 Supabase SQL Editor 執行 |
| `scale.sql` | 600 案／12,000 筆支出壓測，量各查詢耗時 | 同上 |
| `bundle.sh` | 前端 JS 有沒有外洩密鑰、HTTP 安全 header | `bash qa/bundle.sh` |
| `speed.sh` | Edge Function 回應時間、頁面下載、首次載入大小 | `bash qa/speed.sh` |

報告：專案文件《engineer-lite_系統測試報告_2026-09-27》。
