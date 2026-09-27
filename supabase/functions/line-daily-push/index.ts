// LINE 每日 08:00 推播 (module:line)
// Triggered by pg_cron → pg_net with header x-cron-secret (value lives in Vault,
// checked by verify_cron_secret). Each message only contains the recipient's
// own 店鋪 data (line_daily_digest resolves tenant per binding).
import { createClient } from 'npm:@supabase/supabase-js@2'

const ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

type Digest = {
  overdue_count?: number; overdue_sum?: number
  today_items?: { project: string; label: string; remaining: number }[]
  payable_today_items?: { vendor: string; remaining: number }[]
  active_projects?: number
  stale_project?: { name: string; days: number | null } | null
}

function money(n: number | string | null | undefined) {
  return '$' + Math.round(Number(n ?? 0)).toLocaleString('en-US')
}

export function compose(d: Digest): string {
  const lines: string[] = ['早安，今天的重點：']
  if (d.today_items !== undefined) {
    if (d.today_items.length) {
      lines.push('', '【今天要收】')
      for (const it of d.today_items) lines.push(`・${it.project}／${it.label} ${money(it.remaining)}`)
    }
    if (d.overdue_count) lines.push('', `【逾期未收】${d.overdue_count} 筆，共 ${money(d.overdue_sum)}`)
  }
  if (d.payable_today_items?.length) {
    lines.push('', '【今天要付】')
    for (const it of d.payable_today_items) lines.push(`・${it.vendor} ${money(it.remaining)}`)
  }
  if (d.active_projects) {
    let p = `【進度】進行中 ${d.active_projects} 件`
    if (d.stale_project) {
      const s = d.stale_project
      p += s.days === null ? `，「${s.name}」還沒回報過` : s.days >= 1 ? `，最久沒回報的是「${s.name}」（${s.days} 天前）` : ''
    }
    lines.push('', p)
  }
  if (lines.length === 1) lines.push('今天沒有要收付的款項。')
  lines.push('', '輸入「回報進度」可以直接回報。')
  return lines.join('\n')
}

Deno.serve(async (req) => {
  const secret = req.headers.get('x-cron-secret') ?? ''
  const { data: ok, error: vErr } = await sb.rpc('verify_cron_secret', { _secret: secret })
  if (vErr || ok !== true) return new Response('forbidden', { status: 403 })
  if (!ACCESS_TOKEN) return new Response('LINE secrets not configured', { status: 503 })

  const { data: rows, error } = await sb.rpc('line_daily_digest')
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0, failed = 0
  for (const r of (rows ?? []) as { line_user_id: string; data: Digest }[]) {
    const res = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
      body: JSON.stringify({ to: r.line_user_id, messages: [{ type: 'text', text: compose(r.data) }] }),
    })
    if (res.ok) sent++
    else { failed++; console.error('push failed', res.status, await res.text()) }
  }
  return Response.json({ sent, failed })
})
