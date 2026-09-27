// ── Core types matching Supabase schema ──

export interface Tenant {
  id: string
  name: string
  display_name: string | null
  tax_id: string | null
  industry: string | null
  status: 'active' | 'trial' | 'suspended' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Profile {
  id: string
  user_id: string
  tenant_id: string
  display_name: string | null
  email: string | null
  role: 'owner' | 'assistant'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface Module {
  module_key: string
  label: string
  category: 'core' | 'addon'
  sort_order: number
}

export interface TenantModule {
  tenant_id: string
  module_key: string
  enabled: boolean
  enabled_at: string | null
}

export interface Client {
  id: string
  tenant_id: string
  name: string
  contact_name: string | null
  phone: string | null
  email: string | null
  tax_id: string | null
  address: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type ProjectStatus = '洽談中' | '進行中' | '完工' | '結案' | '取消'

export interface Project {
  id: string
  tenant_id: string
  client_id: string | null
  name: string
  address: string | null
  status: ProjectStatus
  contract_amount: number | null
  start_date: string | null
  end_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client | null
}

// ── B2: Money modules ──

export type QuoteStatus = '草稿' | '已送出' | '已接受' | '已拒絕' | '已過期'

export interface Quote {
  id: string
  tenant_id: string
  project_id: string
  quote_no: string | null
  title: string
  status: QuoteStatus
  quote_date: string
  valid_until: string | null
  subtotal: number
  tax: number
  total: number
  notes: string | null
  parent_quote_id: string | null
  version: number
  is_latest: boolean
  created_at: string
  updated_at: string
  project?: Project | null
}

export interface QuoteItem {
  id: string
  quote_id: string
  description: string
  unit: string | null
  quantity: number
  unit_price: number
  amount: number
  sort_order: number
  notes: string | null
  created_at: string
}

export type ReceivableStatus = 'pending' | 'invoiced' | 'partial' | 'paid' | 'overdue' | 'cancelled'

export interface Receivable {
  id: string
  tenant_id: string
  project_id: string
  label: string
  amount: number
  due_date: string | null
  status: ReceivableStatus
  notes: string | null
  created_at: string
  updated_at: string
  project?: Project | null
}

export interface Receipt {
  id: string
  receivable_id: string
  received_date: string
  amount: number
  method: string | null
  reference_no: string | null
  notes: string | null
  created_at: string
}

export type ExpenseCategory =
  | 'material' | 'fuel' | 'meal' | 'transport' | 'fee' | 'machinery'
  | 'labor' | 'insurance' | 'rental' | 'utility' | 'maintenance' | 'sundry' | 'other'

export type ExpensePayStatus = 'unpaid' | 'paid' | 'partial' | 'cancelled'

export interface Expense {
  id: string
  tenant_id: string
  project_id: string | null
  expense_date: string
  category: ExpenseCategory
  description: string
  amount: number
  status: ExpensePayStatus
  payment_method: string | null
  vendor_name: string | null
  receipt_no: string | null
  is_overhead: boolean
  notes: string | null
  photo_path: string | null
  seller_tax_id?: string | null
  created_at: string
  updated_at: string
  project?: Project | null
}

export type PayableStatus = 'pending' | 'partial' | 'paid' | 'cancelled'

export interface Payable {
  id: string
  tenant_id: string
  project_id: string | null
  vendor_name: string
  description: string | null
  amount: number
  due_date: string | null
  status: PayableStatus
  notes: string | null
  created_at: string
  updated_at: string
  project?: Project | null
}

export interface Payment {
  id: string
  payable_id: string
  paid_date: string
  amount: number
  method: string | null
  reference_no: string | null
  notes: string | null
  created_at: string
}

export interface ProjectFinanceSummary {
  project_id: string
  tenant_id: string
  project_name: string
  project_status: string
  contract_amount: number | null
  quote_count: number
  quote_total: number
  receivable_total: number
  received_total: number
  expense_total: number
  payable_total: number
  paid_total: number
}

// ── Platform Admin RPC return types ──

export interface TenantListItem extends Tenant {
  user_count: number
  module_count: number
}

export interface TenantUser {
  id: string
  email: string
  display_name: string | null
  role: 'owner' | 'assistant'
  is_active: boolean
  created_at: string
}

export interface TenantModuleItem {
  module_key: string
  label: string
  category: 'core' | 'addon'
  sort_order: number
  enabled: boolean
  enabled_at: string | null
}

// ── Display helpers ──

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  material: '材料',
  fuel: '油資',
  meal: '餐費',
  transport: '運費',
  fee: '規費',
  machinery: '機具租金',
  labor: '工資',
  insurance: '保險',
  rental: '租金',
  utility: '水電瓦斯',
  maintenance: '維修',
  sundry: '雜支',
  other: '其他',
}

export const RECEIVABLE_STATUS_LABELS: Record<ReceivableStatus, string> = {
  pending: '待請款',
  invoiced: '已開票',
  partial: '部分收款',
  paid: '已收',
  overdue: '逾期',
  cancelled: '取消',
}

export const PAYABLE_STATUS_LABELS: Record<PayableStatus, string> = {
  pending: '待付',
  partial: '部分付款',
  paid: '已付',
  cancelled: '取消',
}

// ── B3: Progress (module:progress) ──

export interface StageTemplate {
  id: string
  tenant_id: string
  name: string
  stages: string[]
  sort_order: number
  created_at: string
  updated_at: string
}

export interface ProjectStage {
  id: string
  tenant_id: string
  project_id: string
  name: string
  sort_order: number
  due_date: string | null
  percent: number
  created_at: string
  updated_at: string
}

export interface ProgressLog {
  id: string
  tenant_id: string
  project_id: string
  stage_id: string
  log_date: string
  percent: number
  note: string | null
  source: 'web' | 'line'
  reported_by: string | null
  created_at: string
  stage?: { name: string } | null
}

export interface ProjectProgress {
  project_id: string
  tenant_id: string
  stage_count: number
  overall_percent: number
  last_report_at: string | null
}

// ── B3c: 常用單價庫、本月帳務 ──

export interface PriceBookItem {
  id: string
  tenant_id: string
  name: string
  unit: string | null
  unit_price: number
  use_count: number
  last_used_at: string
}

export interface ProjectMargin {
  project_id: string
  name: string
  status: string
  revenue: number
  cost: number
  margin: number
}

export interface DashboardMonth {
  month: string
  is_owner: boolean
  recv_due_month?: number
  recv_overdue?: number
  recv_overdue_count?: number
  recv_received_month?: number
  pay_due_month?: number
  pay_overdue?: number
  pay_paid_month?: number
  expense_month?: number
  cash_in: number
  cash_out: number
  cash_net: number
  margins?: ProjectMargin[]
  /** 進行中＋完工案件總數（margins 只列毛利率最低的 20 件） */
  margins_total?: number
}

// ── 發票與稅務（module:invoice）──

export type InvoiceDirection = 'out' | 'in'
export type InvoiceTaxType = 'taxable' | 'zero' | 'exempt'

export const TAX_TYPE_LABELS: Record<InvoiceTaxType, string> = {
  taxable: '應稅 5%',
  zero: '零稅率',
  exempt: '免稅',
}

export interface TaxInvoice {
  id: string
  tenant_id: string
  direction: InvoiceDirection
  invoice_no: string | null
  invoice_date: string
  period_key: number
  counterparty_name: string | null
  counterparty_tax_id: string | null
  buyer_tax_id: string | null
  tax_type: InvoiceTaxType
  sales_amount: number
  tax_amount: number
  total_amount: number
  deductible: boolean | null
  deduct_note: string | null
  status: 'valid' | 'void'
  source: 'web' | 'line' | 'import'
  project_id: string | null
  expense_id: string | null
  payable_id: string | null
  receivable_id: string | null
  photo_path: string | null
  notes: string | null
  created_at: string
  updated_at: string
  project?: { id: string; name: string } | null
}

export interface TaxPeriodSummary {
  period: number
  label: string
  out_count: number
  out_taxable_sales: number
  out_zero_sales: number
  out_exempt_sales: number
  out_tax: number
  in_count: number
  in_deductible_sales: number
  in_deductible_tax: number
  in_nondeductible_total: number
  credit_brought: number
  tax_payable: number
  credit_carried: number
}
