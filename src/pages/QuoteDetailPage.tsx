import { useState } from 'react'
import { useParams, Link } from '@tanstack/react-router'
import { useQuote, useQuoteItems, useUpdateQuote, useCreateQuoteItem, useDeleteQuoteItem, useRecalcQuote } from '@/hooks/useQuotes'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'
import type { QuoteStatus } from '@/types/database'
import { toast } from 'sonner'

const statusStyle: Record<QuoteStatus, string> = {
  '草稿': 'bg-gray-100 text-gray-800',
  '已送出': 'bg-blue-100 text-blue-800',
  '已接受': 'bg-green-100 text-green-800',
  '已拒絕': 'bg-red-100 text-red-800',
  '已過期': 'bg-yellow-100 text-yellow-800',
}
const allStatuses: QuoteStatus[] = ['草稿', '已送出', '已接受', '已拒絕', '已過期']

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: quote, isLoading } = useQuote(id)
  const { data: items = [] } = useQuoteItems(id)
  const updateQuote = useUpdateQuote()
  const createItem = useCreateQuoteItem()
  const deleteItem = useDeleteQuoteItem()
  const recalc = useRecalcQuote()

  const [itemDialog, setItemDialog] = useState(false)
  const [itemForm, setItemForm] = useState({ description: '', unit: '', quantity: '1', unit_price: '0' })

  async function handleStatusChange(status: QuoteStatus) {
    if (!id) return
    try {
      await updateQuote.mutateAsync({ id, status })
      toast.success('狀態已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
    }
  }

  async function handleAddItem() {
    if (!id) return
    if (!itemForm.description.trim()) { toast.error('請輸入品項說明'); return }
    const qty = Number(itemForm.quantity) || 1
    const price = Number(itemForm.unit_price) || 0
    try {
      await createItem.mutateAsync({
        quote_id: id,
        description: itemForm.description,
        unit: itemForm.unit || undefined,
        quantity: qty,
        unit_price: price,
        amount: qty * price,
        sort_order: items.length,
      })
      await recalc.mutateAsync(id)
      toast.success('明細已新增')
      setItemDialog(false)
      setItemForm({ description: '', unit: '', quantity: '1', unit_price: '0' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '新增失敗')
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!id) return
    try {
      await deleteItem.mutateAsync(itemId)
      await recalc.mutateAsync(id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>
  if (!quote) return <div className="p-8 text-center text-muted-foreground">找不到報價單</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/quotes"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <h1 className="text-2xl font-bold">{quote.title}</h1>
        <Badge className={statusStyle[quote.status]} variant="secondary">{quote.status}</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">報價資訊</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">編號</span><span>{quote.quote_no ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">案件</span><span>{(quote.project as { name: string } | null)?.name ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">報價日期</span><span>{quote.quote_date}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">有效期限</span><span>{quote.valid_until ?? '—'}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">金額 & 狀態</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">小計</span><span>${quote.subtotal.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">稅 (5%)</span><span>${quote.tax.toLocaleString()}</span></div>
            <div className="flex justify-between font-semibold text-base"><span>合計</span><span>${quote.total.toLocaleString()}</span></div>
            <div className="pt-2">
              <Label>變更狀態</Label>
              <Select value={quote.status} onChange={e => handleStatusChange(e.target.value as QuoteStatus)}>
                {allStatuses.map(s => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Items */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">報價明細 ({items.length})</CardTitle>
          <Button size="sm" onClick={() => setItemDialog(true)}><Plus className="mr-1 h-4 w-4" />新增品項</Button>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>品項說明</TableHead>
                <TableHead>單位</TableHead>
                <TableHead className="text-right">數量</TableHead>
                <TableHead className="text-right">單價</TableHead>
                <TableHead className="text-right">金額</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.unit ?? '—'}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">${Number(item.unit_price).toLocaleString()}</TableCell>
                  <TableCell className="text-right font-medium">${Number(item.amount).toLocaleString()}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">尚無明細，點擊「新增品項」開始</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add item dialog */}
      <Dialog open={itemDialog} onOpenChange={setItemDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增報價品項</DialogTitle>
            <DialogDescription>輸入品項的說明、數量和單價</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>品項說明 *</Label><Input value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })} placeholder="例：拆除工程" /></div>
            <div className="grid grid-cols-3 gap-3">
              <div><Label>單位</Label><Input value={itemForm.unit} onChange={e => setItemForm({ ...itemForm, unit: e.target.value })} placeholder="式/坪/m" /></div>
              <div><Label>數量</Label><Input type="number" value={itemForm.quantity} onChange={e => setItemForm({ ...itemForm, quantity: e.target.value })} /></div>
              <div><Label>單價</Label><Input type="number" value={itemForm.unit_price} onChange={e => setItemForm({ ...itemForm, unit_price: e.target.value })} /></div>
            </div>
            <div className="text-sm text-right text-muted-foreground">
              金額：${((Number(itemForm.quantity) || 0) * (Number(itemForm.unit_price) || 0)).toLocaleString()}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setItemDialog(false)}>取消</Button>
              <Button onClick={handleAddItem}>新增</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
