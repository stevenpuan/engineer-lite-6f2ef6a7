import { Navigate } from '@tanstack/react-router'
import type { ReactNode } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { ModuleProvider } from '@/contexts/ModuleContext'
import { Sidebar } from './Sidebar'

export function Layout({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return (
    <ModuleProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main className="lg:pl-64">
          <div className="px-4 py-6 sm:px-6 lg:px-8 pt-16 lg:pt-6">
            {children}
          </div>
        </main>
      </div>
    </ModuleProvider>
  )
}
