import { useState } from 'react'
import { useAdminTenants, useCreateTenant, useUpdateTenant } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Plus, Pencil } from 'lucide-react'
import { toast } from 'sonner'

const statusBadge: Record<string, string> = {
  active: 'bg-status-done text-status-done-foreground',
  trial: 'bg-status-active text-status-active-foreground',
  suspended: 'bg-status-pending text-status-pending-foreground',
  cancelled: 'bg-status-cancelled text-status-cancelled-foreground',
}

export default function TenantsPage() {
  const { data: tenants = [], isLoading } = useAdminTenants()
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', display_name: '', tax_id: '', industry: '', status: 'active', notes: '' })

  function openCreate() {
    setEditId(null)
    setForm({ name: '', display_name: '', tax_id: '', industry: '', status: 'active', notes: '' })
    setDialogOpen(true)
  }

  function openEdit(t: (typeof tenants)[0]) {
    setEditId(t.id)
    setForm({
      name: t.name,
      display_name: t.display_name ?? '',
      tax_id: t.tax_id ?? '',
      industry: t.industry ?? '',
      status: t.status,
      notes: t.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('請輸入租戶代碼'); return }
    try {
      if (editId) {
        await updateTenant.mutateAsync({
          _id: editId,
          _name: form.name,
          _display_name: form.display_name || undefined,
          _tax_id: form.tax_id || undefined,
          _industry: form.industry || undefined,
          _status: form.status,
          _notes: form.notes || undefined,
        })
        toast.success('租戶已更新')
      } else {
        await createTenant.mutateAsync({
          _name: form.name,
          _display_name: form.display_name || undefined,
          _tax_id: form.tax_id || undefined,
          _industry: form.industry || undefined,
          _notes: form.notes || undefined,
        })
        toast.success('租戶已建立')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">租戶管理</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />新增租戶</Button>
      </div>

      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">所有租戶 ({tenants.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名稱</TableHead>
                <TableHead>顯示名稱</TableHead>
                <TableHead>統編</TableHead>
                <TableHead>狀態</TableHead>
                <TableHead>使用者</TableHead>
                <TableHead>模組</TableHead>
                <TableHead className="w-16">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map(t => (
                <TableRow key={t.id}>
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{t.display_name ?? '—'}</TableCell>
                  <TableCell>{t.tax_id ?? '—'}</TableCell>
                  <TableCell><Badge className={statusBadge[t.status] ?? ''} variant="secondary">{t.status}</Badge></TableCell>
                  <TableCell>{t.user_count}</TableCell>
                  <TableCell>{t.module_count}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? '編輯租戶' : '新增租戶'}</DialogTitle>
            <DialogDescription>管理租戶基本資料</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>代碼 (slug) *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>顯示名稱</Label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>統一編號</Label><Input value={form.tax_id} onChange={e => setForm({ ...form, tax_id: e.target.value })} /></div>
              <div><Label>產業</Label><Input value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} /></div>
            </div>
            {editId && (
              <div>
                <Label>狀態</Label>
                <Select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                  <option value="active">active</option>
                  <option value="trial">trial</option>
                  <option value="suspended">suspended</option>
                  <option value="cancelled">cancelled</option>
                </Select>
              </div>
            )}
            <div><Label>備註</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editId ? '更新' : '建立'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
