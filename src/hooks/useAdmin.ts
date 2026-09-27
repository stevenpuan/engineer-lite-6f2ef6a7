import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { TenantListItem, TenantUser, TenantModuleItem } from '@/types/database'

// ── Tenants ──

export function useAdminTenants() {
  return useQuery({
    queryKey: ['admin', 'tenants'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pa_tenant_list')
      if (error) throw error
      return data as TenantListItem[]
    },
  })
}

export function useCreateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      _name: string
      _display_name?: string
      _tax_id?: string
      _industry?: string
      _notes?: string
    }) => {
      const { data, error } = await supabase.rpc('pa_create_tenant', input)
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  })
}

export function useUpdateTenant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      _id: string
      _name?: string
      _display_name?: string
      _tax_id?: string
      _industry?: string
      _status?: string
      _notes?: string
    }) => {
      const { data, error } = await supabase.rpc('pa_update_tenant', input)
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'tenants'] }),
  })
}

// ── Users ──

export function useAdminTenantUsers(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'tenant-users', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pa_tenant_users', { _tenant_id: tenantId! })
      if (error) throw error
      return data as unknown as TenantUser[]
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      _tenant_id: string
      _email: string
      _password: string
      _display_name?: string
      _role?: string
    }) => {
      const { data, error } = await supabase.rpc('pa_create_user', input)
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenant-users', vars._tenant_id] })
      qc.invalidateQueries({ queryKey: ['admin', 'tenants'] })
    },
  })
}

export function useUpdateUserRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { _user_id: string; _role: string }) => {
      const { data, error } = await supabase.rpc('pa_update_user_role', input)
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

export function useToggleUserActive() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { _user_id: string; _active: boolean }) => {
      const { data, error } = await supabase.rpc('pa_toggle_user_active', input)
      if (error) throw error
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin'] }),
  })
}

// ── Modules ──

export function useAdminTenantModules(tenantId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'tenant-modules', tenantId],
    enabled: !!tenantId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('pa_tenant_modules', { _tenant_id: tenantId! })
      if (error) throw error
      return data as unknown as TenantModuleItem[]
    },
  })
}

export function useToggleModule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { _tenant_id: string; _module_key: string; _enabled: boolean }) => {
      const { data, error } = await supabase.rpc('pa_toggle_module', input)
      if (error) throw error
      return data
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ['admin', 'tenant-modules', vars._tenant_id] })
    },
  })
}
