import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Trash2 } from 'lucide-react'
import { toast } from 'sonner'

export interface SettlementRecord {
  id: string
  date: string
  amount: number
  method: string | null
  reference_no: string | null
}

export interface SettlementInput {
  date: string
  amount: number
  method?: string
  reference_no?: string
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** 'receipt' = 收款, 'payment' = 付款 */
  kind: 'receipt' | 'payment'
  subject: string
  totalAmount: number
  records: SettlementRecord[]
  onCreate: (input: SettlementInput) => Promise<unknown>
  onDelete: (id: string) => Promise<unknown>
}

const METHODS = ['匯款', '現金', '支票', '其他']

function today() {
  // Local date (not UTC) in YYYY-MM-DD
  return new Date().toLocaleDateString('sv-SE')
}

export function SettlementDialog({ open, onOpenChange, kind, subject, totalAmount, records, onCreate, onDelete }: Props) {
  const verb = kind === 'receipt' ? '收款' : '付款'
  const doneLabel = kind === 'receipt' ? '已收' : '已付'
  const leftLabel = kind === 'receipt' ? '未收' : '未付'

  const settled = records.reduce((s, r) => s + Number(r.amount), 0)
  const remaining = Math.max(totalAmount - settled, 0)

  const [form, setForm] = useState({ date: today(), amount: '', method: '匯款', reference_no: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (open) setForm({ date: today(), amount: remaining ? String(remaining) : '', method: '匯款', reference_no: '' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleCreate() {
    const amount = Number(form.amount)
    if (!form.amount || amount <= 0) { toast.error('請輸入金額'); return }
    if (amount > remaining && !confirm(`金額超過${leftLabel}餘額 $${remaining.toLocaleString()}，確定要登記？`)) return
    setSaving(true)
    try {
      await onCreate({
        date: form.date || today(),
        amount,
        method: form.method || undefined,
        reference_no: form.reference_no || undefined,
      })
      toast.success(`${verb}已登記`)
      setForm({ date: today(), amount: '', method: form.method, reference_no: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '登記失敗')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm(`確定要刪除這筆${verb}紀錄？`)) return
    try {
      await onDelete(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>登記{verb}</DialogTitle>
          <DialogDescription>{subject}</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-2 rounded-lg border p-3 text-center text-sm mt-2">
          <div><div className="text-muted-foreground">應{kind === 'receipt' ? '收' : '付'}</div><div className="font-semibold">${totalAmount.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">{doneLabel}</div><div className="font-semibold text-green-700">${settled.toLocaleString()}</div></div>
          <div><div className="text-muted-foreground">{leftLabel}</div><div className="font-semibold text-orange-600">${remaining.toLocaleString()}</div></div>
        </div>

        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="settle-date">{verb}日期</Label>
              <Input id="settle-date" type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="settle-amount">金額 *</Label>
              <Input id="settle-amount" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="settle-method">方式</Label>
              <Select id="settle-method" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                {METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <Label htmlFor="settle-ref">參考號碼</Label>
              <Input id="settle-ref" value={form.reference_no} placeholder="匯款末五碼、支票號碼" onChange={e => setForm({ ...form, reference_no: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>關閉</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? '登記中...' : `登記${verb}`}</Button>
          </div>
        </div>

        <div className="mt-4">
          <div className="text-sm font-medium mb-2">{verb}紀錄（{records.length}）</div>
          {records.length === 0 ? (
            <div className="text-sm text-muted-foreground py-3 text-center">尚無{verb}紀錄</div>
          ) : (
            <ul className="divide-y rounded-lg border">
              {records.map(r => (
                <li key={r.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">${Number(r.amount).toLocaleString()}</div>
                    <div className="text-muted-foreground">
                      {r.date}{r.method ? ` · ${r.method}` : ''}{r.reference_no ? ` · ${r.reference_no}` : ''}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" aria-label={`刪除${verb}紀錄`} onClick={() => handleDelete(r.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
