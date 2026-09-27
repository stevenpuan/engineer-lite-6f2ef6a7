import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { usePayables, useCreatePayable, useDeletePayable, usePayments, useCreatePayment, useDeletePayment } from '@/hooks/usePayables'
import { SettlementDialog } from '@/components/SettlementDialog'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Plus, Search, Trash2, Banknote } from 'lucide-react'
import { PAYABLE_STATUS_LABELS, type PayableStatus } from '@/types/database'
import { toast } from 'sonner'

const statusStyle: Record<PayableStatus, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  partial: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function PayablesPage() {
  const canDelete = useCanDelete()
  const { data: payables = [], isLoading } = usePayables()
  const { data: projects = [] } = useProjects()
  const createPayable = useCreatePayable()
  const deletePayable = useDeletePayable()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ project_id: '', vendor_name: '', description: '', amount: '', due_date: '' })
  const [search, setSearch] = useState('')
  const [settleId, setSettleId] = useState<string | null>(null)

  const settling = payables.find(p => p.id === settleId) ?? null
  const { data: payments = [] } = usePayments(settleId ?? undefined)
  const createPayment = useCreatePayment()
  const deletePayment = useDeletePayment()

  const filtered = payables.filter(p =>
    p.vendor_name.includes(search) || (p.description ?? '').includes(search)
  )

  const totalAmount = filtered.reduce((s, p) => s + (p.status !== 'cancelled' ? Number(p.amount) : 0), 0)

  async function handleCreate() {
    if (!form.vendor_name.trim()) { toast.error('請輸入廠商名稱'); return }
    if (!form.amount) { toast.error('請輸入金額'); return }
    try {
      await createPayable.mutateAsync({
        project_id: form.project_id || undefined,
        vendor_name: form.vendor_name,
        description: form.description || undefined,
        amount: Number(form.amount),
        due_date: form.due_date || undefined,
      })
      toast.success('應付帳款已建立')
      setDialogOpen(false)
      setForm({ project_id: '', vendor_name: '', description: '', amount: '', due_date: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除？')) return
    try {
      await deletePayable.mutateAsync(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">應付帳款</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增應付</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜尋..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">應付列表 ({filtered.length}) · 總計 ${totalAmount.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="block sm:hidden divide-y">
            {filtered.map(p => (
              <div key={p.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{p.vendor_name}</span>
                  <Badge className={statusStyle[p.status]} variant="secondary">{PAYABLE_STATUS_LABELS[p.status]}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(p.project as { name: string } | null)?.name ?? '—'} · ${Number(p.amount).toLocaleString()}
                </div>
                {p.status !== 'cancelled' && (
                  <Button variant="outline" size="sm" className="mt-2" onClick={() => setSettleId(p.id)}>
                    <Banknote className="mr-1 h-4 w-4" />登記付款
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>廠商</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.vendor_name}</TableCell>
                    <TableCell>{p.description ?? '—'}</TableCell>
                    <TableCell>{(p.project as { name: string } | null)?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">${Number(p.amount).toLocaleString()}</TableCell>
                    <TableCell>{p.due_date ?? '—'}</TableCell>
                    <TableCell><Badge className={statusStyle[p.status]} variant="secondary">{PAYABLE_STATUS_LABELS[p.status]}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {p.status !== 'cancelled' && (
                        <Button variant="outline" size="sm" onClick={() => setSettleId(p.id)}>
                          <Banknote className="mr-1 h-4 w-4" />登記付款
                        </Button>
                      )}
                      {canDelete && (<Button variant="ghost" size="icon" aria-label="刪除應付" onClick={() => handleDelete(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">無應付帳款</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增應付帳款</DialogTitle>
            <DialogDescription>記錄廠商應付款項</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>案件</Label>
              <Select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">— 不指定案件 —</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </Select>
            </div>
            <div><Label>廠商名稱 *</Label><Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
            <div><Label>說明</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>金額 *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>到期日</Label><Input type="date" value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>建立</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <SettlementDialog
        open={!!settling}
        onOpenChange={open => { if (!open) setSettleId(null) }}
        kind="payment"
        subject={settling ? `${settling.vendor_name}${settling.description ? ` · ${settling.description}` : ''}` : ''}
        totalAmount={Number(settling?.amount ?? 0)}
        records={payments.map(p => ({ id: p.id, date: p.paid_date, amount: Number(p.amount), method: p.method, reference_no: p.reference_no }))}
        onCreate={input => createPayment.mutateAsync({
          payable_id: settleId!,
          paid_date: input.date,
          amount: input.amount,
          method: input.method,
          reference_no: input.reference_no,
        })}
        onDelete={id => deletePayment.mutateAsync(id)}
      />
    </div>
  )
}
