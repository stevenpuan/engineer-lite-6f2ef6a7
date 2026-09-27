// A5 AI 拍照記帳 (module:ai_ocr)
//
// 兩層辨識：
//   1. 電子發票證明聯左側 QR code（財政部格式，zxing-wasm 解碼）→ 發票號碼、日期、隨機碼、總計、統編，數字精確
//   2. Claude 看圖 → 店名、品項摘要、建議類別；沒有 QR 的傳統收據也靠這層讀金額與日期
// 辨識結果只是建議，webhook 一定要使用者按「正確」才寫入支出。
//
// Secret（選用）：ANTHROPIC_API_KEY；沒有設定時只做 QR 解碼。
import { readBarcodes } from 'npm:zxing-wasm@3.1.4/reader'
import { encodeBase64 } from 'jsr:@std/encoding@1/base64'

export type Receipt = {
  source: 'qr' | 'ai' | 'qr+ai'
  amount: number | null
  date: string | null // YYYY-MM-DD
  vendor: string | null
  receipt_no: string | null
  seller_tax_id: string | null
  summary: string | null
  category: string | null
  random_code?: string | null
}

const CATEGORY_CODES = ['material', 'labor', 'machinery', 'fuel', 'meal', 'transport', 'sundry', 'other']

// ── 1. 電子發票 QR ──

/** 財政部電子發票證明聯左側 QR：前 77 碼固定格式 */
export function parseEinvoiceQr(raw: string): Omit<Receipt, 'source' | 'vendor' | 'summary' | 'category'> | null {
  const m = raw.match(/^([A-Z]{2}\d{8})(\d{3})(\d{2})(\d{2})(\d{4})([0-9A-Fa-f]{8})([0-9A-Fa-f]{8})(\d{8})(\d{8})/)
  if (!m) return null
  const [, no, y, mo, d, rnd, , totalHex, , seller] = m
  const year = Number(y) + 1911
  const date = `${year}-${mo}-${d}`
  if (Number.isNaN(Date.parse(date))) return null
  return {
    amount: parseInt(totalHex, 16),
    date,
    receipt_no: no,
    seller_tax_id: seller === '00000000' ? null : seller,
    random_code: rnd,
  }
}

/** 找出圖中的電子發票左側 QR（證明聯有左右兩個 QR，右邊那個以 ** 開頭，略過） */
export async function readEinvoiceQr(bytes: Uint8Array) {
  const found = await readBarcodes(new Blob([bytes as Uint8Array<ArrayBuffer>]), { formats: ['QRCode'], tryHarder: true, maxNumberOfSymbols: 4 })
  for (const r of found) {
    const parsed = parseEinvoiceQr(r.text)
    if (parsed) return parsed
  }
  return null
}

// ── 2. Claude 看圖 ──

const PROMPT = `這是台灣工程行老闆用手機拍的單據（電子發票證明聯、收據、估價單或手寫單）。
請讀出以下欄位，只回傳 JSON，不要其他文字：
{
  "is_receipt": true/false,          // 不是單據（例如工地照片）就 false
  "vendor": "店家或公司名稱",          // 讀不到給 null
  "date": "YYYY-MM-DD",              // 民國年要換成西元（115年 = 2026年）；讀不到給 null
  "total": 1234,                     // 應付總金額（含稅總計），數字；讀不到給 null
  "invoice_no": "AB12345678",        // 電子發票號碼，兩個英文字母加 8 位數字，去掉連字號；沒有給 null
  "seller_tax_id": "12345678",       // 賣方統一編號 8 位數；沒有給 null
  "summary": "品項摘要",              // 20 字以內，例如「便當」「水泥 20 包」「加油 95 無鉛」
  "category": "meal"                 // 只能是 material 材料、labor 工資、machinery 機具租金、fuel 油資、meal 餐費、transport 運費、sundry 雜支、other 其他
}`

async function aiReadReceipt(bytes: Uint8Array, type: string) {
  const key = Deno.env.get('ANTHROPIC_API_KEY')
  if (!key) return null
  const mediaType = type.includes('png') ? 'image/png' : type.includes('webp') ? 'image/webp' : 'image/jpeg'
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal: AbortSignal.timeout(25_000),
    headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: Deno.env.get('OCR_MODEL') || 'claude-haiku-4-5',
      max_tokens: 400,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType, data: encodeBase64(bytes) } },
          { type: 'text', text: PROMPT },
        ],
      }],
    }),
  })
  if (!res.ok) {
    console.error('ocr ai failed', res.status, (await res.text()).slice(0, 300))
    return null
  }
  const body = await res.json()
  const txt: string = body?.content?.find((c: { type: string }) => c.type === 'text')?.text ?? ''
  const json = txt.match(/\{[\s\S]*\}/)?.[0]
  if (!json) return null
  try {
    const o = JSON.parse(json)
    if (o.is_receipt === false) return { not_receipt: true as const }
    const total = typeof o.total === 'number' ? o.total : Number(String(o.total ?? '').replace(/[^\d.]/g, ''))
    const no = typeof o.invoice_no === 'string' ? o.invoice_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase() : ''
    const tax = typeof o.seller_tax_id === 'string' ? o.seller_tax_id.replace(/\D/g, '') : ''
    return {
      amount: total > 0 ? Math.round(total) : null,
      date: typeof o.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(o.date) ? o.date : null,
      vendor: typeof o.vendor === 'string' && o.vendor.trim() ? o.vendor.trim().slice(0, 60) : null,
      receipt_no: /^[A-Z]{2}\d{8}$/.test(no) ? no : null,
      seller_tax_id: /^\d{8}$/.test(tax) ? tax : null,
      summary: typeof o.summary === 'string' && o.summary.trim() ? o.summary.trim().slice(0, 40) : null,
      category: CATEGORY_CODES.includes(o.category) ? o.category : null,
    }
  } catch {
    return null
  }
}

// ── 合併 ──

export async function recognizeReceipt(bytes: Uint8Array, type: string): Promise<Receipt | 'not_receipt' | null> {
  // AI 是網路 I/O，先發出去；QR 解碼吃 CPU，同時進行
  const aiPromise = aiReadReceipt(bytes, type).catch((e) => { console.error('ocr ai error', String(e)); return null })
  let qr: Awaited<ReturnType<typeof readEinvoiceQr>> = null
  try {
    qr = await readEinvoiceQr(bytes)
  } catch (e) {
    console.error('qr error', String(e))
  }
  const ai = await aiPromise
  if (ai && 'not_receipt' in ai && !qr) return 'not_receipt'
  const a = ai && !('not_receipt' in ai) ? ai : null
  if (!qr && !a) return null

  return {
    source: qr && a ? 'qr+ai' : qr ? 'qr' : 'ai',
    // QR 的數字是發票本身編碼的，優先採用
    amount: qr?.amount ?? a?.amount ?? null,
    date: qr?.date ?? a?.date ?? null,
    receipt_no: qr?.receipt_no ?? a?.receipt_no ?? null,
    seller_tax_id: qr?.seller_tax_id ?? a?.seller_tax_id ?? null,
    random_code: qr?.random_code ?? null,
    vendor: a?.vendor ?? null,
    summary: a?.summary ?? null,
    category: a?.category ?? null,
  }
}
