import { useState, type ReactNode } from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'

/**
 * 刪除／危險操作的確認對話框，取代瀏覽器內建 confirm()。
 * 用 warning 說明關聯資料會一起被刪除。
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  warning,
  confirmLabel = '確定刪除',
  onConfirm,
}: {
  trigger: ReactNode
  title: string
  description?: string
  /** 紅色警告文字，例如「相關的報價單與款項紀錄會一併刪除」 */
  warning?: string
  confirmLabel?: string
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && <AlertDialogDescription>{description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {warning && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{warning}</p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              onConfirm()
              setOpen(false)
            }}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
