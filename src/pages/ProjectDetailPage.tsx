import { useState } from 'react'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { useProject, useUpdateProject } from '@/hooks/useProjects'
import { useQuotes, useCreateQuote } from '@/hooks/useQuotes'
import { useReceivables } from '@/hooks/useReceivables'
import { useExpenses } from '@/hooks/useExpenses'
import { usePayables } from '@/hooks/usePayables'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { ArrowLeft, ExternalLink, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectStatus } from '@/types/database'
import { RECEIVABLE_STATUS_LABELS, PAYABLE_STATUS_LABELS, EXPENSE_CATEGORY_LABELS } from '@/types/database'
import { toast } from 'sonner'
import { useModules } from '@/contexts/ModuleContext'
import { ProjectProgressTab } from '@/components/ProjectProgressTab'
import { StatusBadge } from '@/components/StatusBadge'

const allStatuses: ProjectStatus[] = ['洽談中', '進行中', '完工', '結案', '取消']
const expenseStatusLabel: Record<string, string> = {
  unpaid: '未付', paid: '已付', partial: '部分', cancelled: '取消',
}

type Tab = 'info' | 'progress' | 'quotes' | 'receivables' | 'expenses' | 'payables'

export default function ProjectDetailPage() {
  const { id } = useParams({ strict: false }) as { id: string }
  const { hasModule } = useModules()
  const { data: project, isLoading } = useProject(id)
  const updateProject = useUpdateProject()
  const [tab, setTab] = useState<Tab>('info')

  const { data: quotes = [] } = useQuotes(id)
  const createQuote = useCreateQuote()
  const navigate = useNavigate()

  // 一鍵新增報價單（編號、名稱自動給），直接進去加品項
  async function handleNewQuote() {
    if (!id) return
    try {
      const q = await createQuote.mutateAsync({ project_id: id })
      toast.success(`已建立 ${q.quote_no ?? '報價單'}`)
      navigate({ to: '/quotes/$id', params: { id: q.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }
  const { data: receivables = [] } = useReceivables(id)
  const { data: expenses = [] } = useExpenses(id)
  const { data: payables = [] } = usePayables(id)

  async function handleStatusChange(status: ProjectStatus) {
    if (!id) return
    try {
      await updateProject.mutateAsync({ id, status })
      toast.success('狀態已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>
  if (!project) return <div className="p-8 text-center text-muted-foreground">找不到案件</div>

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'info', label: '基本資料' },
    ...(hasModule('progress') ? [{ key: 'progress' as Tab, label: '進度' }] : []),
    ...(hasModule('quote') ? [{ key: 'quotes' as Tab, label: '報價單', count: quotes.length }] : []),
    ...(hasModule('receivable') ? [{ key: 'receivables' as Tab, label: '收款', count: receivables.length }] : []),
    ...(hasModule('payable') ? [
      { key: 'expenses' as Tab, label: '支出', count: expenses.length },
      { key: 'payables' as Tab, label: '應付', count: payables.length },
    ] : []),
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/projects"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">{project.name}</h1>
        <StatusBadge status={project.status} />
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              'px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Tab: Info */}
      {tab === 'info' && (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">基本資料</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">客戶</span><span>{(project.client as { name: string } | null)?.name ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">地址</span><span>{project.address ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">合約金額</span><span>{project.contract_amount != null ? `$${project.contract_amount.toLocaleString()}` : '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">開始日期</span><span>{project.start_date ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">結束日期</span><span>{project.end_date ?? '—'}</span></div>
              {project.notes && (
                <div><span className="text-muted-foreground">備註</span><p className="mt-1">{project.notes}</p></div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">狀態變更</CardTitle></CardHeader>
            <CardContent>
              <Select value={project.status} onChange={e => handleStatusChange(e.target.value as ProjectStatus)}>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Quotes */}
      {tab === 'progress' && id && <ProjectProgressTab projectId={id} />}

      {tab === 'quotes' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">報價單 ({quotes.length})</CardTitle>
            <Button size="sm" onClick={handleNewQuote} disabled={createQuote.isPending}><Plus className="mr-1 h-4 w-4" />新增報價單</Button>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>編號</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="font-medium">{q.title}</TableCell>
                    <TableCell className="text-muted-foreground">{q.quote_no ?? '—'}</TableCell>
                    <TableCell className="text-right">${q.total.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell>
                      <Link to="/quotes/$id" params={{ id: q.id }}><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></Link>
                    </TableCell>
                  </TableRow>
                ))}
                {quotes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">無報價單</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Receivables */}
      {tab === 'receivables' && (
        <Card>
          <CardHeader><CardTitle className="text-base">收款 ({receivables.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期別</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {receivables.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell className="text-right">${Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell>{r.due_date ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={RECEIVABLE_STATUS_LABELS[r.status]} /></TableCell>
                  </TableRow>
                ))}
                {receivables.length === 0 && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">無收款紀錄</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Expenses */}
      {tab === 'expenses' && (
        <Card>
          <CardHeader><CardTitle className="text-base">支出 ({expenses.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{e.expense_date}</TableCell>
                    <TableCell className="font-medium">{e.description}</TableCell>
                    <TableCell>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</TableCell>
                    <TableCell className="text-right">${Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={expenseStatusLabel[e.status] ?? e.status} /></TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">無支出紀錄</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Tab: Payables */}
      {tab === 'payables' && (
        <Card>
          <CardHeader><CardTitle className="text-base">應付 ({payables.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>廠商</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>狀態</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payables.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.vendor_name}</TableCell>
                    <TableCell>{p.description ?? '—'}</TableCell>
                    <TableCell className="text-right">${Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{p.due_date ?? '—'}</TableCell>
                    <TableCell><StatusBadge status={PAYABLE_STATUS_LABELS[p.status]} /></TableCell>
                  </TableRow>
                ))}
                {payables.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">無應付帳款</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
