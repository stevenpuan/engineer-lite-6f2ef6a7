import { useState } from 'react'
import { useAdminTenants, useAdminTenantUsers, useCreateUser, useUpdateUserRole, useToggleUserActive } from '@/hooks/useAdmin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { UserPlus } from 'lucide-react'
import { useLineMembers, useIssueLineCode, type LineInvite, type LineScope } from '@/hooks/useLine'
import { LineMemberStatus, LineInviteDialog } from '@/components/LineMemberInvite'
import { toast } from 'sonner'

export default function UsersPage() {
  const { data: tenants = [] } = useAdminTenants()
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const { data: users = [], isLoading } = useAdminTenantUsers(selectedTenant || undefined)
  const createUser = useCreateUser()
  const updateRole = useUpdateUserRole()
  const toggleActive = useToggleUserActive()
  const lineScope: LineScope | null = selectedTenant ? { kind: 'platform', tenantId: selectedTenant } : null
  const { data: lineMembers = [] } = useLineMembers(lineScope)
  const lineByUser = new Map(lineMembers.map(m => [m.user_id, m]))
  const issueCode = useIssueLineCode(lineScope ?? { kind: 'platform', tenantId: '' })
  const [newInvite, setNewInvite] = useState<{ invite: LineInvite; name: string } | null>(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', display_name: '', role: 'assistant' })

  async function handleCreateUser() {
    if (!selectedTenant) { toast.error('請先選擇租戶'); return }
    if (!form.email || !form.password) { toast.error('請填寫 Email 和密碼'); return }
    try {
      const uid = await createUser.mutateAsync({
        _tenant_id: selectedTenant,
        _email: form.email,
        _password: form.password,
        _display_name: form.display_name || undefined,
        _role: form.role,
      })
      toast.success('使用者已建立')
      setDialogOpen(false)
      const name = form.display_name || form.email
      setForm({ email: '', password: '', display_name: '', role: 'assistant' })
      // 建好帳號順便產生 LINE 綁定邀請（這家店沒開 LINE 助手就略過）
      if (typeof uid === 'string') {
        try {
          const invite = await issueCode.mutateAsync(uid)
          setNewInvite({ invite, name })
        } catch {
          /* 未開 LINE 助手 */
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '建立失敗')
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    try {
      await updateRole.mutateAsync({ _user_id: userId, _role: role })
      toast.success('角色已更新')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
    }
  }

  async function handleToggleActive(userId: string, active: boolean) {
    try {
      await toggleActive.mutateAsync({ _user_id: userId, _active: active })
      toast.success(active ? '已啟用' : '已停用')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">使用者管理</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select
          value={selectedTenant}
          onChange={e => setSelectedTenant(e.target.value)}
          className="max-w-xs"
        >
          <option value="">— 選擇租戶 —</option>
          {tenants.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
        </Select>

        {selectedTenant && (
          <Button onClick={() => setDialogOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />新增使用者
          </Button>
        )}
      </div>

      {selectedTenant && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">使用者列表 ({users.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground">載入中...</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>名稱</TableHead>
                    <TableHead>角色</TableHead>
                    <TableHead>啟用</TableHead>
                    <TableHead>LINE</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.email}</TableCell>
                      <TableCell>{u.display_name ?? '—'}</TableCell>
                      <TableCell>
                        <Select
                          value={u.role}
                          onChange={e => handleRoleChange(u.id, e.target.value)}
                          className="w-32"
                        >
                          <option value="owner">老闆</option>
                          <option value="assistant">助理</option>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={u.is_active}
                          onCheckedChange={checked => handleToggleActive(u.id, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        {lineScope && lineByUser.get(u.id)
                          ? <LineMemberStatus member={lineByUser.get(u.id)!} scope={lineScope} />
                          : <span className="text-xs text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">此租戶尚無使用者</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <LineInviteDialog
        invite={newInvite?.invite ?? null}
        name={newInvite?.name}
        open={!!newInvite}
        onOpenChange={o => { if (!o) setNewInvite(null) }}
      />

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新增使用者</DialogTitle>
            <DialogDescription>為租戶建立新的使用者帳號</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div><Label>Email *</Label><Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div><Label>密碼 *</Label><Input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></div>
            <div><Label>顯示名稱</Label><Input value={form.display_name} onChange={e => setForm({ ...form, display_name: e.target.value })} /></div>
            <div>
              <Label>角色</Label>
              <Select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="owner">老闆（完整權限、看得到毛利、可刪除）</option>
                <option value="assistant">助理（可新增修改，不能刪除、看不到毛利）</option>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleCreateUser}>建立</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
