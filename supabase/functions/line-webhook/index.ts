// LINE 助手 webhook (module:line)
//
// Every event is resolved to a 店鋪 through line_bindings (line_ctx). All data
// access goes through the line_* SQL functions, which filter by that tenant, so
// one 店鋪 can never read or write another's data from LINE.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN
//   ANTHROPIC_API_KEY（選用，module:ai_ocr 讀傳統收據用）
import { createClient } from 'npm:@supabase/supabase-js@2'
import { recognizeReceipt } from './receipt.ts'

const CHANNEL_SECRET = Deno.env.get('LINE_CHANNEL_SECRET') ?? ''
const ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN') ?? ''
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
  auth: { persistSession: false },
})

const PHOTO_BUCKET = 'expense-photos'
const PERCENTS = [0, 20, 40, 60, 80, 100]
const CATEGORIES: [string, string][] = [
  ['material', '材料'], ['labor', '工資'], ['machinery', '機具租金'], ['fuel', '油資'],
  ['meal', '餐費'], ['transport', '運費'], ['sundry', '雜支'], ['other', '其他'],
]
const CATEGORY_LABEL = Object.fromEntries(CATEGORIES)

const MENU_COMMANDS = ['回報進度', '我的案子', '拍照記帳', '收款狀況', '付款提醒', '問一下']

const HELP =
  '可以用下方選單，或直接輸入：\n' +
  '・回報進度\n・我的案子\n・拍照記帳（或直接傳收據照片）\n・收款狀況\n・付款提醒'
const BIND_HELP =
  '這個 LINE 還沒綁定工程系統帳號。\n\n' +
  '請到網頁版「LINE 綁定」頁取得 6 位數綁定碼，再把綁定碼傳到這裡。'

// ── LINE API ──

type QuickItem = { label: string; data?: string; text?: string; display?: string }
type LineMessage = Record<string, unknown>

function quickReply(items: QuickItem[]) {
  return {
    items: items.slice(0, 13).map((it) => ({
      type: 'action',
      action: it.data
        ? { type: 'postback', label: clip(it.label, 20), data: it.data, displayText: clip(it.display ?? it.label, 300) }
        : { type: 'message', label: clip(it.label, 20), text: it.text ?? it.label },
    })),
  }
}

function text(t: string, items?: QuickItem[]): LineMessage {
  const m: LineMessage = { type: 'text', text: clip(t, 4900) }
  if (items?.length) m.quickReply = quickReply(items)
  return m
}

async function reply(replyToken: string, messages: LineMessage[]) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ACCESS_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: messages.slice(0, 5) }),
  })
  if (!res.ok) console.error('reply failed', res.status, await res.text())
}

async function lineDisplayName(userId: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
      headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
    })
    if (!res.ok) return null
    return (await res.json()).displayName ?? null
  } catch {
    return null
  }
}

async function verifySignature(body: string, signature: string | null): Promise<boolean> {
  if (!signature) return false
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(CHANNEL_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))
  const expected = btoa(String.fromCharCode(...mac))
  if (expected.length !== signature.length) return false
  let diff = 0
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i)
  return diff === 0
}

// ── helpers ──

function clip(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + '…' : s
}
function money(n: number | string | null | undefined) {
  return '$' + Math.round(Number(n ?? 0)).toLocaleString('en-US')
}
function parseAmount(raw: string): number | null {
  const s = raw.replace(/[,，\s元$＄]/g, '')
  const wan = s.match(/^(\d+(?:\.\d+)?)萬$/)
  if (wan) return Math.round(parseFloat(wan[1]) * 10000)
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s))
  return null
}
function daysAgo(ts: string | null) {
  if (!ts) return '尚未回報'
  const d = Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000)
  return d <= 0 ? '今天有回報' : `${d} 天前回報`
}

type Ctx = { user_id: string; tenant_id: string; tenant_name: string; display_name: string | null; role: string }

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await sb.rpc(fn, args)
  if (error) throw new Error(error.message)
  return data as T
}

async function getCtx(uid: string): Promise<Ctx | null> {
  const rows = await rpc<Ctx[]>('line_ctx', { _line_user_id: uid })
  return rows?.[0] ?? null
}

// ── 選案件（案件多時：最近動過的排前面，其餘用關鍵字找）──

type ProjectRow = {
  id: string; name: string; overall_percent: number; last_report_at: string | null
  client_name: string | null; status: string; my_recent: boolean; total: number
}
type PickFor = 'report' | 'exp'
const PICK_SHOWN = 10

async function listProjects(uid: string, q: string | null = null, limit = PICK_SHOWN) {
  return await rpc<ProjectRow[]>('line_projects', { _line_user_id: uid, _limit: limit, _q: q })
}

function projectItems(rows: ProjectRow[], pick: PickFor): QuickItem[] {
  return rows.map((p) => {
    const tag = p.my_recent ? '（剛回報）' : p.status !== '進行中' ? `（${p.status}）` : ''
    return pick === 'report'
      ? { label: `${p.name} ${p.overall_percent}%${tag}`, data: `a=proj&p=${p.id}`, display: p.name }
      : { label: `${p.name}${tag}`, data: `a=exp_proj&p=${p.id}`, display: p.name }
  })
}

const SEARCH_HINT = '找不到的話，直接打案名、客戶或地址的關鍵字（例如「中山路」「陳宅」）。'

// 使用者在選案件的步驟打字 → 用關鍵字找
async function searchProjects(uid: string, token: string, q: string, pick: PickFor, data: Record<string, unknown>) {
  const rows = await listProjects(uid, q, 12)
  if (!rows.length) {
    return reply(token, [text(`找不到「${q}」的案件，換個關鍵字試試。`, [{ label: '取消', text: '取消' }])])
  }
  if (rows.length === 1) {
    const p = rows[0]
    if (pick === 'report') {
      await rpc('line_pending_clear', { _line_user_id: uid })
      return flowStages(uid, token, p.id)
    }
    return chooseExpenseProject(uid, token, data, p.id, p.name)
  }
  const more = rows[0].total > rows.length ? `\n（共 ${rows[0].total} 件，只列前 ${rows.length} 件，可以再打詳細一點）` : ''
  const items = projectItems(rows, pick)
  items.push({ label: '取消', text: '取消' })
  return reply(token, [text(`「${q}」找到這些案件：${more}`, items)])
}

// ── flows ──

async function flowProjects(uid: string, token: string) {
  const projects = await listProjects(uid)
  await rpc('line_pending_set', { _line_user_id: uid, _kind: 'report_project', _data: {} })
  if (!projects.length) return reply(token, [text('目前沒有「進行中」的案件。\n也可以直接打案名關鍵字找洽談中或已完工的案件。', [{ label: '取消', text: '取消' }])])
  const hint = projects[0].total > projects.length ? `\n\n進行中共 ${projects[0].total} 件，這裡列最近動過的 ${projects.length} 件。\n${SEARCH_HINT}` : ''
  await reply(token, [text(`要回報哪個案件？${hint}`, projectItems(projects, 'report'))])
}

async function flowStages(uid: string, token: string, projectId: string) {
  await rpc('line_pending_clear', { _line_user_id: uid })
  const stages = await rpc<{ id: string; name: string; percent: number; project_name: string }[]>('line_stages', {
    _line_user_id: uid, _project_id: projectId,
  })
  if (!stages.length) return reply(token, [text('這個案件還沒有設定階段。\n請到網頁版案件的「進度」分頁套用範本。')])
  await reply(token, [
    text(`${stages[0].project_name}：哪個階段？`, stages.map((s) => ({ label: `${s.name} ${s.percent}%`, data: `a=stage&s=${s.id}`, display: s.name }))),
  ])
}

async function flowPercent(token: string, stageId: string) {
  await reply(token, [
    text('做到幾 %？', PERCENTS.map((v) => ({ label: `${v}%`, data: `a=pct&s=${stageId}&v=${v}` }))),
  ])
}

async function flowReport(uid: string, token: string, stageId: string, percent: number) {
  const r = await rpc<{ project: string; stage: string; percent: number; overall: number }>('line_report_progress', {
    _line_user_id: uid, _stage_id: stageId, _percent: percent,
  })
  await reply(token, [text(`已回報 ✓\n${r.project}／${r.stage}：${r.percent}%\n案件整體：${r.overall}%`, [
    { label: '再回報一筆', text: '回報進度' },
  ])])
}

async function flowMyProjects(uid: string, token: string) {
  const projects = await listProjects(uid, null, 30)
  if (!projects.length) return reply(token, [text('目前沒有「進行中」的案件。')])
  const lines = projects.map((p) => `・${p.name}  ${p.overall_percent}%（${daysAgo(p.last_report_at)}）`)
  const more = projects[0].total > projects.length ? `\n…還有 ${projects[0].total - projects.length} 件，請到網頁版查看` : ''
  await reply(token, [text(`進行中案件 ${projects[0].total} 件\n\n${lines.join('\n')}${more}`, [{ label: '回報進度', text: '回報進度' }])])
}

type Summary = {
  overdue_count?: number; overdue_sum?: number; month_due_count?: number; month_due_sum?: number; month_received?: number
  overdue_items?: { project: string; label: string; remaining: number; due_date: string }[]
  payable_unpaid_sum?: number; payable_week_items?: { vendor: string; remaining: number; due_date: string }[]
}

async function flowReceivables(uid: string, token: string) {
  const s = await rpc<Summary>('line_money_summary', { _line_user_id: uid })
  if (s.overdue_count === undefined) return reply(token, [text('本店沒有開啟收款模組。')])
  const lines = [
    `逾期未收　${s.overdue_count} 筆　共 ${money(s.overdue_sum)}`,
    `本月待收　${s.month_due_count} 筆　共 ${money(s.month_due_sum)}`,
    `本月已收　　　　共 ${money(s.month_received)}`,
  ]
  if (s.overdue_items?.length) {
    lines.push('', '逾期明細：')
    for (const it of s.overdue_items) lines.push(`・${it.project}／${it.label} ${money(it.remaining)}（${it.due_date.slice(5)} 到期）`)
  }
  lines.push('', '要登記收款請到網頁版「收款管理」。')
  await reply(token, [text(lines.join('\n'))])
}

async function flowPayables(uid: string, token: string) {
  const s = await rpc<Summary>('line_money_summary', { _line_user_id: uid })
  if (s.payable_unpaid_sum === undefined) return reply(token, [text('本店沒有開啟支出與付款模組。')])
  const lines = [`應付未付共 ${money(s.payable_unpaid_sum)}`]
  if (s.payable_week_items?.length) {
    lines.push('', '7 天內要付：')
    for (const it of s.payable_week_items) lines.push(`・${it.vendor} ${money(it.remaining)}（${it.due_date.slice(5)}）`)
  } else {
    lines.push('7 天內沒有到期的應付款。')
  }
  await reply(token, [text(lines.join('\n'))])
}

// Expense: [photo] → amount → project → category → saved
async function askAmount(uid: string, token: string, photoPath: string | null, lead = '收到單據照片。', keep: Record<string, unknown> = {}) {
  await rpc('line_pending_set', { _line_user_id: uid, _kind: 'expense_amount', _data: { ...keep, photo_path: photoPath } })
  await reply(token, [text(photoPath ? `${lead}\n請輸入金額（例如 1250 或 3.5萬）` : '請輸入金額（例如 1250 或 3.5萬）\n也可以直接傳收據照片。', [
    { label: '取消', text: '取消' },
  ])])
}

async function askExpenseProject(uid: string, token: string, data: Record<string, unknown>) {
  await rpc('line_pending_set', { _line_user_id: uid, _kind: 'expense_project', _data: data })
  const projects = await listProjects(uid)
  const items = projectItems(projects, 'exp')
  items.push({ label: '公司支出（不歸案件）', data: 'a=exp_proj&p=none' }, { label: '取消', text: '取消' })
  const hint = projects.length && projects[0].total > projects.length
    ? `\n\n列出最近動過的 ${projects.length} 件（進行中共 ${projects[0].total} 件）。\n${SEARCH_HINT}`
    : `\n\n${SEARCH_HINT}`
  await reply(token, [text(`金額 ${money(data.amount as number)}，記在哪個案件？${hint}`, items)])
}

// 記帳選好案件：辨識時已確認過類別就直接寫入，否則問類別
async function chooseExpenseProject(uid: string, token: string, data: Record<string, unknown>, projectId: string | null, projectName: string | null) {
  const next: Record<string, unknown> = { ...data, project_id: projectId, project_name: projectName }
  if (next.category) return saveExpense(uid, token, next, next.category as string)
  return askExpenseCategory(uid, token, next)
}

async function askExpenseCategory(uid: string, token: string, data: Record<string, unknown>) {
  await rpc('line_pending_set', { _line_user_id: uid, _kind: 'expense_category', _data: data })
  await reply(token, [text('什麼類別？', [
    ...CATEGORIES.map(([code, label]) => ({ label, data: `a=exp_cat&c=${code}` })),
    { label: '取消', text: '取消' },
  ])])
}

async function saveExpense(uid: string, token: string, data: Record<string, unknown>, category: string) {
  const description = [data.vendor_name, data.summary].filter(Boolean).join(' ') || (data.photo_path ? 'LINE 拍照記帳' : 'LINE 記帳')
  const saved = await rpc<{ id: string; invoice: { deductible: boolean; note: string | null; tax: number } | null }>('line_create_expense', {
    _line_user_id: uid,
    _project_id: data.project_id ?? null,
    _amount: data.amount,
    _category: category,
    _description: description,
    _photo_path: data.photo_path ?? null,
    _expense_date: data.expense_date ?? null,
    _vendor_name: data.vendor_name ?? null,
    _receipt_no: data.receipt_no ?? null,
    _seller_tax_id: data.seller_tax_id ?? null,
    _ocr: data.ocr ?? null,
  })
  await rpc('line_pending_clear', { _line_user_id: uid })
  const when = data.expense_date ? `（${String(data.expense_date).slice(5).replace('-', '/')}）` : ''
  const inv = saved?.invoice
  const invLine = inv
    ? `\n進項發票已登記：${inv.deductible ? `可扣抵，稅額 ${money(inv.tax)}` : `不可扣抵${inv.note ? `（${inv.note}）` : ''}`}`
    : ''
  await reply(token, [text(`已記帳 ✓\n${description}${when}\n${money(data.amount as number)}　${CATEGORY_LABEL[category] ?? category}　${data.project_name ?? '公司支出'}${invLine}`, [
    { label: '再記一筆', text: '拍照記帳' },
  ])])
}

async function savePhoto(ctx: Ctx, messageId: string): Promise<{ path: string; bytes: Uint8Array; type: string }> {
  const res = await fetch(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
    headers: { Authorization: `Bearer ${ACCESS_TOKEN}` },
  })
  if (!res.ok) throw new Error(`content ${res.status}`)
  const type = res.headers.get('content-type') ?? 'image/jpeg'
  const ext = type.includes('png') ? 'png' : 'jpg'
  const month = new Date().toISOString().slice(0, 7)
  const path = `${ctx.tenant_id}/${month}/${crypto.randomUUID()}.${ext}`
  const bytes = new Uint8Array(await res.arrayBuffer())
  const { error } = await sb.storage.from(PHOTO_BUCKET).upload(path, bytes, { contentType: type })
  if (error) throw new Error(error.message)
  return { path, bytes, type }
}

// ── AI 拍照記帳（module:ai_ocr）──
// 照片 → 辨識 → 使用者確認（正確／改金額／改類別）→ 選案件 → 寫入

async function flowPhoto(uid: string, token: string, ctx: Ctx, messageId: string) {
  const photo = await savePhoto(ctx, messageId)
  if (!(await rpc<boolean>('line_has_module', { _line_user_id: uid, _key: 'ai_ocr' }))) return askAmount(uid, token, photo.path)

  const r = await recognizeReceipt(photo.bytes, photo.type).catch((e) => { console.error('ocr failed', String(e)); return null })
  if (r === 'not_receipt') return askAmount(uid, token, photo.path, '這張看起來不像單據，照片已先存起來。')
  if (!r?.amount) return askAmount(uid, token, photo.path, '收到單據照片，但看不清楚金額。')

  const data = {
    photo_path: photo.path,
    amount: r.amount,
    expense_date: r.date,
    vendor_name: r.vendor,
    receipt_no: r.receipt_no,
    seller_tax_id: r.seller_tax_id,
    summary: r.summary,
    category: r.category,
    ocr: r,
  }
  const dup = r.receipt_no ? await rpc<{ amount: number; expense_date: string; project: string | null } | null>('line_find_receipt', { _line_user_id: uid, _receipt_no: r.receipt_no }) : null
  return askOcrConfirm(uid, token, data, dup)
}

async function askOcrConfirm(
  uid: string, token: string, data: Record<string, unknown>,
  dup: { amount: number; expense_date: string; project: string | null } | null = null,
) {
  await rpc('line_pending_set', { _line_user_id: uid, _kind: 'expense_confirm', _data: data })
  const ocr = data.ocr as { source?: string } | undefined
  const src = ocr?.source?.startsWith('qr') ? '電子發票' : 'AI 辨識'
  const lines = [`辨識結果（${src}）`]
  if (data.vendor_name || data.summary) lines.push([data.vendor_name, data.summary].filter(Boolean).join('　'))
  if (data.expense_date) lines.push(`日期　${data.expense_date}`)
  lines.push(`金額　${money(data.amount as number)}`)
  if (data.receipt_no) lines.push(`發票　${data.receipt_no}`)
  lines.push(`類別　${data.category ? `${CATEGORY_LABEL[data.category as string]}（建議）` : '待選'}`)
  if (dup) {
    lines.push('', `⚠ 這張發票已經記過：${money(dup.amount)}，${dup.expense_date}，${dup.project ?? '公司支出'}`)
    return reply(token, [text(lines.join('\n'), [{ label: '仍要記帳', data: 'a=ocr_ok' }, { label: '取消', text: '取消' }])])
  }
  lines.push('', '內容正確嗎？')
  await reply(token, [text(lines.join('\n'), [
    { label: '正確', data: 'a=ocr_ok' },
    { label: '改金額', data: 'a=ocr_amt' },
    { label: '改類別', data: 'a=ocr_cat' },
    { label: '取消', text: '取消' },
  ])])
}

// ── event router ──

// deno-lint-ignore no-explicit-any
async function handle(ev: any) {
  const uid: string | undefined = ev.source?.userId
  const token: string | undefined = ev.replyToken
  if (!uid || ev.source?.type !== 'user') {
    if (token) await reply(token, [text('LINE 助手只支援一對一聊天，請直接私訊官方帳號。')])
    return
  }

  const ctx = await getCtx(uid)
  await sb.from('line_events').insert({
    line_user_id: uid, tenant_id: ctx?.tenant_id ?? null, event_type: ev.type,
    payload: { type: ev.type, message: ev.message ? { type: ev.message.type, text: ev.message.text } : undefined, postback: ev.postback?.data },
  })
  if (!token) return

  if (ev.type === 'follow') {
    return reply(token, [text(ctx ? `歡迎回來，${ctx.tenant_name}。\n\n${HELP}` : `歡迎使用工程 LINE 助手。\n\n${BIND_HELP}`)])
  }

  // Binding code works whether or not already bound (re-bind)
  if (ev.type === 'message' && ev.message.type === 'text') {
    const m = String(ev.message.text).trim().match(/^(?:綁定\s*)?(\d{6})$/)
    if (m) {
      const r = await rpc<{ ok: boolean; reason?: string; tenant_name?: string; display_name?: string }>('line_bind', {
        _line_user_id: uid, _code: m[1], _display_name: await lineDisplayName(uid),
      })
      if (!r.ok) return reply(token, [text(r.reason === 'module_off' ? '這個店鋪沒有開啟 LINE 助手。' : '綁定碼錯誤或已過期（15 分鐘有效），請到網頁重新產生。')])
      return reply(token, [text(`綁定成功 ✓\n${r.tenant_name}／${r.display_name ?? ''}\n\n${HELP}`)])
    }
  }

  if (!ctx) return reply(token, [text(BIND_HELP)])

  if (ev.type === 'postback') {
    const q = new URLSearchParams(ev.postback.data)
    const a = q.get('a')
    if (a === 'proj') return flowStages(uid, token, q.get('p')!)
    if (a === 'stage') return flowPercent(token, q.get('s')!)
    if (a === 'pct') return flowReport(uid, token, q.get('s')!, Number(q.get('v')))
    if (a === 'ocr_ok' || a === 'ocr_amt' || a === 'ocr_cat' || a === 'ocr_setcat') {
      const pending = (await rpc<{ kind: string; data: Record<string, unknown> }[]>('line_pending_get', { _line_user_id: uid }))[0]
      if (pending?.kind !== 'expense_confirm') return reply(token, [text('這筆記帳已逾時，請重新傳照片。')])
      if (a === 'ocr_ok') return askExpenseProject(uid, token, pending.data)
      if (a === 'ocr_amt') {
        const { amount: _old, ...keep } = pending.data
        return askAmount(uid, token, (keep.photo_path as string) ?? null, `原本辨識 ${money(_old as number)}。`, keep)
      }
      if (a === 'ocr_cat') {
        return reply(token, [text('改成什麼類別？', [
          ...CATEGORIES.map(([code, label]) => ({ label, data: `a=ocr_setcat&c=${code}` })),
          { label: '取消', text: '取消' },
        ])])
      }
      return askOcrConfirm(uid, token, { ...pending.data, category: q.get('c') ?? 'other' })
    }
    if (a === 'exp_proj' || a === 'exp_cat') {
      const pending = (await rpc<{ kind: string; data: Record<string, unknown> }[]>('line_pending_get', { _line_user_id: uid }))[0]
      if (!pending || pending.data.amount === undefined) return reply(token, [text('這筆記帳已逾時，請重新開始。', [{ label: '拍照記帳', text: '拍照記帳' }])])
      if (a === 'exp_proj') {
        const p = q.get('p')
        if (!p || p === 'none') return chooseExpenseProject(uid, token, pending.data, null, null)
        // 只查得到本店案件（line_create_expense 寫入時也會再驗證一次）
        const hit = (await rpc<{ id: string; name: string }[]>('line_project_by_id', { _line_user_id: uid, _project_id: p }))[0]
        if (!hit) return reply(token, [text('找不到這個案件，可能已被刪除。')])
        return chooseExpenseProject(uid, token, pending.data, p, hit.name)
      }
      return saveExpense(uid, token, pending.data, q.get('c') ?? 'other')
    }
    return reply(token, [text(HELP)])
  }

  if (ev.type === 'message' && ev.message.type === 'image') {
    return flowPhoto(uid, token, ctx, ev.message.id)
  }

  if (ev.type === 'message' && ev.message.type === 'text') {
    const t = String(ev.message.text).trim()
    if (t === '取消') {
      await rpc('line_pending_clear', { _line_user_id: uid })
      return reply(token, [text('已取消。')])
    }
    const pending = (await rpc<{ kind: string; data: Record<string, unknown> }[]>('line_pending_get', { _line_user_id: uid }))[0]
    const isCommand = MENU_COMMANDS.includes(t)
    // 選案件的步驟打字 → 關鍵字找案件
    if (!isCommand && (pending?.kind === 'report_project' || pending?.kind === 'expense_project')) {
      return searchProjects(uid, token, t, pending.kind === 'report_project' ? 'report' : 'exp', pending.data)
    }
    if (isCommand && pending) await rpc('line_pending_clear', { _line_user_id: uid })
    else if (pending?.kind === 'expense_amount') {
      const amount = parseAmount(t)
      if (amount && amount > 0) return askExpenseProject(uid, token, { ...pending.data, amount })
      if (!isCommand) {
        return reply(token, [text('看不懂這個金額，請只輸入數字（例如 1250）。', [{ label: '取消', text: '取消' }])])
      }
      await rpc('line_pending_clear', { _line_user_id: uid })
    }
    switch (t) {
      case '回報進度': return flowProjects(uid, token)
      case '我的案子': return flowMyProjects(uid, token)
      case '拍照記帳': return askAmount(uid, token, null)
      case '收款狀況': return flowReceivables(uid, token)
      case '付款提醒': return flowPayables(uid, token)
      case '問一下': return reply(token, [text('「問一下」即將推出，之後可以直接問「中山路那案還欠我多少」。')])
    }
    return reply(token, [text(HELP, [
      { label: '回報進度', text: '回報進度' }, { label: '拍照記帳', text: '拍照記帳' },
      { label: '收款狀況', text: '收款狀況' }, { label: '付款提醒', text: '付款提醒' },
    ])])
  }
}

const ERROR_TEXT: Record<string, string> = {
  module_off: '本店沒有開啟這個功能。',
  not_found: '找不到這筆資料，可能已被刪除。',
  not_bound: BIND_HELP,
  bad_amount: '金額不正確。',
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('ok')
  if (!CHANNEL_SECRET || !ACCESS_TOKEN) return new Response('LINE secrets not configured', { status: 503 })
  const body = await req.text()
  if (!(await verifySignature(body, req.headers.get('x-line-signature')))) return new Response('bad signature', { status: 401 })

  const payload = JSON.parse(body)
  for (const ev of payload.events ?? []) {
    try {
      await handle(ev)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('event failed', msg)
      if (ev.replyToken) {
        const key = Object.keys(ERROR_TEXT).find((k) => msg.includes(k))
        await reply(ev.replyToken, [text(key ? ERROR_TEXT[key] : '系統忙碌，請稍後再試。')]).catch(() => {})
      }
    }
  }
  return new Response('ok')
})
