import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Expense } from '@/types/database'

export function useExpenses(projectId?: string) {
  return useQuery({
    queryKey: ['expenses', projectId],
    queryFn: async () => {
      let q = supabase
        .from('expenses')
        .select('*, project:projects(id, name)')
        .order('expense_date', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
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
