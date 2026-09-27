import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Expense } from '@/types/database'

/** 伺服器每次最多回 1000 筆；列表頁用期間篩選避免被截斷 */
export const EXPENSE_ROW_LIMIT = 1000

export function useExpenses(projectId?: string, since?: string) {
  return useQuery({
    queryKey: ['expenses', projectId, since],
    queryFn: async () => {
      let q = supabase
        .from('expenses')
        .select('*, project:projects(id, name)')
        .order('expense_date', { ascending: false })
        .limit(EXPENSE_ROW_LIMIT)
      if (projectId) q = q.eq('project_id', projectId)
      if (since) q = q.gte('expense_date', since)
      const { data, error } = await q
      if (error) throw error
      return data as Expense[]
    },
  })
}

export function useCreateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      project_id?: string
      expense_date?: string
      category: string
      description: string
      amount: number
      vendor_name?: string
      receipt_no?: string
      payment_method?: string
      is_overhead?: boolean
      notes?: string
    }) => {
      const { data, error } = await supabase.from('expenses').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useUpdateExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Expense> & { id: string }) => {
      const { data, error } = await supabase.from('expenses').update(input as never).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}

export function useDeleteExpense() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expenses').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expenses'] }),
  })
}
