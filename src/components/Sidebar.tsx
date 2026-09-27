import { useState } from 'react'
import { Link, useLocation } from '@tanstack/react-router'
import { cn } from '@/lib/utils'
import { useAuth } from '@/contexts/AuthContext'
import { useModules, type ModuleKey } from '@/contexts/ModuleContext'
import {
  LayoutDashboard, Users, FolderKanban, LogOut, Menu, X,
  Shield, Building2, UserCog, ToggleLeft,
  FileText, Wallet, Receipt, CreditCard,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ReactNode
  /** Hidden when this module is disabled for the tenant */
  module?: ModuleKey
}

export function Sidebar() {
  const { pathname } = useLocation()
  const { profile, isPlatformAdmin, signOut } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { hasModule } = useModules()

  const tenantNav: NavItem[] = [
    { label: '總覽', to: '/', icon: <LayoutDashboard className="h-5 w-5" /> },
    { label: '客戶管理', to: '/clients', icon: <Users className="h-5 w-5" /> },
    { label: '案件管理', to: '/projects', icon: <FolderKanban className="h-5 w-5" /> },
    { label: '報價單', to: '/quotes', icon: <FileText className="h-5 w-5" />, module: 'quote' },
    { label: '收款管理', to: '/receivables', icon: <Wallet className="h-5 w-5" />, module: 'receivable' },
    { label: '支出管理', to: '/expenses', icon: <Receipt className="h-5 w-5" />, module: 'payable' },
    { label: '應付帳款', to: '/payables', icon: <CreditCard className="h-5 w-5" />, module: 'payable' },
  ]

  const adminNav: NavItem[] = [
    { label: '租戶管理', to: '/admin/tenants', icon: <Building2 className="h-5 w-5" /> },
    { label: '使用者管理', to: '/admin/users', icon: <UserCog className="h-5 w-5" /> },
    { label: '模組開關', to: '/admin/modules', icon: <ToggleLeft className="h-5 w-5" /> },
  ]

  // A platform admin who also belongs to a tenant sees both sections
  const hasTenant = !!profile?.tenant_id
  const visibleTenantNav = tenantNav.filter(item => !item.module || hasModule(item.module))

  function NavLink({ item }: { item: NavItem }) {
    const active = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
    return (
      <Link
        to={item.to}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
          active
            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
            : 'text-sidebar-foreground hover:bg-sidebar-accent/60'
        )}
      >
        {item.icon}
        {item.label}
      </Link>
    )
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <span className="text-lg font-semibold text-sidebar-foreground">Engineer Lite</span>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {hasTenant && visibleTenantNav.map(item => <NavLink key={item.to} item={item} />)}
        {isPlatformAdmin && (
          <>
            <div className={cn('mb-2 flex items-center gap-2 px-3 py-1', hasTenant && 'mt-4 border-t border-sidebar-border pt-4')}>
              <Shield className="h-4 w-4 text-primary" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">平台管理</span>
            </div>
            {adminNav.map(item => <NavLink key={item.to} item={item} />)}
          </>
        )}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 px-3 text-xs text-muted-foreground truncate">
          {profile?.display_name ?? (isPlatformAdmin ? '平台管理員' : '使用者')}
        </div>
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent/60 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          登出
        </button>
      </div>
    </div>
  )

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-3 z-40 rounded-md p-2 text-foreground lg:hidden hover:bg-accent"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="fixed inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-sidebar border-r border-sidebar-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 rounded-md p-1 hover:bg-sidebar-accent"
            >
              <X className="h-5 w-5" />
            </button>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-sidebar border-r border-sidebar-border">
        {sidebarContent}
      </aside>
    </>
  )
}
