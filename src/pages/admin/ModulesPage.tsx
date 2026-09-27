import { useState } from 'react'
import { useAdminTenants, useAdminTenantModules, useToggleModule } from '@/hooks/useAdmin'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'

export default function ModulesPage() {
  const { data: tenants = [] } = useAdminTenants()
  const [selectedTenant, setSelectedTenant] = useState<string>('')
  const { data: modules = [], isLoading } = useAdminTenantModules(selectedTenant || undefined)
  const toggleModule = useToggleModule()

  async function handleToggle(moduleKey: string, enabled: boolean) {
    if (!selectedTenant) return
    try {
      await toggleModule.mutateAsync({
        _tenant_id: selectedTenant,
        _module_key: moduleKey,
        _enabled: enabled,
      })
      toast.success(`${moduleKey} 已${enabled ? '啟用' : '停用'}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '操作失敗')
    }
  }

  const coreModules = modules.filter(m => m.category === 'core')
  const addonModules = modules.filter(m => m.category === 'addon')

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">模組開關</h1>

      <Select
        value={selectedTenant}
        onChange={e => setSelectedTenant(e.target.value)}
        className="max-w-xs"
      >
        <option value="">— 選擇租戶 —</option>
        {tenants.map(t => <option key={t.id} value={t.id}>{t.display_name || t.name}</option>)}
      </Select>

      {selectedTenant && !isLoading && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">核心模組</CardTitle>
              <CardDescription>核心模組預設啟用，關閉將影響基礎功能</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {coreModules.map(m => (
                  <div key={m.module_key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{m.label}</span>
                      <Badge variant="secondary">{m.module_key}</Badge>
                    </div>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={checked => handleToggle(m.module_key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">加購模組</CardTitle>
              <CardDescription>依客戶需求開啟</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {addonModules.map(m => (
                  <div key={m.module_key} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{m.label}</span>
                      <Badge variant="outline">{m.module_key}</Badge>
                    </div>
                    <Switch
                      checked={m.enabled}
                      onCheckedChange={checked => handleToggle(m.module_key, checked)}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {selectedTenant && isLoading && (
        <div className="p-8 text-center text-muted-foreground">載入中...</div>
      )}
    </div>
  )
}
