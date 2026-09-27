import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { useExpenses, useCreateExpense, useDeleteExpense } from '@/hooks/useExpenses'
import { useProjects } from '@/hooks/useProjects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Plus, Search, Trash2, Image as ImageIcon } from 'lucide-react'
import { openExpensePhoto } from '@/hooks/useCoreExtras'
import { EXPENSE_CATEGORY_LABELS, type Expense, type ExpenseCategory } from '@/types/database'
import { toast } from 'sonner'

const categories = Object.entries(EXPENSE_CATEGORY_LABELS) as [ExpenseCategory, string][]

const statusStyle: Record<string, string> = {
  unpaid: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  partial: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-500',
}
const statusLabel: Record<string, string> = {
  unpaid: '未付',
  paid: '已付',
  partial: '部分',
  cancelled: '取消',
}

const emptyForm = {
  project_id: '',
  expense_date: new Date().toISOString().slice(0, 10),
  category: 'other' as string,
  description: '',
  amount: '',
  vendor_name: '',
  payment_method: '',
  notes: '',
}

export default function ExpensesPage() {
  const canDelete = useCanDelete()

  async function showPhoto(path: string) {
    try { await openExpensePhoto(path) } catch (err) { toast.error(err instanceof Error ? err.message : '無法開啟照片') }
  }
  const { data: expenses = [], isLoading } = useExpenses()
  const { data: projects = [] } = useProjects()
  const createExpense = useCreateExpense()
  const deleteExpense = useDeleteExpense()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const filtered = expenses.filter(e =>
    e.description.includes(search) || (e.vendor_name ?? '').includes(search) || (e.receipt_no ?? '').includes(search.toUpperCase())
  )

  const totalAmount = filtered.reduce((s, e) => s + (e.status !== 'cancelled' ? Number(e.amount) : 0), 0)

  async function handleCreate() {
    if (!form.description.trim()) { toast.error('請輸入說明'); return }
    if (!form.amount) { toast.error('請輸入金額'); return }
    try {
      await createExpense.mutateAsync({
        project_id: form.project_id || undefined,
        expense_date: form.expense_date,
        category: form.category,
        description: form.description,
        amount: Number(form.amount),
        vendor_name: form.vendor_name || undefined,
        payment_method: form.payment_method || undefined,
        is_overhead: !form.project_id,
        notes: form.notes || undefined,
      })
      toast.success('支出已登錄')
      setDialogOpen(false)
      setForm(emptyForm)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('確定要刪除？')) return
    try {
      await deleteExpense.mutateAsync(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold">支出管理</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="mr-2 h-4 w-4" />新增支出</Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="搜尋..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">支出列表 ({filtered.length}) · 總計 ${totalAmount.toLocaleString()}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Mobile */}
          <div className="block sm:hidden divide-y">
            {filtered.map(e => (
              <div key={e.id} className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {e.description}
                    {e.photo_path && (
                      <button type="button" aria-label="看單據照片" className="ml-1 inline-flex align-middle text-primary" onClick={() => showPhoto(e.photo_path!)}>
                        <ImageIcon className="h-4 w-4" />
                      </button>
                    )}
                  </span>
                  <span className="font-semibold">${Number(e.amount).toLocaleString()}</span>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <span>{e.expense_date}</span>
                  <Badge className={statusStyle[e.status] ?? ''} variant="secondary">{statusLabel[e.status] ?? e.status}</Badge>
                  <span>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</span>
                </div>
                <ReceiptMeta e={e} />
              </div>
            ))}
          </div>

          {/* Desktop */}
          <div className="hidden sm:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>日期</TableHead>
                  <TableHead>說明</TableHead>
                  <TableHead>分類</TableHead>
                  <TableHead>案件</TableHead>
                  <TableHead className="text-right">金額</TableHead>
                  <TableHead>狀態</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{e.expense_date}</TableCell>
                    <TableCell className="font-medium">
                      {e.description}
                      {e.photo_path && (
                    <button type="button" aria-label="看單據照片" className="ml-1 inline-flex align-middle text-primary" onClick={() => showPhoto(e.photo_path!)}>
                      <ImageIcon className="h-4 w-4" />
                    </button>
                  )}
                      <ReceiptMeta e={e} />
                    </TableCell>
                    <TableCell>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</TableCell>
                    <TableCell>{(e.project as { name: string } | null)?.name ?? (e.is_overhead ? '公司支出' : '—')}</TableCell>
                    <TableCell className="text-right">${Number(e.amount).toLocaleString()}</TableCell>
                    <TableCell><Badge className={statusStyle[e.status] ?? ''} variant="secondary">{statusLabel[e.status] ?? e.status}</Badge></TableCell>
                    <TableCell>
                      {canDelete && (<Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">無支出紀錄</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增支出</DialogTitle>
            <DialogDescription>記錄一筆支出</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>案件</Label>
                <Select value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                  <option value="">公司支出（不歸工地）</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </div>
              <div>
                <Label>分類</Label>
                <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categories.map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </Select>
              </div>
            </div>
            <div><Label>說明 *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="例：混凝土 20M3" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>金額 *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>日期</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>廠商</Label><Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>登錄</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

/** 廠商／發票號碼（LINE 拍照記帳辨識後會帶入） */
function ReceiptMeta({ e }: { e: Expense }) {
  if (!e.vendor_name && !e.receipt_no) return null
  return (
    <div className="text-xs text-muted-foreground font-normal">
      {[e.vendor_name, e.receipt_no && `發票 ${e.receipt_no}`].filter(Boolean).join(' · ')}
    </div>
  )
}
