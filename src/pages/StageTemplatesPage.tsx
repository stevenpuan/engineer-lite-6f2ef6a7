import { useState } from 'react'
import { useStageTemplates, useSaveStageTemplate, useDeleteStageTemplate } from '@/hooks/useProgress'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import type { StageTemplate } from '@/types/database'
import { toast } from 'sonner'

export default function StageTemplatesPage() {
  const { data: templates = [], isLoading } = useStageTemplates()
  const save = useSaveStageTemplate()
  const remove = useDeleteStageTemplate()

  const [editing, setEditing] = useState<StageTemplate | 'new' | null>(null)
  const [form, setForm] = useState({ name: '', stagesText: '' })

  function open(t: StageTemplate | 'new') {
    setEditing(t)
    setForm(t === 'new' ? { name: '', stagesText: '' } : { name: t.name, stagesText: t.stages.join('\n') })
  }

  async function handleSave() {
    const stages = form.stagesText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!form.name.trim()) { toast.error('請輸入範本名稱'); return }
    if (stages.length === 0) { toast.error('至少要有一個階段'); return }
    try {
      const maxOrder = templates.reduce((m, t) => Math.max(m, t.sort_order), 0)
      await save.mutateAsync(editing === 'new' || !editing
        ? { name: form.name.trim(), stages, sort_order: maxOrder + 10 }
        : { id: editing.id, name: form.name.trim(), stages })
      toast.success('範本已儲存')
      setEditing(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '儲存失敗')
    }
  }

  async function handleDelete(t: StageTemplate) {
    if (!confirm(`刪除範本「${t.name}」？已套用到案件的階段不受影響。`)) return
    try {
      await remove.mutateAsync(t.id)
      toast.success('已刪除')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">階段範本</h1>
          <p className="text-sm text-muted-foreground">你們店自己的施工流程。建案件時可以一鍵套入，其他店看不到。</p>
        </div>
        <Button onClick={() => open('new')}><Plus className="mr-2 h-4 w-4" />新增範本</Button>
      </div>

      {templates.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">還沒有範本</CardContent></Card>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {templates.map(t => (
            <Card key={t.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold">{t.name}</div>
                  <div className="flex">
                    <Button variant="ghost" size="icon" aria-label="編輯範本" onClick={() => open(t)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="刪除範本" onClick={() => handleDelete(t)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                  </div>
                </div>
                <ol className="flex flex-wrap gap-1.5">
                  {t.stages.map((s, i) => (
                    <li key={`${s}-${i}`} className="rounded-full bg-muted px-2.5 py-1 text-xs">{i + 1}. {s}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? '新增範本' : '編輯範本'}</DialogTitle>
            <DialogDescription>一行一個階段，由上到下就是施工順序</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label htmlFor="tpl-name">範本名稱 *</Label><Input id="tpl-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="例：浴室翻修" /></div>
            <div>
              <Label htmlFor="tpl-stages">階段 *</Label>
              <Textarea id="tpl-stages" rows={8} value={form.stagesText} onChange={e => setForm({ ...form, stagesText: e.target.value })} placeholder={'拆除\n防水\n泥作\n衛浴安裝\n清潔收尾'} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button onClick={handleSave} disabled={save.isPending}>儲存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
