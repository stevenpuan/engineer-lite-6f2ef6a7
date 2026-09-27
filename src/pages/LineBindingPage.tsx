import { useEffect, useState } from 'react'
import { useLineBinding, useNewBindCode, useUnbindLine } from '@/hooks/useLine'
import { useLineMembers } from '@/hooks/useLine'
import { useCanDelete } from '@/hooks/useCanDelete'
import { LINE_ADD_FRIEND_URL, LINE_OA_BASIC_ID, LINE_MENU_KEYWORDS, formatExpiry } from '@/lib/line'
import { LineMemberStatus } from '@/components/LineMemberInvite'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, MessageCircle, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'

function secondsLeft(iso: string | null) {
  if (!iso) return 0
  return Math.max(0, Math.floor((new Date(iso).getTime() - Date.now()) / 1000))
}

/** 老闆：店內成員的 LINE 綁定，可以替成員發邀請，成員不用登入網頁 */
function MembersCard() {
  const { data: members = [], isLoading } = useLineMembers({ kind: 'tenant' })
  const bound = members.filter(m => m.is_active && m.bound_at).length
  const active = members.filter(m => m.is_active).length
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">店內成員的 LINE（{bound}／{active} 已綁定）</CardTitle>
        <p className="text-sm text-muted-foreground">按「邀請綁定」產生邀請，用 LINE 傳給成員；成員加好友、送出綁定碼就完成，不用登入網頁。</p>
      </CardHeader>
      <CardContent className="p-0">
        {isLoading ? (
          <div className="p-6 text-center text-sm text-muted-foreground">載入中...</div>
        ) : (
          <ul className="divide-y">
            {members.map(m => (
              <li key={m.user_id} className="flex flex-col gap-2 px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="font-medium truncate">{m.display_name ?? m.email}</div>
                  <div className="text-xs text-muted-foreground">{m.role === 'owner' ? '老闆' : '助理'}{m.email ? `・${m.email}` : ''}</div>
                </div>
                <LineMemberStatus member={m} scope={{ kind: 'tenant' }} />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}

export default function LineBindingPage() {
  const isOwner = useCanDelete()
  const [waiting, setWaiting] = useState(false)
  const { data: binding, isLoading } = useLineBinding(waiting)
  const newCode = useNewBindCode()
  const unbind = useUnbindLine()
  const [, tick] = useState(0)

  const bound = !!binding?.line_user_id
  const code = binding?.bind_code && secondsLeft(binding.code_expires_at) > 0 ? binding.bind_code : null
  const left = secondsLeft(binding?.code_expires_at ?? null)

  // countdown + stop polling once bound or expired
  useEffect(() => {
    if (!code) { setWaiting(false); return }
    const t = setInterval(() => tick(n => n + 1), 1000)
    return () => clearInterval(t)
  }, [code])
  useEffect(() => {
    if (waiting && bound && !binding?.bind_code) {
      setWaiting(false)
      toast.success('LINE 綁定成功')
    }
  }, [waiting, bound, binding?.bind_code])

  async function handleNewCode() {
    try {
      await newCode.mutateAsync()
      setWaiting(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '產生失敗')
    }
  }

  async function handleUnbind() {
    if (!confirm('解除綁定後，這個 LINE 就不能再回報進度或記帳。確定解除？')) return
    try {
      await unbind.mutateAsync()
      toast.success('已解除綁定')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '解除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">LINE 綁定</h1>
        <p className="text-sm text-muted-foreground">綁定後可以在 LINE 回報進度、拍照記帳、查收付款，每天早上 8 點收到今日重點。</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">綁定狀態</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {bound ? (
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <div className="font-medium">已綁定 {binding?.line_display_name ? `「${binding.line_display_name}」` : ''}</div>
                  {binding?.bound_at && <div className="text-xs text-muted-foreground">綁定時間 {new Date(binding.bound_at).toLocaleString('zh-TW')}</div>}
                </div>
              </div>
              <Button variant="outline" onClick={handleUnbind} disabled={unbind.isPending}>解除綁定</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">尚未綁定</Badge>
            </div>
          )}

          {code ? (
            <div className="rounded-lg border bg-muted/40 p-4 text-center space-y-2">
              <div className="text-sm text-muted-foreground">
                綁定碼（{left > 3600 ? `${formatExpiry(binding!.code_expires_at!)} 前` : `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} 內`}有效）
              </div>
              <div className="text-4xl font-bold tracking-[0.3em] font-mono">{code}</div>
              <div className="text-sm text-muted-foreground">把這組綁定碼傳給 LINE 官方帳號，綁定完成這裡會自動更新。</div>
            </div>
          ) : (
            <Button onClick={handleNewCode} disabled={newCode.isPending}>
              <RefreshCw className="mr-2 h-4 w-4" />{bound ? '改綁另一個 LINE' : '產生綁定碼'}
            </Button>
          )}
        </CardContent>
      </Card>

      {isOwner && <MembersCard />}

      <Card>
        <CardHeader><CardTitle className="text-base">怎麼綁定</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              加入 LINE 官方帳號好友
              {LINE_ADD_FRIEND_URL ? (
                <> ：<a href={LINE_ADD_FRIEND_URL} target="_blank" rel="noreferrer" className="text-primary underline inline-flex items-center gap-1"><MessageCircle className="h-4 w-4" />{LINE_OA_BASIC_ID}</a></>
              ) : (
                <span className="text-muted-foreground">（官方帳號 ID 設定中，請洽系統管理員）</span>
              )}
            </li>
            <li>在上方按「產生綁定碼」</li>
            <li>把綁定碼傳給官方帳號</li>
          </ol>
          <p className="text-muted-foreground">店內成員也可以由老闆在下方「店內成員的 LINE」發邀請，成員不用登入網頁。</p>
          <div className="pt-2">
            <div className="font-medium mb-1">LINE 裡可以用的指令</div>
            <div className="flex flex-wrap gap-1.5">
              {LINE_MENU_KEYWORDS.map(k => <span key={k} className="rounded-full bg-muted px-2.5 py-1 text-xs">{k}</span>)}
            </div>
            <p className="text-muted-foreground mt-2">也可以直接傳收據照片，系統會帶你輸入金額、選案件和類別。</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
