import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { PriceBookItem, DashboardMonth } from '@/types/database'

// Newer than the generated Database types
const db = supabase as unknown as SupabaseClient

// ── 常用單價庫（每家店自己的）──

export function usePriceBook() {
  return useQuery({
    queryKey: ['price-book'],
    queryFn: async () => {
      const { data, error } = await db.from('price_book').select('*').order('use_count', { ascending: false }).order('name')
      if (error) throw error
      return data as PriceBookItem[]
    },
    staleTime: 60_000,
  })
}

/** Remember name/unit/price after it is used in a quote */
export function useRememberPrice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { name: string; unit: string | null; unit_price: number }) => {
      const { error } = await db.rpc('rpc_price_book_remember', { _name: input.name, _unit: input.unit, _unit_price: input.unit_price })
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-book'] }),
  })
}

export function useUpdatePriceBookItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; unit?: string | null; unit_price?: number }) => {
      const { error } = await db.from('price_book').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-book'] }),
  })
}

export function useDeletePriceBookItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('price_book').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['price-book'] }),
  })
}

// ── 報價版本 ──

export function useQuoteNewVersion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (quoteId: string) => {
      const { data, error } = await db.rpc('rpc_quote_new_version', { _quote_id: quoteId })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['quotes'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

// ── 本月帳務（M6）──

export function useDashboardMonth() {
  return useQuery({
    queryKey: ['dashboard-month'],
    queryFn: async () => {
      const { data, error } = await db.rpc('rpc_dashboard_month')
      if (error) throw error
      return data as DashboardMonth
    },
    staleTime: 0,
  })
}

// ── 單據照片（LINE 拍照記帳）──

/** Short-lived link to a receipt photo in this 店鋪's own folder */
export async function openExpensePhoto(path: string) {
  const { data, error } = await db.storage.from('expense-photos').createSignedUrl(path, 300)
  if (error || !data?.signedUrl) throw error ?? new Error('無法開啟照片')
  window.open(data.signedUrl, '_blank', 'noopener')
}
