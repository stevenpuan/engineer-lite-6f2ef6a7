import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// line_bindings is newer than the generated Database types
const db = supabase as unknown as SupabaseClient

export interface LineBinding {
  id: string
  tenant_id: string
  user_id: string
  line_user_id: string | null
  line_display_name: string | null
  bind_code: string | null
  code_expires_at: string | null
  bound_at: string | null
}

/** The signed-in user's own binding (RLS returns only their row) */
export function useLineBinding(pollWhileWaiting = false) {
  return useQuery({
    queryKey: ['line-binding'],
    queryFn: async () => {
      const { data, error } = await db.from('line_bindings').select('*').maybeSingle()
      if (error) throw error
      return data as LineBinding | null
    },
    refetchInterval: pollWhileWaiting ? 4000 : false,
  })
}

export function useNewBindCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await db.rpc('rpc_line_new_bind_code')
      if (error) throw error
      return data as string
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['line-binding'] }),
  })
}

export function useUnbindLine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc('rpc_line_unbind')
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['line-binding'] }),
  })
}
