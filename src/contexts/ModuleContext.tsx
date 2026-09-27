import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { useAuth } from './AuthContext'

type ModuleKey =
  | 'clients' | 'quote' | 'receivable' | 'payable'
  | 'progress' | 'dashboard' | 'line'
  | 'dispatch' | 'vendor_billing' | 'contract' | 'invoice'
  | 'site' | 'ai_ocr' | 'client_portal' | 'team'

interface ModuleState {
  modules: Record<string, boolean>
  hasModule: (key: ModuleKey) => boolean
  loading: boolean
}

const ModuleContext = createContext<ModuleState | undefined>(undefined)

export function ModuleProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth()
  const [modules, setModules] = useState<Record<string, boolean>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.tenant_id) {
      setModules({})
      setLoading(false)
      return
    }

    async function load() {
      const { data } = await supabase
        .from('tenant_modules')
        .select('module_key, enabled')
        .eq('tenant_id', profile!.tenant_id)

      const map: Record<string, boolean> = {}
      data?.forEach(m => { map[m.module_key] = m.enabled })
      setModules(map)
      setLoading(false)
    }
    load()
  }, [profile?.tenant_id])

  function hasModule(key: ModuleKey) {
    return modules[key] === true
  }

  return (
    <ModuleContext.Provider value={{ modules, hasModule, loading }}>
      {children}
    </ModuleContext.Provider>
  )
}

export function useModules() {
  const ctx = useContext(ModuleContext)
  if (!ctx) throw new Error('useModules must be used within ModuleProvider')
  return ctx
}
