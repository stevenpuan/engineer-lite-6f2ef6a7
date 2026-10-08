import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'

// rpc_team_* 比產生的型別新
const db = supabase as unknown as SupabaseClient

export interface TeamUser {
  user_id: string
  email: string
  display_name: string | null
  role: 'owner' | 'assistant'
  is_active: boolean
  created_at: string
  is_me: boolean
}
export interface TeamInfo {
  max_users: number | null
  active_count: number
  users: TeamUser[]
}

export function useTeam() {
  return useQuery({
    queryKey: ['team'],
    queryFn: async () => {
      const { data, error } = await db.rpc('rpc_team_info')
      if (error) throw error
      return data as TeamInfo
    },
  })
}

function useTeamMutation<T extends Record<string, unknown>>(fn: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (args: T) => {
      const { data, error } = await db.rpc(fn, args)
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['team'] }),
  })
}

export const useTeamCreateUser = () =>
  useTeamMutation<{ _email: string; _password: string; _display_name: string | null; _role: string }>('rpc_team_create_user')
export const useTeamSetActive = () => useTeamMutation<{ _user_id: string; _active: boolean }>('rpc_team_set_active')
export const useTeamSetRole = () => useTeamMutation<{ _user_id: string; _role: string }>('rpc_team_set_role')
export const useTeamResetPassword = () => useTeamMutation<{ _user_id: string; _password: string }>('rpc_team_reset_password')

export function teamErrorText(err: unknown): string {
  const m = (err as { message?: string })?.message ?? ''
  if (m.startsWith('user_limit_reached')) return `已達帳號上限（${m.split(':')[1]} 個），請停用其他帳號或聯絡平台調整`
  if (m.includes('email_exists')) return '這個 Email 已經有帳號了'
  if (m.includes('password_too_short')) return '密碼至少要 8 個字'
  if (m.includes('cannot_change_self')) return '不能修改自己的帳號'
  if (m.includes('Not authorized')) return '只有老闆可以管理帳號'
  return m || '操作失敗'
}
