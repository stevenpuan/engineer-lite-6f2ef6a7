import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { Profile } from '@/types/database'

interface AuthState {
  session: Session | null
  user: User | null
  profile: Profile | null
  isPlatformAdmin: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 同一個使用者只載入一次 profile（避免 getSession 與 INITIAL_SESSION／TOKEN_REFRESHED 重複查詢）
    let loadedFor: string | null = null

    function handle(session: Session | null) {
      setSession(session)
      const uid = session?.user?.id ?? null
      if (!uid) {
        loadedFor = null
        setProfile(null)
        setIsPlatformAdmin(false)
        setLoading(false)
        return
      }
      if (uid === loadedFor) return
      loadedFor = uid
      // 放到下一個 tick，避免在 auth callback 裡呼叫 supabase 造成鎖死
      setTimeout(() => { void loadProfile(uid) }, 0)
    }

    supabase.auth.getSession().then(({ data: { session } }) => handle(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => handle(session))
    return () => subscription.unsubscribe()
  }, [])

  async function loadProfile(userId: string) {
    try {
      // profile 與平台管理員身分同時查
      const [{ data: prof }, { data: admin }] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('platform_admins').select('user_id').eq('user_id', userId).maybeSingle(),
      ])
      setProfile(prof as Profile | null)
      setIsPlatformAdmin(!!admin)
    } catch {
      // Profile may not exist yet for platform admins without tenant
    } finally {
      setLoading(false)
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      profile,
      isPlatformAdmin,
      loading,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
