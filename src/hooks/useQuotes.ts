import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Quote, QuoteItem } from '@/types/database'

export function useQuotes(projectId?: string) {
  return useQuery({
    queryKey: ['quotes', projectId],
    queryFn: async () => {
      let q = supabase
        .from('quotes')
        .select('*, project:projects(id, name)')
        .filter('is_latest', 'eq', true) // 列表只顯示最新版本；舊版本從報價單內頁查閱
        .order('created_at', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
      const { data, error } = await q
      if (error) throw error
      return data as unknown as Quote[]
    },
  })
}

export function useQuote(id?: string) {
  return useQuery({
    queryKey: ['quotes', 'detail', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*, project:projects(id, name)')
        .eq('id', id!)
        .single()
      if (error) throw error
      return data as unknown as Quote
    },
  })
}

export function useQuoteItems(quoteId?: string) {
  return useQuery({
    queryKey: ['quote_items', quoteId],
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId!)
        .order('sort_order')
      if (error) throw error
      return data as QuoteItem[]
    },
  })
}

export function useCreateQuote() {
  const qc = useQueryClient()
  return useMutation({
    // 編號與名稱不填時由資料庫自動給（Q年月-流水號、「案名 報價」）
    mutationFn: async (input: {
      project_id: string
      title?: string
      quote_no?: string
      quote_date?: string
      valid_until?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.from('quotes').insert(input as never).select().single()
      if (error) throw error
      return data as Quote
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useUpdateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Quote> & { id: string }) => {
      const { data, error } = await supabase.from('quotes').update(input as never).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

export function useDeleteQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      // 刪掉最新版本時，要把上一版設回「最新」，否則整份報價會從列表消失
      const { data: q } = await supabase.from('quotes').select('is_latest, parent_quote_id').eq('id', id).single()
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
      if (q?.is_latest && q.parent_quote_id) {
        await supabase.from('quotes').update({ is_latest: true } as never).eq('id', q.parent_quote_id)
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}

/** 以既有報價單為範本，複製全部品項，開一張新單號的報價單 */
export function useDuplicateQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (sourceId: string) => {
      const { data: src, error: e1 } = await supabase.from('quotes').select('*').eq('id', sourceId).single()
      if (e1 || !src) throw e1 ?? new Error('找不到報價單')
      const s = src as unknown as Quote & { tax_rate?: number; mgmt_rate?: number }
      const { data: created, error: e2 } = await supabase.from('quotes').insert({
        project_id: s.project_id,
        title: `${s.title}（複製）`,
        notes: s.notes,
        tax_rate: s.tax_rate ?? 5,
        mgmt_rate: s.mgmt_rate ?? 0,
      } as never).select().single()
      if (e2 || !created) throw e2 ?? new Error('建立失敗')
      const newId = (created as Quote).id
      const { data: items, error: e3 } = await supabase.from('quote_items').select('*').eq('quote_id', sourceId).order('sort_order')
      if (e3) throw e3
      if (items && items.length) {
        const rows = (items as QuoteItem[]).map(i => ({
          quote_id: newId, description: i.description, unit: i.unit, quantity: i.quantity,
          unit_price: i.unit_price, amount: i.amount, sort_order: i.sort_order, notes: i.notes,
        }))
        const { error: e4 } = await supabase.from('quote_items').insert(rows as never)
        if (e4) { await supabase.from('quotes').delete().eq('id', newId); throw e4 }
      }
      return newId
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['quotes'] }); qc.invalidateQueries({ queryKey: ['quote_items'] }) },
  })
}

// ── Quote Items ──

export function useCreateQuoteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      quote_id: string
      description: string
      unit?: string
      quantity?: number
      unit_price?: number
      amount?: number
      sort_order?: number
    }) => {
      const { data, error } = await supabase.from('quote_items').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: ['quote_items', v.quote_id] }),
  })
}

export function useUpdateQuoteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<QuoteItem> & { id: string }) => {
      const { data, error } = await supabase.from('quote_items').update(input as never).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote_items'] }),
  })
}

export function useDeleteQuoteItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quote_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quote_items'] }),
  })
}

/** 總額由資料庫在品項變動時自動重算；這裡只保險地再觸發一次並刷新畫面 */
export function useRecalcQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { error } = await (supabase.rpc as unknown as (
        fn: string, args: Record<string, unknown>
      ) => Promise<{ error: Error | null }>)('recalc_quote_totals', { _quote_id: quoteId })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}
