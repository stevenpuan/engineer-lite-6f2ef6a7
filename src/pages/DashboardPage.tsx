import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useFinanceSummary } from '@/hooks/useFinanceSummary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { Users, FolderKanban, HardHat, Plus } from 'lucide-react'
import { useDashboardMonth } from '@/hooks/useCoreExtras'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { useModules } from '@/contexts/ModuleContext'
import { useProjectProgress, daysSince } from '@/hooks/useProgress'
import { ProgressBar } from '@/components/ProjectProgressTab'
import { StatusBadge } from '@/components/StatusBadge'

export default function DashboardPage() {
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: financeSummary = [] } = useFinanceSummary()
  const { data: month } = useDashboardMonth()

  const activeProjects = projects.filter(p => p.status === '進行中')

  // 進度：最久沒回報的進行中案件（從沒回報的排最前面）
  const { hasModule } = useModules()
  const showProgress = hasModule('progress')
  const { data: progressList = [] } = useProjectProgress()
  const progressOf = (id: string) => progressList.find(r => r.project_id === id)
  const staleProjects = activeProjects
    .map(p => ({ p, days: daysSince(progressOf(p.id)?.last_report_at ?? null) }))
    .sort((a, b) => (b.days ?? Infinity) - (a.days ?? Infinity))
    .slice(0, 3)

  // Aggregate finance numbers across all projects
  const totalQuoted = financeSummary.reduce((s, f) => s + (f.quote_total ?? 0), 0)
  const totalReceived = financeSummary.reduce((s, f) => s + (f.received_total ?? 0), 0)
  const totalExpenses = financeSummary.reduce((s, f) => s + (f.expense_total ?? 0), 0)
  // 應付未付 = 應付總額 − 已付金額
  const totalPayables = financeSummary.reduce((s, f) => s + ((f.payable_total ?? 0) - (f.paid_total ?? 0)), 0)

  const ongoingProjects = projects.filter(p => p.status !== '取消' && p.status !== '結案')

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">總覽</h1>
        <div className="flex gap-2">
          <Link to="/projects" className={buttonVariants({ size: 'sm' })}><Plus className="mr-1 h-4 w-4" />案件</Link>
          <Link to="/clients" className={buttonVariants({ size: 'sm', variant: 'outline' })}><Plus className="mr-1 h-4 w-4" />客戶</Link>
          <Link to="/quotes" className={buttonVariants({ size: 'sm', variant: 'outline' })}><Plus className="mr-1 h-4 w-4" />報價</Link>
        </div>
      </div>

      {/* 財務重點：最重要的數字放最上面 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <FinanceStat label="累計報價" value={totalQuoted} className="border-l-4 border-l-primary" />
        <FinanceStat label="累計已收" value={totalReceived} className="border-l-4 border-l-status-done" valueClass="text-status-done" />
        <FinanceStat label="累計支出" value={totalExpenses} className="border-l-4 border-l-accent" />
        <FinanceStat label="應付未付" value={totalPayables} className="border-l-4 border-l-destructive" valueClass={totalPayables > 0 ? 'text-destructive' : undefined} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Link to="/clients" className="block transition-transform hover:-translate-y-0.5">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">客戶數</CardTitle>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10"><Users className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clients.length}</div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/projects" className="block transition-transform hover:-translate-y-0.5">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">案件總數</CardTitle>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10"><FolderKanban className="h-4 w-4 text-primary" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{ongoingProjects.length}</div>
              <p className="text-xs text-muted-foreground">不含已結案與取消</p>
            </CardContent>
          </Card>
        </Link>

        <Link to="/projects" className="block transition-transform hover:-translate-y-0.5">
          <Card className="h-full">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">進行中</CardTitle>
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-accent/20"><HardHat className="h-4 w-4 text-accent" /></div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{activeProjects.length}</div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* 本月帳務（M6）*/}
      {month && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">本月帳務 <span className="text-sm font-normal text-muted-foreground">{month.month}</span></CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {month.recv_due_month !== undefined && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="本月待收" value={month.recv_due_month} />
                <Stat label="本月已收" value={month.recv_received_month ?? 0} tone="green" />
                <Stat label={`逾期未收${month.recv_overdue_count ? `（${month.recv_overdue_count} 筆）` : ''}`} value={month.recv_overdue ?? 0} tone={month.recv_overdue ? 'red' : undefined} />
              </div>
            )}
            {month.pay_due_month !== undefined && (
              <div className="grid grid-cols-3 gap-2 text-center">
                <Stat label="本月待付" value={month.pay_due_month} />
                <Stat label="本月已付" value={month.pay_paid_month ?? 0} />
                <Stat label="本月支出" value={month.expense_month ?? 0} />
              </div>
            )}
            <div className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-sm">
              <span className="text-muted-foreground">現金流（本月進 − 本月出）</span>
              <span className={month.cash_net < 0 ? 'font-semibold text-destructive' : 'font-semibold text-status-done'}>
                {month.cash_net < 0 ? '−' : ''}${Math.abs(month.cash_net).toLocaleString()}
              </span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 案件毛利：只有老闆看得到（資料庫端同樣只回給老闆）*/}
      {month?.margins && month.margins.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">案件毛利</CardTitle>
            {(month.margins_total ?? 0) > month.margins.length && (
              <p className="text-xs text-muted-foreground">共 {month.margins_total} 件，列出毛利率最低的 {month.margins.length} 件</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {month.margins.map(m => (
                <Link key={m.project_id} to="/projects/$id" params={{ id: m.project_id }} className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-xs text-muted-foreground">收入 ${Number(m.revenue).toLocaleString()} · 成本 ${Number(m.cost).toLocaleString()}</div>
                  </div>
                  <div className={Number(m.margin) < 0 ? 'text-right font-semibold text-destructive' : 'text-right font-semibold text-status-done'}>
                    ${Number(m.margin).toLocaleString()}
                    {Number(m.revenue) > 0 && <div className="text-xs font-normal text-muted-foreground">{Math.round((Number(m.margin) / Number(m.revenue)) * 100)}%</div>}
                  </div>
                </Link>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">收入以合約金額計（未填則用報價），成本 = 支出 + 應付。</p>
          </CardContent>
        </Card>
      )}

      {showProgress && staleProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">該追進度了</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {staleProjects.map(({ p, days }) => (
                <Link
                  key={p.id}
                  to="/projects/$id" params={{ id: p.id }}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className={days === null || days >= 3 ? 'text-sm text-accent' : 'text-sm text-muted-foreground'}>
                      {days === null ? '尚未回報過' : days === 0 ? '今天有回報' : `${days} 天沒回報`}
                    </div>
                  </div>
                  <div className="flex w-28 shrink-0 items-center gap-2">
                    <ProgressBar value={progressOf(p.id)?.overall_percent ?? 0} />
                    <span className="w-9 text-right text-xs text-muted-foreground">{progressOf(p.id)?.overall_percent ?? 0}%</span>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {activeProjects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">進行中案件</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeProjects.slice(0, 5).map(p => {
                const pf = financeSummary.find(f => f.project_id === p.id)
                return (
                  <Link
                    key={p.id}
                    to="/projects/$id" params={{ id: p.id }}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(p.client as { name: string } | null)?.name ?? '無客戶'}
                        {pf && ` · 收 $${(pf.received_total ?? 0).toLocaleString()} / 支 $${(pf.expense_total ?? 0).toLocaleString()}`}
                      </div>
                    </div>
                    <StatusBadge status={p.status} />
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'green' | 'red' }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('text-base font-bold sm:text-lg', tone === 'green' && 'text-status-done', tone === 'red' && 'text-destructive')}>
        ${Number(value).toLocaleString()}
      </div>
    </div>
  )
}

function FinanceStat({ label, value, className, valueClass }: { label: string; value: number; className?: string; valueClass?: string }) {
  return (
    <Card className={cn('py-3', className)}>
      <CardContent className="px-4 py-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn('mt-1 truncate text-lg font-bold sm:text-2xl', valueClass)}>${Number(value).toLocaleString()}</div>
      </CardContent>
    </Card>
  )
}
