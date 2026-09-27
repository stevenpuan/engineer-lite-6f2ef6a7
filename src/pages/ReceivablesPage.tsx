import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { useReceivables, useCreateReceivable, useDeleteReceivable, useReceipts, useCreateReceipt, useDeleteReceipt } from '@/hooks/useReceivables'
import { SettlementDialog } from '@/components/SettlementDialog'
import { useProjects } from '@/hooks/useProjects'
import { ProjectSelect } from '@/components/ProjectSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Plus, Search, Trash2, HandCoins } from 'lucide-react'
import { RECEIVABLE_STATUS_LABELS, type ReceivableStatus } from '@/types/database'
import { toast } from 'sonner'

const statusStyle: Record<ReceivableStatus, string> = {
  pending: 'bg-gray-100 text-gray-800',
  invoiced: 'bg-blue-100 text-blue-800',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  overdue: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
}

export default function ReceivablesPage() {
  const canDelete = useCanDelete()
  const { data: receivables = [], isLoading } = useReceivables()
  const { data: projects = [] } = useProjects()
  const createReceivable = useCreateReceivable()
  const deleteReceivable = useDeleteReceivable()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ project_id: '', label: '', amount: '', due_date: '' })
  const [search, setSearch] = useState('')
  const [settleId, setSettleId] = useState<string | null>(null)

  const settling = receivables.find(r => r.id === settleId) ?? null
  const { data: receipts = [] } = useReceipts(settleId ?? undefined)
  const createReceipt = useCreateReceipt()
  const deleteReceipt = useDeleteReceipt()

  const filtered = receivables.filter(r =>
    r.label.includes(search) || (r.project as { name: string } | null)?.name?.includes(search)
  )

  const totalAmount = filtered.reduce((s, r) => s + Number(r.amount), 0)

  async function handleCreate() {
    if (!form.project_id) { toast.error('請選擇案件'); return }
    if (!form.label.trim()) { toast.error('請輸入請款期別'); return }
    if (!form.amount) { toast.error('請輸入金額'); return }
    try {
      await createReceivable.mutateAsync({
        project_id: form.project_id,
        label: form.label,
        amount: Number(form.amount),
        due_date: form.due_date || undefined,
      })
      toast.success('應收帳款已建立')
      setDialogOpen(false)
      setForm({ project_id: '', label: '', amount: '', due_date: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除？')) return
    try {
      await deleteReceivable.mutateAsync(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">收款管理</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增應收</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜尋..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">應收列表 ({filtered.length}) · 總計 ${totalAmount.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="block sm:hidden divide-y">
            {filtered.map(r => (
              <div key={r.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.label}</span>
                  <Badge className={statusStyle[r.status]} variant="secondary">{RECEIVABLE_STATUS_LABELS[r.status]}</Badge>
                </div>
                <div className="text-sm text-muted-foreground">
                  {(r.project as { name: string } | null)?.name ?? '—'} · ${Number(r.amount).toLocaleString()}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {r.status !== 'cancelled' && (
                    <Button variant="outline" size="sm" onClick={() => setSettleId(r.id)}>
                      <HandCoins className="mr-1 h-4 w-4" />登記收款
                    </Button>
                  )}
                  {canDelete && (<Button variant="ghost" size="icon" aria-label="刪除應收" className="ml-auto" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>期別</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>到期日</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-40"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.label}</TableCell>
                    <TableCell>{(r.project as { name: string } | null)?.name ?? '—'}</TableCell>
                    <TableCell className="text-right">${Number(r.amount).toLocaleString()}</TableCell>
                    <TableCell>{r.due_date ?? '—'}</TableCell>
                    <TableCell><Badge className={statusStyle[r.status]} variant="secondary">{RECEIVABLE_STATUS_LABELS[r.status]}</Badge></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      {r.status !== 'cancelled' && (
                        <Button variant="outline" size="sm" onClick={() => setSettleId(r.id)}>
                          <HandCoins className="mr-1 h-4 w-4" />登記收款
                        </Button>
                      )}
                      {canDelete && (<Button variant="ghost" size="icon" aria-label="刪除應收" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">無應收帳款</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增應收帳款</DialogTitle>
            <DialogDescription>建立收款期別</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label>案件 *</Label>
              <ProjectSelect projects={projects} value={form.project_id} onChange={id => setForm({ ...form, project_id: id })} emptyLabel="— 選擇案件 —" />
            </div>
            <div><Label>期別名稱 *</Label><Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="例：訂金 30%" /></div>
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
        kind="receipt"
        subject={settling ? `${(settling.project as { name: string } | null)?.name ?? ''} · ${settling.label}` : ''}
        totalAmount={Number(settling?.amount ?? 0)}
        records={receipts.map(r => ({ id: r.id, date: r.received_date, amount: Number(r.amount), method: r.method, reference_no: r.reference_no }))}
        onCreate={input => createReceipt.mutateAsync({
          receivable_id: settleId!,
          received_date: input.date,
          amount: input.amount,
          method: input.method,
          reference_no: input.reference_no,
        })}
        onDelete={id => deleteReceipt.mutateAsync(id)}
      />
    </div>
  )
}
