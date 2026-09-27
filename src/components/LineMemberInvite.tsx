import { useState } from 'react'
import { useIssueLineCode, useUnbindMember, type LineInvite, type LineMember, type LineScope } from '@/hooks/useLine'
import { lineInviteMessage, lineSendCodeUrl, lineShareUrl, formatExpiry } from '@/lib/line'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { CheckCircle2, Copy, MessageCircle, RefreshCw, Send } from 'lucide-react'
import { toast } from 'sonner'

/** 顯示代發的綁定邀請：綁定碼、用 LINE 傳給對方、複製邀請訊息 */
export function LineInviteDialog({
  invite, name, open, onOpenChange, onRegenerate, regenerating,
}: {
  invite: LineInvite | null
  name?: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  if (!invite) return null
  const message = lineInviteMessage({
    code: invite.code, expiresAt: invite.expires_at,
    name: name ?? invite.display_name, tenantName: invite.tenant_name,
  })

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      toast.success('已複製邀請訊息')
    } catch {
      toast.error('無法複製，請手動選取下方文字')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>LINE 綁定邀請：{name ?? invite.display_name ?? ''}</DialogTitle>
          <DialogDescription>
            把邀請傳給對方，對方用自己的 LINE 加好友、送出綁定碼就完成，不用登入網頁。
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg border bg-muted/40 p-4 text-center space-y-1">
          <div className="text-xs text-muted-foreground">綁定碼（{formatExpiry(invite.expires_at)} 前有效，只能用一次）</div>
          <div className="text-3xl font-bold tracking-[0.25em] font-mono">{invite.code}</div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <a href={lineShareUrl(message)} target="_blank" rel="noreferrer" className={buttonVariants()}>
            <Send className="mr-2 h-4 w-4" />用 LINE 傳給對方
          </a>
          <Button variant="outline" onClick={copy}>
            <Copy className="mr-2 h-4 w-4" />複製邀請訊息
          </Button>
        </div>

        <Textarea readOnly value={message} rows={8} className="text-xs" onFocus={e => e.currentTarget.select()} />

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
          <a href={lineSendCodeUrl(invite.code)} target="_blank" rel="noreferrer" className="underline">
            對方的手機就在旁邊？直接用他的手機開這個連結
          </a>
          {onRegenerate && (
            <Button variant="ghost" size="sm" onClick={onRegenerate} disabled={regenerating}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" />重新產生
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** 一位成員的 LINE 綁定狀態與動作（邀請、查看邀請、解除） */
export function LineMemberStatus({ member, scope }: { member: LineMember; scope: LineScope }) {
  const issue = useIssueLineCode(scope)
  const unbind = useUnbindMember(scope)
  const [invite, setInvite] = useState<LineInvite | null>(null)
  const [open, setOpen] = useState(false)

  const pending = member.bind_code && member.code_expires_at
    ? { code: member.bind_code, expires_at: member.code_expires_at, display_name: member.display_name, tenant_name: null }
    : null

  async function handleIssue() {
    try {
      const inv = await issue.mutateAsync(member.user_id)
      setInvite(inv)
      setOpen(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '產生失敗')
    }
  }

  function showPending() {
    setInvite(pending)
    setOpen(true)
  }

  async function handleUnbind() {
    if (!confirm(`解除「${member.display_name ?? member.email ?? ''}」的 LINE 綁定？解除後他的 LINE 就不能再回報或記帳。`)) return
    try {
      await unbind.mutateAsync(member.user_id)
      toast.success('已解除綁定')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解除失敗')
    }
  }

  if (!member.is_active) return <span className="text-xs text-muted-foreground">帳號停用</span>

  return (
    <div className="flex flex-wrap items-center gap-2">
      {member.bound_at ? (
        <span className="inline-flex items-center gap-1 text-sm">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          {member.line_display_name ? `「${member.line_display_name}」` : '已綁定'}
        </span>
      ) : pending ? (
        <Badge variant="outline">邀請中・{formatExpiry(pending.expires_at)} 前</Badge>
      ) : (
        <Badge variant="secondary">未綁定</Badge>
      )}

      {pending ? (
        <Button size="sm" variant="outline" onClick={showPending}>
          <MessageCircle className="mr-1 h-3.5 w-3.5" />查看邀請
        </Button>
      ) : (
        <Button size="sm" variant={member.bound_at ? 'ghost' : 'outline'} onClick={handleIssue} disabled={issue.isPending}>
          <MessageCircle className="mr-1 h-3.5 w-3.5" />{member.bound_at ? '換 LINE' : '邀請綁定'}
        </Button>
      )}
      {(member.bound_at || pending) && (
        <Button size="sm" variant="ghost" className="text-muted-foreground" onClick={handleUnbind} disabled={unbind.isPending}>
          解除
        </Button>
      )}

      <LineInviteDialog
        invite={invite}
        name={member.display_name}
        open={open}
        onOpenChange={setOpen}
        onRegenerate={handleIssue}
        regenerating={issue.isPending}
      />
    </div>
  )
}
