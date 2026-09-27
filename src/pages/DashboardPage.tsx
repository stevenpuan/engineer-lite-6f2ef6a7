import { useClients } from '@/hooks/useClients'
import { useProjects } from '@/hooks/useProjects'
import { useFinanceSummary } from '@/hooks/useFinanceSummary'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, FolderKanban, ArrowRight, TrendingUp, TrendingDown, Wallet } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@/components/ui/badge'

const statusColor: Record<string, string> = {
  '洽談中': 'bg-yellow-100 text-yellow-800',
  '進行中': 'bg-blue-100 text-blue-800',
  '完工': 'bg-green-100 text-green-800',
  '結案': 'bg-gray-100 text-gray-800',
  '取消': 'bg-red-100 text-red-800',
}

export default function DashboardPage() {
  const { data: clients = [] } = useClients()
  const { data: projects = [] } = useProjects()
  const { data: financeSummary = [] } = useFinanceSummary()

  const activeProjects = projects.filter(p => p.status === '進行中')

  // Aggregate finance numbers across all projects
  const totalQuoted = financeSummary.reduce((s, f) => s + (f.total_quoted ?? 0), 0)
  const totalReceived = financeSummary.reduce((s, f) => s + (f.total_received ?? 0), 0)
  const totalExpenses = financeSummary.reduce((s, f) => s + (f.total_expenses ?? 0), 0)
  const totalPayables = financeSummary.reduce((s, f) => s + (f.total_payable ?? 0), 0)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">總覽</h1>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">客戶數</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">案件總數</CardTitle>
            <FolderKanban className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projects.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">進行中</CardTitle>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProjects.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Finance summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">報價總額</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">${totalQuoted.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">已收款</CardTitle>
            <Wallet className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-green-700">${totalReceived.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">支出總額</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-red-600">${totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">應付未付</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">${totalPayables.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

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
                    to={`/projects/${p.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {(p.client as { name: string } | null)?.name ?? '無客戶'}
                        {pf && ` · 收 $${(pf.total_received ?? 0).toLocaleString()} / 支 $${(pf.total_expenses ?? 0).toLocaleString()}`}
                      </div>
                    </div>
                    <Badge className={statusColor[p.status] ?? ''} variant="secondary">
                      {p.status}
                    </Badge>
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
