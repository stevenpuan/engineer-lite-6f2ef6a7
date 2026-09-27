import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { Link, useNavigate } from '@tanstack/react-router'
import { ProjectSelect } from '@/components/ProjectSelect'
import { useQuotes, useCreateQuote, useDeleteQuote } from '@/hooks/useQuotes'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Search, Trash2, ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'

export default function QuotesPage() {
  const canDelete = useCanDelete()
  const { data: quotes = [], isLoading } = useQuotes()
  const { data: projects = [] } = useProjects()
  const createQuote = useCreateQuote()
  const deleteQuote = useDeleteQuote()

  const navigate = useNavigate()
  const [projectId, setProjectId] = useState('')
  const [search, setSearch] = useState('')

  const filtered = quotes.filter(q =>
    q.title.includes(search) || (q.quote_no ?? '').includes(search)
  )

  // 選案件 → 一鍵建立（編號、名稱自動給）→ 直接進報價單加品項
  async function handleCreate() {
    if (!projectId) { toast.error('先選要報價的案件'); return }
    try {
      const q = await createQuote.mutateAsync({ project_id: projectId })
      toast.success(`已建立 ${q.quote_no ?? '報價單'}`)
      navigate({ to: '/quotes/$id', params: { id: q.id } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteQuote.mutateAsync(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">報價單</h1>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
        <div className="sm:w-80">
          <ProjectSelect projects={projects} value={projectId} onChange={setProjectId} emptyLabel="— 選案件 —" />
        </div>
        <Button onClick={handleCreate} disabled={createQuote.isPending}><Plus className="mr-2 h-4 w-4" />新增報價單</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜尋報價單..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">報價單列表 ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="block sm:hidden divide-y">
            {filtered.map(q => (
              <div key={q.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Link to="/quotes/$id" params={{ id: q.id }} className="font-medium hover:underline">{q.title}{(q.version ?? 1) > 1 ? ` (v${q.version})` : ''}</Link>
                  <StatusBadge status={q.status} />
                </div>
                <div className="text-sm text-muted-foreground">
                  {(q.project as { name: string } | null)?.name ?? '—'} · ${q.total.toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>編號</TableHead>
                  <TableHead>名稱</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(q => (
                  <TableRow key={q.id}>
                    <TableCell className="text-muted-foreground">{q.quote_no ?? '—'}</TableCell>
                    <TableCell className="font-medium">
                      <Link to="/quotes/$id" params={{ id: q.id }} className="hover:underline">{q.title}{(q.version ?? 1) > 1 ? ` (v${q.version})` : ''}</Link>
                    </TableCell>
                    <TableCell>{(q.project as { name: string } | null)?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">${q.total.toLocaleString()}</TableCell>
                    <TableCell><StatusBadge status={q.status} /></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to="/quotes/$id" params={{ id: q.id }}><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></Link>
                        {canDelete && (
                          <ConfirmDialog
                            title="刪除報價單"
                            description={`確定要刪除「${q.title}」？`}
                            warning="報價單內的品項明細會一併刪除，且無法復原。"
                            onConfirm={() => handleDelete(q.id)}
                            trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">無報價單</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

    </div>
  )
}
