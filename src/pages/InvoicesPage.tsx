import { useEffect, useMemo, useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import {
  useTaxInvoices, useTaxSummary, useMyTaxId, useCreateTaxInvoice, useUpdateTaxInvoice, useDeleteTaxInvoice,
  useImportExpenseInvoices, currentPeriodKey, periodLabel, splitTaxIncluded, invoiceErrorText, downloadInvoicesCsv,
  type TaxInvoiceInput,
} from '@/hooks/useInvoices'
import { useProjects } from '@/hooks/useProjects'
import { useClients } from '@/hooks/useClients'
import { useReceivables } from '@/hooks/useReceivables'
import { openExpensePhoto } from '@/hooks/useCoreExtras'
import { ProjectSelect } from '@/components/ProjectSelect'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Plus, Download, Trash2, Ban, Undo2, Image as ImageIcon, FileInput } from 'lucide-react'
import { TAX_TYPE_LABELS, type InvoiceDirection, type InvoiceTaxType } from '@/types/database'
import { toast } from 'sonner'

const money = (n: number | string | null | undefined) => '$' + Math.round(Number(n ?? 0)).toLocaleString()
const PERIOD_MONTHS = [1, 3, 5, 7, 9, 11]

export default function InvoicesPage() {
  const cur = currentPeriodKey()
  const [year, setYear] = useState(Math.floor(cur / 100))
  const [period, setPeriod] = useState(cur)
  const { data: myTaxId, isLoading: taxIdLoading } = useMyTaxId()

  function pickPeriod(key: number) {
    setPeriod(key)
    setYear(Math.floor(key / 100))
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">發票與稅務</h1>
        <p className="text-sm text-muted-foreground">
          登記銷項（開給業主）與進項（廠商開給你）發票，每兩個月一期自動算出營業稅。數字供參考，申報以記帳士為準。
        </p>
      </div>

      {!taxIdLoading && !myTaxId && (
        <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          本店還沒有設定統一編號，進項發票無法判斷能不能扣抵。請聯絡平台管理員在「租戶管理」補上統編。
        </div>
      )}

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">期別統計</TabsTrigger>
          <TabsTrigger value="out">銷項發票</TabsTrigger>
          <TabsTrigger value="in">進項發票</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <SummaryTab year={year} setYear={setYear} current={cur} onOpenPeriod={pickPeriod} />
        </TabsContent>
        <TabsContent value="out">
          <InvoiceTab direction="out" period={period} setPeriod={pickPeriod} year={year} myTaxId={myTaxId ?? null} />
        </TabsContent>
        <TabsContent value="in">
          <InvoiceTab direction="in" period={period} setPeriod={pickPeriod} year={year} myTaxId={myTaxId ?? null} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// ── 期別統計 ──

function SummaryTab({ year, setYear, current, onOpenPeriod }: {
  year: number; setYear: (y: number) => void; current: number; onOpenPeriod: (k: number) => void
}) {
  const { data: rows = [], isLoading } = useTaxSummary(year)
  const thisYear = Math.floor(current / 100)
  const years = [thisYear, thisYear - 1, thisYear - 2]
  const totals = rows.reduce((t, r) => ({
    out_tax: t.out_tax + Number(r.out_tax), in_tax: t.in_tax + Number(r.in_deductible_tax), payable: t.payable + Number(r.tax_payable),
  }), { out_tax: 0, in_tax: 0, payable: 0 })

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base">營業稅期別統計</CardTitle>
            <CardDescription>應納 = 銷項稅額 − 可扣抵進項稅額 − 上期留抵；負數轉為留抵，滾到下一期。</CardDescription>
          </div>
          <Select aria-label="年度" value={String(year)} onChange={e => setYear(Number(e.target.value))} className="w-28">
            {years.map(y => <option key={y} value={y}>{y} 年</option>)}
          </Select>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? <div className="p-6 text-center text-muted-foreground">載入中...</div> : (
          <div className="divide-y">
            {rows.map(r => {
              const isCur = r.period === current
              return (
                <button key={r.period} type="button" onClick={() => onOpenPeriod(r.period)}
                  className={'w-full px-4 py-3 text-left hover:bg-accent/50 ' + (isCur ? 'bg-primary/5' : '')}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium">{r.label}{isCur && <Badge variant="secondary" className="ml-2">本期</Badge>}</div>
                    <div className={Number(r.tax_payable) > 0 ? 'font-semibold text-red-600' : 'font-semibold text-green-700'}>
                      {Number(r.tax_payable) > 0 ? `應納 ${money(r.tax_payable)}` : Number(r.credit_carried) > 0 ? `留抵 ${money(r.credit_carried)}` : '應納 $0'}
                    </div>
                  </div>
                  <div className="mt-1 grid grid-cols-2 gap-x-4 text-xs text-muted-foreground sm:grid-cols-4">
                    <span>銷項 {r.out_count} 張 · 銷售額 {money(Number(r.out_taxable_sales) + Number(r.out_zero_sales) + Number(r.out_exempt_sales))}</span>
                    <span>銷項稅額 {money(r.out_tax)}</span>
                    <span>進項 {r.in_count} 張 · 可扣抵 {money(r.in_deductible_sales)}</span>
                    <span>可扣抵稅額 {money(r.in_deductible_tax)}{Number(r.credit_brought) > 0 ? ` · 上期留抵 ${money(r.credit_brought)}` : ''}</span>
                  </div>
                </button>
              )
            })}
            <div className="flex flex-wrap justify-between gap-2 px-4 py-3 text-sm">
              <span className="text-muted-foreground">{year} 年合計</span>
              <span>銷項稅額 {money(totals.out_tax)} · 可扣抵 {money(totals.in_tax)} · 應納 <b>{money(totals.payable)}</b></span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ── 銷項／進項列表 ──

function InvoiceTab({ direction, period, setPeriod, year, myTaxId }: {
  direction: InvoiceDirection; period: number; setPeriod: (k: number) => void; year: number; myTaxId: string | null
}) {
  const canDelete = useCanDelete()
  const { data: rows = [], isLoading } = useTaxInvoices(direction, period)
  const { data: other = [] } = useTaxInvoices(direction === 'out' ? 'in' : 'out', period)
  const update = useUpdateTaxInvoice()
  const remove = useDeleteTaxInvoice()
  const importExp = useImportExpenseInvoices()
  const [open, setOpen] = useState(false)

  const valid = rows.filter(r => r.status === 'valid')
  const sum = valid.reduce((s, r) => ({ sales: s.sales + Number(r.sales_amount), tax: s.tax + Number(r.tax_amount) }), { sales: 0, tax: 0 })
  const deductibleTax = direction === 'in' ? valid.filter(r => r.deductible).reduce((s, r) => s + Number(r.tax_amount), 0) : 0
  const label = direction === 'out' ? '銷項' : '進項'
  const periodOptions = [year - 1, year].flatMap(y => PERIOD_MONTHS.map(m => y * 100 + m)).filter(k => k <= currentPeriodKey())
  if (!periodOptions.includes(period)) periodOptions.push(period)

  async function act(fn: () => Promise<unknown>, ok: string) {
    try { await fn(); toast.success(ok) } catch (err) { toast.error(invoiceErrorText(err)) }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select aria-label="期別" value={String(period)} onChange={e => setPeriod(Number(e.target.value))} className="w-44">
          {[...periodOptions].sort((a, b) => b - a).map(k => <option key={k} value={k}>{periodLabel(k)}</option>)}
        </Select>
        <div className="ml-auto flex flex-wrap gap-2">
          {direction === 'in' && (
            <Button variant="outline" size="sm" disabled={importExp.isPending}
              onClick={() => act(async () => { const n = await importExp.mutateAsync(); if (n === 0) throw { message: '沒有可匯入的支出（需有發票號碼且尚未登記）' } }, '已從支出匯入進項發票')}>
              <FileInput className="mr-1 h-4 w-4" />從支出匯入
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => downloadInvoicesCsv([...(direction === 'out' ? rows : other), ...(direction === 'out' ? other : rows)], `發票_${period}.csv`)}>
            <Download className="mr-1 h-4 w-4" />匯出本期 CSV
          </Button>
          <Button size="sm" onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" />新增{label}</Button>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            {label} {valid.length} 張 · 未稅 {money(sum.sales)} · 稅額 {money(sum.tax)}
            {direction === 'in' && <span className="ml-2 text-sm font-normal text-muted-foreground">（可扣抵稅額 {money(deductibleTax)}）</span>}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? <div className="p-6 text-center text-muted-foreground">載入中...</div> : rows.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              這一期還沒有{label}發票
              {direction === 'in' && <div className="mt-1 text-xs">LINE 拍照記帳的電子發票會自動登記在這裡，也可以按「從支出匯入」。</div>}
            </div>
          ) : (
            <ul className="divide-y">
              {rows.map(r => (
                <li key={r.id} className={'px-4 py-3 ' + (r.status === 'void' ? 'opacity-50' : '')}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium">
                        {r.invoice_no ?? '（無號碼）'}
                        {r.status === 'void' && <Badge variant="outline" className="ml-2">作廢</Badge>}
                        {r.tax_type !== 'taxable' && <Badge variant="secondary" className="ml-2">{TAX_TYPE_LABELS[r.tax_type]}</Badge>}
                        {r.photo_path && (
                          <button type="button" aria-label="看發票照片" className="ml-1 inline-flex align-middle text-primary"
                            onClick={() => openExpensePhoto(r.photo_path!).catch(e => toast.error(e instanceof Error ? e.message : '無法開啟照片'))}>
                            <ImageIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {[r.invoice_date, r.counterparty_name, r.counterparty_tax_id && `統編 ${r.counterparty_tax_id}`, r.project?.name].filter(Boolean).join(' · ')}
                      </div>
                      {direction === 'in' && r.status === 'valid' && (
                        <label className="mt-1 flex items-center gap-2 text-xs">
                          <Switch checked={!!r.deductible}
                            onCheckedChange={v => act(() => update.mutateAsync(v ? { id: r.id, deductible: true } : { id: r.id, deductible: false, deduct_note: r.deduct_note ?? '手動設為不可扣抵' }), v ? '已設為可扣抵' : '已設為不可扣抵')} />
                          <span className={r.deductible ? 'text-green-700' : 'text-muted-foreground'}>
                            {r.deductible ? '可扣抵' : `不可扣抵${r.deduct_note ? `：${r.deduct_note}` : ''}`}
                          </span>
                        </label>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-semibold">{money(r.total_amount)}</div>
                      <div className="text-xs text-muted-foreground">未稅 {money(r.sales_amount)} · 稅 {money(r.tax_amount)}</div>
                      <div className="mt-1 flex justify-end gap-1">
                        {r.status === 'valid' ? (
                          <Button variant="ghost" size="icon" aria-label="作廢" className="h-8 w-8"
                            onClick={() => confirm(`把 ${r.invoice_no ?? '這張發票'} 標記為作廢？作廢後不列入統計。`) && act(() => update.mutateAsync({ id: r.id, status: 'void' }), '已作廢')}>
                            <Ban className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button variant="ghost" size="icon" aria-label="取消作廢" className="h-8 w-8"
                            onClick={() => act(() => update.mutateAsync({ id: r.id, status: 'valid' }), '已恢復')}>
                            <Undo2 className="h-4 w-4" />
                          </Button>
                        )}
                        {canDelete && (
                          <Button variant="ghost" size="icon" aria-label="刪除發票" className="h-8 w-8"
                            onClick={() => confirm('刪除這筆發票登記？（支出本身不會被刪）') && act(() => remove.mutateAsync(r.id), '已刪除')}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <InvoiceDialog open={open} onOpenChange={setOpen} direction={direction} myTaxId={myTaxId} />
    </div>
  )
}

// ── 新增發票 ──

function InvoiceDialog({ open, onOpenChange, direction, myTaxId }: {
  open: boolean; onOpenChange: (v: boolean) => void; direction: InvoiceDirection; myTaxId: string | null
}) {
  const create = useCreateTaxInvoice()
  const { data: projects = [] } = useProjects()
  const { data: clients = [] } = useClients()
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
  const empty = {
    invoice_no: '', invoice_date: today, counterparty_name: '', counterparty_tax_id: '', buyer_tax_id: myTaxId ?? '',
    tax_type: 'taxable' as InvoiceTaxType, total: '', sales: '', tax: '', project_id: '', receivable_id: '', deductible: true, notes: '',
  }
  const [f, setF] = useState(empty)
  // 每次打開都重設（本店統編可能較晚載入）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (open) setF(empty) }, [open, myTaxId])
  const { data: receivables = [] } = useReceivables(f.project_id || undefined)
  const isOut = direction === 'out'

  const projectClient = useMemo(() => {
    const p = projects.find(x => x.id === f.project_id)
    return clients.find(c => c.id === p?.client_id) ?? null
  }, [projects, clients, f.project_id])

  function setTotal(v: string) {
    const n = Number(v)
    if (!v || Number.isNaN(n)) { setF({ ...f, total: v }); return }
    if (f.tax_type === 'taxable') {
      const { sales, tax } = splitTaxIncluded(n)
      setF({ ...f, total: v, sales: String(sales), tax: String(tax) })
    } else {
      setF({ ...f, total: v, sales: String(n), tax: '0' })
    }
  }

  function pickProject(id: string) {
    const p = projects.find(x => x.id === id)
    const c = clients.find(x => x.id === p?.client_id)
    setF({ ...f, project_id: id, receivable_id: '',
      counterparty_name: isOut && c && !f.counterparty_name ? c.name : f.counterparty_name,
      counterparty_tax_id: isOut && c?.tax_id && !f.counterparty_tax_id ? c.tax_id : f.counterparty_tax_id })
  }

  function pickReceivable(id: string) {
    const r = receivables.find(x => x.id === id)
    if (r && !f.total) {
      const { sales, tax } = splitTaxIncluded(Number(r.amount))
      setF({ ...f, receivable_id: id, total: String(r.amount), sales: String(sales), tax: String(tax) })
    } else setF({ ...f, receivable_id: id })
  }

  async function save() {
    const no = f.invoice_no.trim().toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (no && !/^[A-Z]{2}\d{8}$/.test(no)) { toast.error('發票號碼格式應為 2 個英文字母＋8 位數字'); return }
    if (!no && isOut) { toast.error('請輸入發票號碼'); return }
    const sales = Number(f.sales), tax = Number(f.tax || 0)
    if (!(sales >= 0) || f.sales === '' || !(tax >= 0)) { toast.error('請輸入金額'); return }
    for (const [k, v] of [['對象統編', f.counterparty_tax_id], ['買方統編', f.buyer_tax_id]] as const) {
      if (v && !/^\d{8}$/.test(v)) { toast.error(`${k}應為 8 位數字`); return }
    }
    const buyer = isOut ? null : (f.buyer_tax_id || null)
    const input: TaxInvoiceInput = {
      direction, invoice_no: no || null, invoice_date: f.invoice_date || today,
      counterparty_name: f.counterparty_name.trim() || null, counterparty_tax_id: f.counterparty_tax_id || null,
      buyer_tax_id: buyer, tax_type: f.tax_type, sales_amount: sales, tax_amount: tax,
      deductible: isOut ? null : f.deductible && !!buyer && buyer === myTaxId,
      deduct_note: isOut ? null : (!buyer ? '發票沒有買方統編（二聯式／一般收據）' : buyer !== myTaxId ? '買方統編不是本店' : f.deductible ? null : '手動設為不可扣抵'),
      project_id: f.project_id || null, receivable_id: isOut ? (f.receivable_id || null) : null, notes: f.notes.trim() || null,
    }
    try {
      await create.mutateAsync(input)
      toast.success(`${isOut ? '銷項' : '進項'}發票已登記`)
      setF(empty)
      onOpenChange(false)
    } catch (err) {
      toast.error(invoiceErrorText(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>新增{isOut ? '銷項' : '進項'}發票</DialogTitle>
          <DialogDescription>
            {isOut ? '登記開給業主的發票（在財政部平台或發票機開立後，把號碼和金額記在這裡）' : '登記廠商開給本店的發票'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>發票號碼{isOut && ' *'}</Label><Input value={f.invoice_no} onChange={e => setF({ ...f, invoice_no: e.target.value.toUpperCase() })} placeholder="AB12345678" /></div>
            <div><Label>發票日期</Label><Input type="date" value={f.invoice_date} onChange={e => setF({ ...f, invoice_date: e.target.value })} /></div>
          </div>
          <div>
            <Label>案件</Label>
            <ProjectSelect projects={projects} value={f.project_id} onChange={pickProject} emptyLabel={isOut ? '— 不指定案件 —' : '公司支出（不歸案件）'} />
          </div>
          {isOut && f.project_id && receivables.length > 0 && (
            <div>
              <Label>對應應收期別</Label>
              <Select value={f.receivable_id} onChange={e => pickReceivable(e.target.value)}>
                <option value="">— 不指定 —</option>
                {receivables.map(r => <option key={r.id} value={r.id}>{r.label}（{money(r.amount)}）</option>)}
              </Select>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div><Label>{isOut ? '買方名稱' : '賣方（廠商）名稱'}</Label><Input value={f.counterparty_name} onChange={e => setF({ ...f, counterparty_name: e.target.value })} placeholder={isOut ? projectClient?.name ?? '' : ''} /></div>
            <div><Label>{isOut ? '買方統編' : '賣方統編'}</Label><Input inputMode="numeric" maxLength={8} value={f.counterparty_tax_id} onChange={e => setF({ ...f, counterparty_tax_id: e.target.value.replace(/\D/g, '') })} placeholder={isOut ? '個人可空白' : ''} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>課稅別</Label>
              <Select value={f.tax_type} onChange={e => setF({ ...f, tax_type: e.target.value as InvoiceTaxType, tax: e.target.value === 'taxable' ? f.tax : '0' })}>
                {(Object.keys(TAX_TYPE_LABELS) as InvoiceTaxType[]).map(k => <option key={k} value={k}>{TAX_TYPE_LABELS[k]}</option>)}
              </Select>
            </div>
            <div><Label>含稅總額（自動拆）</Label><Input type="number" value={f.total} onChange={e => setTotal(e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>未稅金額 *</Label><Input type="number" value={f.sales} onChange={e => setF({ ...f, sales: e.target.value })} /></div>
            <div><Label>稅額</Label><Input type="number" value={f.tax} onChange={e => setF({ ...f, tax: e.target.value })} /></div>
          </div>
          {!isOut && (
            <div className="space-y-2 rounded-md border p-3">
              <div><Label>發票上的買方統編</Label><Input inputMode="numeric" maxLength={8} value={f.buyer_tax_id} onChange={e => setF({ ...f, buyer_tax_id: e.target.value.replace(/\D/g, '') })} placeholder="二聯式或沒打統編請留空" /></div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={f.deductible} onCheckedChange={v => setF({ ...f, deductible: v })} />
                可扣抵進項稅額
              </label>
              <p className="text-xs text-muted-foreground">
                買方統編{myTaxId ? `不是本店（${myTaxId}）` : '沒填'}時一律記為不可扣抵。餐費、交際費、自用小客車相關支出依法不得扣抵。
              </p>
            </div>
          )}
          <div><Label>備註</Label><Input value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button>
            <Button onClick={save} disabled={create.isPending}>登記</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

