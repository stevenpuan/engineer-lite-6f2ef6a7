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

// ── 成員的 LINE 綁定（老闆管本店；平台管理員管任何店）──

export interface LineMember {
  user_id: string
  email: string | null
  display_name: string | null
  role: 'owner' | 'assistant'
  is_active: boolean
  line_display_name: string | null
  bound_at: string | null
  /** 尚未使用且未過期的綁定碼 */
  bind_code: string | null
  code_expires_at: string | null
}

export interface LineInvite {
  code: string
  expires_at: string
  display_name: string | null
  tenant_name: string | null
}

/** tenant：店老闆管理本店；platform：平台管理員指定店鋪 */
export type LineScope = { kind: 'tenant' } | { kind: 'platform'; tenantId: string }

const membersKey = (scope: LineScope) => ['line-members', scope.kind === 'platform' ? scope.tenantId : 'mine']

export function useLineMembers(scope: LineScope | null) {
  return useQuery({
    queryKey: scope ? membersKey(scope) : ['line-members', 'none'],
    enabled: !!scope,
    queryFn: async () => {
      const { data, error } = scope!.kind === 'platform'
        ? await db.rpc('pa_line_members', { _tenant_id: scope!.tenantId })
        : await db.rpc('rpc_line_members')
      if (error) throw error
      return (data ?? []) as LineMember[]
    },
  })
}

export function useIssueLineCode(scope: LineScope) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await db.rpc(scope.kind === 'platform' ? 'pa_line_issue_code' : 'rpc_line_issue_code', { _user_id: userId })
      if (error) throw error
      return data as LineInvite
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(scope) })
      qc.invalidateQueries({ queryKey: ['line-binding'] })
    },
  })
}

export function useUnbindMember(scope: LineScope) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await db.rpc(scope.kind === 'platform' ? 'pa_line_unbind' : 'rpc_line_unbind_member', { _user_id: userId })
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: membersKey(scope) })
      qc.invalidateQueries({ queryKey: ['line-binding'] })
    },
  })
}
