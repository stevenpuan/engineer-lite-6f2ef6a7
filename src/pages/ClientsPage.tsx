import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from '@/hooks/useClients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Plus, Pencil, Trash2, Search } from 'lucide-react'
import type { Client } from '@/types/database'
import { toast } from 'sonner'

const emptyForm = { name: '', contact_name: '', phone: '', email: '', address: '', notes: '' }

export default function ClientsPage() {
  const canDelete = useCanDelete()
  const { data: clients = [], isLoading } = useClients()
  const createClient = useCreateClient()
  const updateClient = useUpdateClient()
  const deleteClient = useDeleteClient()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const filtered = clients.filter(c =>
    c.name.includes(search) || (c.contact_name ?? '').includes(search)
  )

  function openCreate() {
    setEditing(null)
    setForm(emptyForm)
    setDialogOpen(true)
  }

  function openEdit(c: Client) {
    setEditing(c)
    setForm({
      name: c.name,
      contact_name: c.contact_name ?? '',
      phone: c.phone ?? '',
      email: c.email ?? '',
      address: c.address ?? '',
      notes: c.notes ?? '',
    })
    setDialogOpen(true)
  }

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error('請輸入客戶名稱'); return }
    const payload = {
      name: form.name,
      contact_name: form.contact_name || null,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      tax_id: null,
      notes: form.notes || null,
    }
    try {
      if (editing) {
        await updateClient.mutateAsync({ id: editing.id, ...payload })
        toast.success('客戶已更新')
      } else {
        await createClient.mutateAsync(payload)
        toast.success('客戶已新增')
      }
      setDialogOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除此客戶？')) return
    try {
      await deleteClient.mutateAsync(id)
      toast.success('客戶已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">客戶管理</h1>
        <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />新增客戶</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="搜尋客戶..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">客戶列表 ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile cards */}
          <div className="block sm:hidden divide-y">
            {filtered.map(c => (
              <div key={c.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{c.name}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                    {canDelete && (<Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                  </div>
                </div>
                {c.contact_name && <div className="text-sm text-muted-foreground">聯絡人：{c.contact_name}</div>}
                {c.phone && <div className="text-sm text-muted-foreground">電話：{c.phone}</div>}
              </div>
            ))}
          </div>

          {/* Desktop table */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名稱</TableHead>
                  <TableHead>聯絡人</TableHead>
                  <TableHead>電話</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="w-24">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.name}</TableCell>
                    <TableCell>{c.contact_name}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell>{c.email}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(c)}><Pencil className="h-4 w-4" /></Button>
                        {canDelete && (<Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">無客戶資料</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? '編輯客戶' : '新增客戶'}</DialogTitle>
            <DialogDescription>填寫客戶基本資料</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>名稱 *</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div><Label>聯絡人</Label><Input value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>電話</Label><Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div><Label>地址</Label><Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} /></div>
            <div><Label>備註</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSubmit}>{editing ? '更新' : '新增'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
