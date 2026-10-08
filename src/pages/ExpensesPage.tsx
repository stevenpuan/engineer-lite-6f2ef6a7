import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense, EXPENSE_ROW_LIMIT } from '@/hooks/useExpenses'
import { useModules } from '@/contexts/ModuleContext'
import { useProjects } from '@/hooks/useProjects'
import { ProjectSelect } from '@/components/ProjectSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Plus, Search, Trash2, Pencil, Image as ImageIcon } from 'lucide-react'
import { openExpensePhoto } from '@/hooks/useCoreExtras'
import { EXPENSE_CATEGORY_LABELS, type Expense } from '@/types/database'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/StatusBadge'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ExpenseCategorySettings } from '@/components/ExpenseCategorySettings'
import { useActiveCategoryOptions } from '@/hooks/useExpenseCategories'
import { Settings2 } from 'lucide-react'

const statusLabel: Record<string, string> = {
  unpaid: '未付',
  paid: '已付',
  partial: '部分',
  cancelled: '取消',
}

/** 台灣當地日期（不是 UTC，凌晨 0～8 點才不會記成前一天） */
const todayLocal = () => new Date().toLocaleDateString('sv-SE')

const emptyForm = {
  project_id: '',
  expense_date: todayLocal(),
  category: 'other' as string,
  description: '',
  amount: '',
  vendor_name: '',
  payment_method: '',
  notes: '',
  receipt_no: '',
  seller_tax_id: '',
}

export default function ExpensesPage() {
  const canDelete = useCanDelete()

  async function showPhoto(path: string) {
    try { await openExpensePhoto(path) } catch (err) { toast.error(err instanceof Error ? err.message : '無法開啟照片') }
  }
  const [period, setPeriod] = useState<PeriodKey>('3m')
  const { data: expenses = [], isLoading } = useExpenses(undefined, periodStart(period))
  const { data: projects = [] } = useProjects()
  const createExpense = useCreateExpense()
  const updateExpense = useUpdateExpense()
  const [editingId, setEditingId] = useState<string | null>(null)
  const { hasModule } = useModules()
  const showInvoiceFields = hasModule('invoice')
  const deleteExpense = useDeleteExpense()

  const [dialogOpen, setDialogOpen] = useState(false)
  const [catSettingsOpen, setCatSettingsOpen] = useState(false)
  const { options: categoryOptions } = useActiveCategoryOptions()
  const [form, setForm] = useState(emptyForm)
  const [search, setSearch] = useState('')

  const filtered = expenses.filter(e =>
    e.description.includes(search) || (e.vendor_name ?? '').includes(search) || (e.receipt_no ?? '').includes(search.toUpperCase())
  )

  const totalAmount = filtered.reduce((s, e) => s + (e.status !== 'cancelled' ? Number(e.amount) : 0), 0)

  async function handleCreate() {
    if (!form.description.trim()) { toast.error('請輸入說明'); return }
    if (!form.amount) { toast.error('請輸入金額'); return }
    const receiptNo = form.receipt_no.replace(/[^A-Za-z0-9]/g, '').toUpperCase()
    if (receiptNo && !/^[A-Z]{2}\d{8}$/.test(receiptNo)) { toast.error('發票號碼格式：兩個英文字母加 8 位數字，例如 AB12345678'); return }
    const sellerTaxId = form.seller_tax_id.replace(/\D/g, '')
    if (sellerTaxId && sellerTaxId.length !== 8) { toast.error('統編是 8 位數字'); return }
    const payload = {
      project_id: form.project_id || null,
      expense_date: form.expense_date,
      category: form.category,
      description: form.description,
      amount: Number(form.amount),
      vendor_name: form.vendor_name || null,
      is_overhead: !form.project_id,
      receipt_no: receiptNo || null,
      seller_tax_id: sellerTaxId || null,
    }
    try {
      if (editingId) {
        await updateExpense.mutateAsync({ id: editingId, ...payload } as never)
        toast.success('已更新')
      } else {
        await createExpense.mutateAsync({ ...payload, payment_method: form.payment_method || undefined, notes: form.notes || undefined } as never)
        toast.success('支出已登錄')
      }
      setDialogOpen(false)
      setEditingId(null)
      setForm({ ...emptyForm, expense_date: todayLocal() })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  function openCreate() {
    setEditingId(null)
    setForm({ ...emptyForm, expense_date: todayLocal() })
    setDialogOpen(true)
  }

  function openEdit(e: Expense) {
    setEditingId(e.id)
    setForm({
      ...emptyForm,
      project_id: e.project_id ?? '',
      expense_date: e.expense_date,
      category: e.category,
      description: e.description,
      amount: String(e.amount),
      vendor_name: e.vendor_name ?? '',
      receipt_no: e.receipt_no ?? '',
      seller_tax_id: e.seller_tax_id ?? '',
    })
    setDialogOpen(true)
  }

  async function handleDelete(id: string) {
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
        <h1 className="text-2xl font-bold">雜支支出</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCatSettingsOpen(true)}><Settings2 className="mr-2 h-4 w-4" />類別設定</Button>
          <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />新增支出</Button>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="搜尋說明、廠商、發票號碼" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select aria-label="期間" value={period} onChange={e => setPeriod(e.target.value as PeriodKey)} className="sm:w-40">
          {PERIODS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
      </div>
      {expenses.length >= EXPENSE_ROW_LIMIT && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          這段期間超過 {EXPENSE_ROW_LIMIT} 筆，只列出最近的 {EXPENSE_ROW_LIMIT} 筆，總計也只算這些。請把期間縮小。
        </div>
      )}

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
                  <StatusBadge status={statusLabel[e.status] ?? e.status} />
                  <span>{EXPENSE_CATEGORY_LABELS[e.category] ?? e.category}</span>
                  <Button variant="ghost" size="icon" aria-label="編輯支出" className={canDelete ? 'ml-auto h-8 w-8' : 'ml-auto h-8 w-8'} onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                  {canDelete && (
                    <ConfirmDialog
                      title="刪除支出"
                      description={`確定要刪除「${e.description}」？`}
                      onConfirm={() => handleDelete(e.id)}
                      trigger={<Button variant="ghost" size="icon" aria-label="刪除支出" className="h-8 w-8"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    />
                  )}
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
                  <TableHead className="w-24"></TableHead>
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
                    <TableCell><StatusBadge status={statusLabel[e.status] ?? e.status} /></TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button variant="ghost" size="icon" aria-label="編輯支出" onClick={() => openEdit(e)}><Pencil className="h-4 w-4" /></Button>
                      {canDelete && (
                        <ConfirmDialog
                          title="刪除支出"
                          description={`確定要刪除「${e.description}」？`}
                          onConfirm={() => handleDelete(e.id)}
                          trigger={<Button variant="ghost" size="icon"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                        />
                      )}
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
            <DialogTitle>{editingId ? '編輯支出' : '新增支出'}</DialogTitle>
            <DialogDescription>{editingId ? '修改這筆支出' : '記錄一筆支出'}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>案件</Label>
                <ProjectSelect projects={projects} value={form.project_id} onChange={id => setForm({ ...form, project_id: id })} emptyLabel="公司支出（不歸工地）" />
              </div>
              <div>
                <Label>分類</Label>
                <Select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {categoryOptions.map(o => <option key={o.key} value={o.key}>{o.label}</option>)}
                  {!categoryOptions.some(o => o.key === form.category) && form.category && (
                    <option value={form.category}>{(EXPENSE_CATEGORY_LABELS as Record<string, string>)[form.category] ?? form.category}（已停用）</option>
                  )}
                </Select>
              </div>
            </div>
            <div><Label>說明 *</Label><Input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="例：混凝土 20M3" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>金額 *</Label><Input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
              <div><Label>日期</Label><Input type="date" value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} /></div>
              <div><Label>廠商</Label><Input value={form.vendor_name} onChange={e => setForm({ ...form, vendor_name: e.target.value })} /></div>
            </div>
            {showInvoiceFields && (
              <div className="grid grid-cols-2 gap-3">
                <div><Label>發票號碼</Label><Input value={form.receipt_no} onChange={e => setForm({ ...form, receipt_no: e.target.value })} placeholder="AB12345678（選填）" /></div>
                <div><Label>賣方統編</Label><Input value={form.seller_tax_id} inputMode="numeric" onChange={e => setForm({ ...form, seller_tax_id: e.target.value })} placeholder="選填" /></div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreate}>{editingId ? '儲存' : '登錄'}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ExpenseCategorySettings open={catSettingsOpen} onOpenChange={setCatSettingsOpen} />
    </div>
  )
}

/** 廠商／發票號碼（LINE 拍照記帳辨識後會帶入）；說明已含廠商名稱就不重複 */
function ReceiptMeta({ e }: { e: Expense }) {
  const vendor = e.vendor_name && !e.description.includes(e.vendor_name) ? e.vendor_name : null
  if (!vendor && !e.receipt_no) return null
  return (
    <div className="text-xs text-muted-foreground font-normal">
      {[vendor, e.receipt_no && `發票 ${e.receipt_no}`].filter(Boolean).join(' · ')}
    </div>
  )
}

type PeriodKey = 'month' | '3m' | 'year' | 'last_year' | 'all'
const PERIODS: { key: PeriodKey; label: string }[] = [
  { key: 'month', label: '本月' },
  { key: '3m', label: '近 3 個月' },
  { key: 'year', label: '今年' },
  { key: 'last_year', label: '去年至今' },
  { key: 'all', label: '全部' },
]

/** 期間起始日（台灣日期） */
function periodStart(k: PeriodKey): string | undefined {
  const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Taipei' }))
  const y = today.getFullYear(), m = today.getMonth()
  const fmt = (d: Date) => d.toLocaleDateString('sv-SE')
  switch (k) {
    case 'month': return fmt(new Date(y, m, 1))
    case '3m': return fmt(new Date(y, m - 2, 1))
    case 'year': return fmt(new Date(y, 0, 1))
    case 'last_year': return fmt(new Date(y - 1, 0, 1))
    default: return undefined
  }
}
