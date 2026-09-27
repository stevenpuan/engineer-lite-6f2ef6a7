import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

/**
 * 全站共用的狀態標籤。顏色定義在 styles.css 的 --status-* token，
 * 各頁面不要再寫死 bg-yellow-100 之類的顏色。
 */
const statusStyles: Record<string, string> = {
  // 案件狀態
  '洽談中': 'bg-status-pending text-status-pending-foreground',
  '進行中': 'bg-status-active text-status-active-foreground',
  '完工': 'bg-status-done text-status-done-foreground',
  '結案': 'bg-status-closed text-status-closed-foreground',
  '取消': 'bg-status-cancelled text-status-cancelled-foreground',
  // 帳款狀態
  '待收': 'bg-status-pending text-status-pending-foreground',
  '已請款': 'bg-status-active text-status-active-foreground',
  '部分收款': 'bg-status-pending text-status-pending-foreground',
  '已收': 'bg-status-done text-status-done-foreground',
  '逾期': 'bg-status-cancelled text-status-cancelled-foreground',
  '待付': 'bg-status-pending text-status-pending-foreground',
  '部分付款': 'bg-status-pending text-status-pending-foreground',
  '已付': 'bg-status-done text-status-done-foreground',
  '未付': 'bg-status-pending text-status-pending-foreground',
  '部分': 'bg-status-active text-status-active-foreground',
  // 報價單狀態
  '草稿': 'bg-status-closed text-status-closed-foreground',
  '已送出': 'bg-status-active text-status-active-foreground',
  '已接受': 'bg-status-done text-status-done-foreground',
  '已拒絕': 'bg-status-cancelled text-status-cancelled-foreground',
  '已過期': 'bg-status-pending text-status-pending-foreground',
}

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="secondary" className={cn('border-0', statusStyles[status], className)}>
      {status}
    </Badge>
  )
}
