import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useProjects, useCreateProject, useDeleteProject } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select } from '@/components/ui/select'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Trash2, Search, ExternalLink } from 'lucide-react'
import type { ProjectStatus } from '@/types/database'
import { toast } from 'sonner'

const statusColor: Record<string, string> = {
  '洽談中': 'bg-yellow-100 text-yellow-800',
  '進行中': 'bg-blue-100 text-blue-800',
  '完工': 'bg-green-100 text-green-800',
  '結案': 'bg-gray-100 text-gray-800',
  '取消': 'bg-red-100 text-red-800',
}

const allStatuses: ProjectStatus[] = ['洽談中', '進行中', '完工', '結案', '取消']

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useProjects()
  const { data: clients = [] } = useClients()
  const createProject = useCreateProject()
  const deleteProject = useDeleteProject()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({
    name: '', client_id: '', status: '洽談中' as ProjectStatus,
    address: '', contract_amount: '', notes: '',
  })

  const filtered = projects.filter(p =>
    p.name.includes(search) || (p.client as { name: string } | null)?.name?.includes(search)
  )

  async function handleCreate() {
    if (!form.name.trim()) { toast.error('請輸入案件名稱'); return }
    try {
      await createProject.mutateAsync({
        name: form.name,
        client_id: form.client_id || null,
        status: form.status,
        address: form.address || null,
        contract_amount: form.contract_amount ? Number(form.contract_amount) : null,
        notes: form.notes || null,
        start_date: null,
        end_date: null,
      })
      toast.success('案件已建立')
      setDialogOpen(false)
      setForm({ name: '', client_id: '', status: '洽談中', address: '', contract_amount: '', notes: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此案件？')) return
    try {
      await deleteProject.mutateAsync(id)
      toast.success('案件已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">案件管理</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增案件</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜尋案件..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">案件列表 ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="block sm:hidden divide-y">
            {filtered.map(p => (
              <div key={p.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <Link to="/projects/$id" params={{ id: p.id }} className="font-medium text-primary hover:underline flex items-center gap-1">
                    {p.name} <ExternalLink className="h-3 w-3" />
                  </Link>
                  <Badge className={statusColor[p.status] ?? ''} variant="secondary">{p.status}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(p.client as { name: string } | null)?.name ?? '—'}
                </div>
                {p.contract_amount != null && <div className="text-sm text-muted-foreground">預算：${p.contract_amount.toLocaleString()}</div>}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>案件名稱</TableHead>
                  <TableHead>客戶</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead>預算</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <Link to="/projects/$id" params={{ id: p.id }} className="font-medium text-primary hover:underline">
                        {p.name}
                      </Link>
                    </TableCell>
                    <TableCell>{(p.client as { name: string } | null)?.name ?? '—'}</TableCell>
                    <TableCell><Badge className={statusColor[p.status] ?? ''} variant="secondary">{p.status}</Badge></TableCell>
                    <TableCell>{p.contract_amount != null ? `$${p.contract_amount.toLocaleString()}` : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(p.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">無案件資料</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增案件</DialogTitle>
            <DialogDescription>填寫案件基本資料</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>案件名稱 *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div>
              <Label>客戶</Label>
              <Select value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value })}>
                <option value="">— 不指定 —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </div>
            <div>
              <Label>狀態</Label>
              <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ProjectStatus })}>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div><Label>地址</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>預算</Label><Input type="number" value={form.contract_amount} onChange={e => setForm({ ...form, contract_amount: e.target.value })} /></div>
            <div><Label>備註</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
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
