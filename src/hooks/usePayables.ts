import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Payable, Payment } from '@/types/database'

export function usePayables(projectId?: string) {
  return useQuery({
    queryKey: ['payables', projectId],
    queryFn: async () => {
      let q = supabase
        .from('payables')
        .select('*, project:projects(id, name)')
        .order('created_at', { ascending: false })
      if (projectId) q = q.eq('project_id', projectId)
      const { data, error } = await q
      if (error) throw error
      return data as Payable[]
    },
  })
}

export function usePayments(payableId?: string) {
  return useQuery({
    queryKey: ['payments', payableId],
    enabled: !!payableId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('payable_id', payableId!)
        .order('paid_date', { ascending: false })
      if (error) throw error
      return data as Payment[]
    },
  })
}

export function useCreatePayable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      project_id?: string
      vendor_name: string
      description?: string
      amount: number
      due_date?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.from('payables').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useUpdatePayable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...input }: Partial<Payable> & { id: string }) => {
      const { data, error } = await supabase.from('payables').update(input as never).eq('id', id).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useDeletePayable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payables').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payables'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

// ── Payments ──

export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      payable_id: string
      paid_date?: string
      amount: number
      method?: string
      reference_no?: string
      notes?: string
    }) => {
      const { data, error } = await supabase.from('payments').insert(input as never).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payables'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}

export function useDeletePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('payments').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payables'] })
      qc.invalidateQueries({ queryKey: ['finance-summary'] })
    },
  })
}
