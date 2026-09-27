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
      return data as Quote[]
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
      return data as Quote
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
    mutationFn: async (input: {
      project_id: string
      title: string
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
      const { error } = await supabase.from('quotes').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
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

/** Recalculate quote totals from items */
export function useRecalcQuote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data: items, error: e1 } = await supabase
        .from('quote_items')
        .select('amount')
        .eq('quote_id', quoteId)
      if (e1) throw e1
      const subtotal = (items ?? []).reduce((s, i) => s + Number(i.amount), 0)
      const tax = Math.round(subtotal * 0.05)
      const total = subtotal + tax
      const { error: e2 } = await supabase
        .from('quotes')
        .update({ subtotal, tax, total })
        .eq('id', quoteId)
      if (e2) throw e2
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['quotes'] }),
  })
}
