import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, KeyRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import {
  useTeam, useTeamCreateUser, useTeamSetActive, useTeamSetRole, useTeamResetPassword, teamErrorText, type TeamUser,
} from '@/hooks/useTeam'

const ROLE_LABEL = { owner: '老闆', assistant: '助理' } as const

export default function TeamPage() {
  const { profile } = useAuth()
  const { data, isLoading, error } = useTeam()
  const create = useTeamCreateUser()
  const setActive = useTeamSetActive()
  const setRole = useTeamSetRole()
  const resetPw = useTeamResetPassword()

  const [addOpen, setAddOpen] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'assistant' })
  const [pwUser, setPwUser] = useState<TeamUser | null>(null)
  const [newPw, setNewPw] = useState('')

  if (profile?.role !== 'owner') return <div className="p-8 text-center text-muted-foreground">只有老闆可以管理帳號</div>
  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>
  if (error || !data) return <div className="p-8 text-center text-destructive">{teamErrorText(error)}</div>

  const full = data.max_users !== null && data.active_count >= data.max_users

  async function run(p: Promise<unknown>, ok: string) {
    try { await p; toast.success(ok); return true } catch (e) { toast.error(teamErrorText(e)); return false }
  }

  async function handleCreate() {
    if (!form.email.trim()) { toast.error('請輸入 Email'); return }
    if (form.password.length < 8) { toast.error('密碼至少要 8 個字'); return }
    const ok = await run(create.mutateAsync({
      _email: form.email.trim(), _password: form.password, _display_name: form.display_name.trim() || null, _role: form.role,
    }), '帳號已建立，請把 Email 和密碼交給對方登入')
    if (ok) { setAddOpen(false); setForm({ email: '', password: '', display_name: '', role: 'assistant' }) }
  }

  async function handleResetPw() {
    if (!pwUser) return
    if (newPw.length < 8) { toast.error('密碼至少要 8 個字'); return }
    const ok = await run(resetPw.mutateAsync({ _user_id: pwUser.user_id, _password: newPw }), '密碼已重設')
    if (ok) { setPwUser(null); setNewPw('') }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">帳號管理</h1>
          <p className="text-sm text-muted-foreground">
            使用中 {data.active_count} 個{data.max_users !== null ? ` ／ 上限 ${data.max_users} 個` : '（不限數量）'}
          </p>
        </div>
        <Button onClick={() => setAddOpen(true)} disabled={full}>
          <UserPlus className="mr-2 h-4 w-4" />{full ? '已達上限' : '新增帳號'}
        </Button>
      </div>

      <div className="grid gap-3">
        {data.users.map(u => (
          <Card key={u.user_id} className={u.is_active ? '' : 'opacity-60'}>
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 font-medium">
                  <span className="truncate">{u.display_name ?? u.email}</span>
                  {u.is_me && <Badge variant="secondary">我</Badge>}
                  {!u.is_active && <Badge variant="outline">已停用</Badge>}
                </div>
                <div className="truncate text-sm text-muted-foreground">{u.email}</div>
              </div>
              {u.is_me ? (
                <Badge>{ROLE_LABEL[u.role]}</Badge>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                    value={u.role}
                    onChange={e => run(setRole.mutateAsync({ _user_id: u.user_id, _role: e.target.value }), '角色已更新')}
                  >
                    <option value="assistant">助理</option>
                    <option value="owner">老闆</option>
                  </select>
                  <Button variant="outline" size="sm" onClick={() => { setPwUser(u); setNewPw('') }}>
                    <KeyRound className="mr-1 h-4 w-4" />重設密碼
                  </Button>
                  <label className="flex items-center gap-2 text-sm">
                    <Switch
                      checked={u.is_active}
                      onCheckedChange={v => run(setActive.mutateAsync({ _user_id: u.user_id, _active: v }), v ? '帳號已啟用' : '帳號已停用')}
                    />
                    {u.is_active ? '啟用中' : '停用'}
                  </label>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增帳號</DialogTitle>
            <DialogDescription>建立後把 Email 和密碼交給對方，就能直接登入。</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div><Label>姓名</Label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>密碼 *（至少 8 個字）</Label><Input value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div>
              <Label>角色</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="assistant">助理（看不到金額總覽、不能刪資料）</option>
                <option value="owner">老闆（全部權限）</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAddOpen(false)}>取消</Button>
              <Button onClick={handleCreate} disabled={create.isPending}>建立</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!pwUser} onOpenChange={o => !o && setPwUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重設密碼</DialogTitle>
            <DialogDescription>{pwUser?.display_name ?? pwUser?.email} 的新密碼</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Input value={newPw} placeholder="至少 8 個字" onChange={e => setNewPw(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setPwUser(null)}>取消</Button>
              <Button onClick={handleResetPw} disabled={resetPw.isPending}>確定</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
