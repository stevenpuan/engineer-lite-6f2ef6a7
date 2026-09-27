import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { InvoiceDirection, InvoiceTaxType, TaxInvoice, TaxPeriodSummary } from '@/types/database'

// tax_invoices 比產生的型別新
const db = supabase as unknown as SupabaseClient

/** 營業稅期別：YYYY*100 + 單月（1,3,5,7,9,11） */
export function periodKeyOf(date: Date | string): number {
  const d = typeof date === 'string' ? new Date(date + 'T00:00:00') : date
  const m = d.getMonth() + 1
  return d.getFullYear() * 100 + Math.floor((m - 1) / 2) * 2 + 1
}
export function periodLabel(key: number): string {
  const y = Math.floor(key / 100), m = key % 100
  return `${y} 年 ${m}-${m + 1} 月`
}
export function currentPeriodKey(): number {
  return periodKeyOf(new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' })))
}
/** 含稅金額拆成未稅＋5% 稅額 */
export function splitTaxIncluded(total: number): { sales: number; tax: number } {
  const sales = Math.round(total / 1.05)
  return { sales, tax: total - sales }
}

export function useTaxInvoices(direction: InvoiceDirection, periodKey: number) {
  return useQuery({
    queryKey: ['tax-invoices', direction, periodKey],
    queryFn: async () => {
      const { data, error } = await db
        .from('tax_invoices')
        .select('*, project:projects(id, name)')
        .eq('direction', direction)
        .eq('period_key', periodKey)
        .order('invoice_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as TaxInvoice[]
    },
  })
}

export function useTaxSummary(year: number) {
  return useQuery({
    queryKey: ['tax-summary', year],
    queryFn: async () => {
      const { data, error } = await db.rpc('rpc_tax_summary', { _year: year })
      if (error) throw error
      return data as TaxPeriodSummary[]
    },
    staleTime: 0,
  })
}

export function useMyTaxId() {
  return useQuery({
    queryKey: ['my-tax-id'],
    queryFn: async () => {
      const { data, error } = await db.rpc('rpc_my_tenant_tax_id')
      if (error) throw error
      return (data as string | null) ?? null
    },
    staleTime: 5 * 60_000,
  })
}

export interface TaxInvoiceInput {
  direction: InvoiceDirection
  invoice_no: string | null
  invoice_date: string
  counterparty_name: string | null
  counterparty_tax_id: string | null
  buyer_tax_id?: string | null
  tax_type: InvoiceTaxType
  sales_amount: number
  tax_amount: number
  deductible?: boolean | null
  deduct_note?: string | null
  project_id?: string | null
  receivable_id?: string | null
  notes?: string | null
}

function invalidate(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['tax-invoices'] })
  qc.invalidateQueries({ queryKey: ['tax-summary'] })
}

export function useCreateTaxInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: TaxInvoiceInput) => {
      const row = { ...input, deductible: input.direction === 'in' ? (input.deductible ?? false) : null }
      const { error } = await db.from('tax_invoices').insert(row)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useUpdateTaxInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<TaxInvoice, 'deductible' | 'deduct_note' | 'status'>>) => {
      const { error } = await db.from('tax_invoices').update(patch).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useDeleteTaxInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('tax_invoices').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => invalidate(qc),
  })
}

export function useImportExpenseInvoices() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc('rpc_tax_import_expenses')
      if (error) throw error
      return data as number
    },
    onSuccess: () => invalidate(qc),
  })
}

/** 資料庫錯誤轉成看得懂的話 */
export function invoiceErrorText(err: unknown): string {
  const e = err as { code?: string; message?: string }
  if (e?.code === '23505') return '這張發票號碼已經登記過了'
  if (e?.code === '23514') {
    if (e.message?.includes('invoice_no')) return '發票號碼格式應為 2 個英文字母＋8 位數字，例如 AB12345678'
    if (e.message?.includes('tax_id')) return '統編應為 8 位數字'
    return '金額或欄位格式不正確'
  }
  return e?.message ?? '操作失敗'
}

/** 匯出 CSV（給記帳士） */
export function downloadInvoicesCsv(rows: TaxInvoice[], filename: string) {
  const head = ['類別', '發票號碼', '日期', '對象名稱', '對象統編', '買方統編', '課稅別', '未稅金額', '稅額', '合計', '可扣抵', '備註', '狀態', '案件']
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  const lines = rows.map(r => [
    r.direction === 'out' ? '銷項' : '進項', r.invoice_no, r.invoice_date, r.counterparty_name, r.counterparty_tax_id, r.buyer_tax_id,
    r.tax_type, r.sales_amount, r.tax_amount, r.total_amount,
    r.direction === 'in' ? (r.deductible ? '是' : '否') : '', r.deduct_note ?? r.notes, r.status === 'void' ? '作廢' : '有效', r.project?.name,
  ].map(esc).join(','))
  const blob = new Blob(['﻿' + [head.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
