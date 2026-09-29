import type { Quote, QuoteItem } from '@/types/database'

/** 產生報價單 Excel（金額用公式，客戶改數量會自動重算） */
export async function exportQuoteExcel(quote: Quote, items: QuoteItem[], taxRate: number) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('報價單')
  const font = { name: 'Arial', size: 11 }
  ws.columns = [
    { width: 6 }, { width: 40 }, { width: 8 }, { width: 10 }, { width: 14 }, { width: 16 },
  ]
  ws.mergeCells('A1:F1')
  ws.getCell('A1').value = quote.title
  ws.getCell('A1').font = { ...font, size: 16, bold: true }
  ws.getCell('A1').alignment = { horizontal: 'center' }
  const project = (quote.project as { name: string } | null)?.name ?? ''
  const info: [string, string][] = [
    ['報價編號', quote.quote_no ?? ''],
    ['案件', project],
    ['報價日期', quote.quote_date ?? ''],
    ['有效期限', quote.valid_until ?? ''],
  ]
  info.forEach(([k, v], i) => {
    const r = ws.getRow(3 + i)
    r.getCell(1).value = k
    ws.mergeCells(3 + i, 2, 3 + i, 6)
    r.getCell(2).value = v
    r.font = font
  })
  const head = 8
  const hr = ws.getRow(head)
  ;['項次', '品項說明', '單位', '數量', '單價', '金額'].forEach((h, i) => { hr.getCell(i + 1).value = h })
  hr.font = { ...font, bold: true }
  hr.eachCell(c => {
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCE8F5' } }
    c.alignment = { horizontal: 'center' }
  })
  const border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } as const
  items.forEach((it, i) => {
    const n = head + 1 + i
    const r = ws.getRow(n)
    r.values = [i + 1, it.description, it.unit ?? '', Number(it.quantity), Number(it.unit_price)]
    r.getCell(6).value = { formula: `ROUND(D${n}*E${n},0)`, result: Number(it.amount) }
    r.font = font
  })
  const first = head + 1
  const last = head + Math.max(items.length, 1)
  for (let n = head; n <= last; n++) {
    for (let c = 1; c <= 6; c++) ws.getCell(n, c).border = border
  }
  const money = '"$"#,##0;("$"#,##0);"-"'
  for (let n = first; n <= last; n++) {
    ws.getCell(n, 4).numFmt = '#,##0.##'
    ws.getCell(n, 5).numFmt = money
    ws.getCell(n, 6).numFmt = money
  }
  const s = last + 2
  const rows: [string, { formula: string; result: number } | number][] = [
    ['小計', { formula: `SUM(F${first}:F${last})`, result: Number(quote.subtotal) }],
    ['稅率', taxRate / 100],
    [taxRate === 0 ? '稅額（免稅）' : '稅額', { formula: `ROUND(F${s}*F${s + 1},0)`, result: Number(quote.tax) }],
    ['合計', { formula: `F${s}+F${s + 2}`, result: Number(quote.total) }],
  ]
  rows.forEach(([k, v], i) => {
    const r = ws.getRow(s + i)
    r.getCell(5).value = k
    r.getCell(6).value = v
    r.getCell(6).numFmt = i === 1 ? '0%' : money
    r.font = { ...font, bold: i === 3 }
  })
  if (quote.notes) {
    const n = s + 5
    ws.getCell(n, 1).value = '備註'
    ws.mergeCells(n, 2, n, 6)
    ws.getCell(n, 2).value = quote.notes
    ws.getCell(n, 2).alignment = { wrapText: true, vertical: 'top' }
  }
  const buf = await wb.xlsx.writeBuffer()
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `${quote.quote_no ?? '報價單'}_${quote.title}${(quote.version ?? 1) > 1 ? `_v${quote.version}` : ''}.xlsx`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
