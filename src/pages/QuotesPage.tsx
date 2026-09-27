import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuotes, useCreateQuote, useDeleteQuote } from '@/hooks/useQuotes'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Plus, Search, Trash2, ExternalLink } from 'lucide-react'
import type { QuoteStatus } from '@/types/database'
import { toast } from 'sonner'

const statusStyle: Record<QuoteStatus, string> = {
  '草稿': 'bg-gray-100 text-gray-800',
  '已送出': 'bg-blue-100 text-blue-800',
  '已接受': 'bg-green-100 text-green-800',
  '已拒絕': 'bg-red-100 text-red-800',
  '已過期': 'bg-yellow-100 text-yellow-800',
}

export default function QuotesPage() {
  const { data: quotes = [], isLoading } = useQuotes()
  const { data: projects = [] } = useProjects()
  const createQuote = useCreateQuote()
  const deleteQuote = useDeleteQuote()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ project_id: '', title: '', quote_no: '' })
  const [search, setSearch] = useState('')

  const filtered = quotes.filter(q =>
    q.title.includes(search) || (q.quote_no ?? '').includes(search)
  )

  async function handleCreate() {
    if (!form.project_id) { toast.error('請選擇案件'); return }
    if (!form.title.trim()) { toast.error('請輸入報價單名稱'); return }
    try {
      await createQuote.mutateAsync({
        project_id: form.project_id,
        title: form.title,
        quote_no: form.quote_no || undefined,
      })
      toast.success('報價單已建立')
      setDialogOpen(false)
      setForm({ project_id: '', title: '', quote_no: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此報價單？')) return
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">報價單</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增報價單</Button>
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
                  <Link to="/quotes/$id" params={{ id: q.id }} className="font-medium hover:underline">{q.title}</Link>
                  <Badge className={statusStyle[q.status]} variant="secondary">{q.status}</Badge>
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
                      <Link to="/quotes/$id" params={{ id: q.id }} className="hover:underline">{q.title}</Link>
                    </TableCell>
                    <TableCell>{(q.project as { name: string } | null)?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">${q.total.toLocaleString()}</TableCell>
                    <TableCell><Badge className={statusStyle[q.status]} variant="secondary">{q.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to="/quotes/$id" params={{ id: q.id }}><Button variant="ghost" size="icon"><ExternalLink className="h-4 w-4" /></Button></Link>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
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

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增報價單</DialogTitle>
            <DialogDescription>選擇案件並建立新的報價單</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>案件 *</Label>
              <Select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">— 選擇案件 —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div><Label>報價單名稱 *</Label><Input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="例：一樓裝修報價" /></div>
            <div><Label>報價單編號</Label><Input value={form.quote_no} onChange={e => setForm({ ...form, quote_no: e.target.value })} placeholder="選填" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>建立</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
