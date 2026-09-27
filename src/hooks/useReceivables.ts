import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Receivable, Receipt } from '@/types/database'

export function useReceivables(projectId?: string) {
  return useQuery({
    queryKey: ['receivables', projectId],
    queryFn: async () => {
      let q = supabase
        .from('receivables')
        .select('*, project:projects(id, name)')
        .order('created_at', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
      const { data, error } = await q
      if (error) throw error
      return data as Receivable[]
    },
  })
}

export function useReceipts(receivableId?: string) {
  return useQuery({
    queryKey: ['receipts', receivableId],
    enabled: !!receivableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('receivable_id', receivableId!)
        .order('received_date', { ascending: false })
      if (error) throw error
      return data as Receipt[]
    },
  })
}

export function useCreateReceivable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      project_id: string
      label: string
      amount: number
      due_date?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.from('receivables').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivables'] }),
  })
}

export function useUpdateReceivable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Receivable> & { id: string }) => {
      const { data, error } = await supabase.from('receivables').update(input as never).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivables'] }),
  })
}

export function useDeleteReceivable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receivables').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['receivables'] }),
  })
}

// ── Receipts ──

export function useCreateReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      receivable_id: string
      received_date?: string
      amount: number
      method?: string
      reference_no?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.from('receipts').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
    },
  })
}

export function useDeleteReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('receipts').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['receipts'] })
      qc.invalidateQueries({ queryKey: ['receivables'] })
    },
  })
}
