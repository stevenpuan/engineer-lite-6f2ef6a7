import { useState } from 'react'
import { useCanDelete } from '@/hooks/useCanDelete'
import { Link } from '@tanstack/react-router'
import {
  useProjectStages, useProgressLogs, useStageTemplates, useApplyStageTemplate,
  useCreateStage, useUpdateStage, useDeleteStage, useSwapStages, useReportProgress,
} from '@/hooks/useProgress'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { ChevronDown, ChevronUp, MessageSquarePlus, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProjectStage } from '@/types/database'
import { toast } from 'sonner'

const QUICK = [0, 20, 40, 60, 80, 100]

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value))
  return (
    <div className={cn('h-2 w-full rounded-full bg-muted overflow-hidden', className)} role="progressbar" aria-valuenow={v} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all', v >= 100 ? 'bg-green-600' : 'bg-primary')} style={{ width: `${v}%` }} />
    </div>
  )
}

function errMsg(err: unknown, fallback: string) {
  return err instanceof Error ? err.message : fallback
}

export function ProjectProgressTab({ projectId }: { projectId: string }) {
  const canDelete = useCanDelete()
  const { data: stages = [], isLoading } = useProjectStages(projectId)
  const { data: logs = [] } = useProgressLogs(projectId)
  const { data: templates = [] } = useStageTemplates()
  const applyTemplate = useApplyStageTemplate()
  const createStage = useCreateStage()
  const updateStage = useUpdateStage()
  const deleteStage = useDeleteStage()
  const swapStages = useSwapStages()
  const report = useReportProgress()

  const [templateId, setTemplateId] = useState('')
  const [editing, setEditing] = useState<ProjectStage | 'new' | null>(null)
  const [stageForm, setStageForm] = useState({ name: '', due_date: '' })
  const [noteFor, setNoteFor] = useState<ProjectStage | null>(null)
  const [noteForm, setNoteForm] = useState({ percent: 0, note: '' })

  const overall = stages.length ? Math.round(stages.reduce((s, x) => s + x.percent, 0) / stages.length) : 0

  async function handleApply() {
    const id = templateId || templates[0]?.id
    if (!id) return
    try {
      const n = await applyTemplate.mutateAsync({ projectId, templateId: id })
      toast.success(`已加入 ${n} 個階段`)
    } catch (err) { toast.error(errMsg(err, '套用失敗')) }
  }

  async function quickReport(stage: ProjectStage, percent: number) {
    if (percent === stage.percent) return
    try {
      await report.mutateAsync({ stageId: stage.id, percent })
      toast.success(`${stage.name} → ${percent}%`)
    } catch (err) { toast.error(errMsg(err, '回報失敗')) }
  }

  async function submitNote() {
    if (!noteFor) return
    try {
      await report.mutateAsync({ stageId: noteFor.id, percent: noteForm.percent, note: noteForm.note })
      toast.success('已回報')
      setNoteFor(null)
    } catch (err) { toast.error(errMsg(err, '回報失敗')) }
  }

  function openEdit(stage: ProjectStage | 'new') {
    setEditing(stage)
    setStageForm(stage === 'new' ? { name: '', due_date: '' } : { name: stage.name, due_date: stage.due_date ?? '' })
  }

  async function saveStage() {
    if (!stageForm.name.trim()) { toast.error('請輸入階段名稱'); return }
    try {
      if (editing === 'new') {
        const maxOrder = stages.reduce((m, s) => Math.max(m, s.sort_order), 0)
        await createStage.mutateAsync({ project_id: projectId, name: stageForm.name.trim(), sort_order: maxOrder + 1, due_date: stageForm.due_date || null })
        toast.success('階段已新增')
      } else if (editing) {
        await updateStage.mutateAsync({ id: editing.id, name: stageForm.name.trim(), due_date: stageForm.due_date || null })
        toast.success('階段已更新')
      }
      setEditing(null)
    } catch (err) { toast.error(errMsg(err, '儲存失敗')) }
  }

  async function removeStage(stage: ProjectStage) {
    if (!confirm(`刪除「${stage.name}」？這個階段的回報紀錄也會一併刪除。`)) return
    try {
      await deleteStage.mutateAsync(stage.id)
      toast.success('已刪除')
    } catch (err) { toast.error(errMsg(err, '刪除失敗')) }
  }

  async function move(index: number, dir: -1 | 1) {
    const a = stages[index]
    const b = stages[index + dir]
    if (!a || !b) return
    // Equal sort_order (e.g. manual inserts) → normalise first
    if (a.sort_order === b.sort_order) {
      await Promise.all(stages.map((s, i) => updateStage.mutateAsync({ id: s.id, sort_order: i + 1 })))
      return
    }
    try { await swapStages.mutateAsync({ a, b }) } catch (err) { toast.error(errMsg(err, '排序失敗')) }
  }

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">載入中...</div>

  return (
    <div className="space-y-4">
      {/* Overall */}
      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-sm text-muted-foreground">整體進度</div>
              <div className="text-3xl font-bold">{overall}%</div>
            </div>
            <div className="text-sm text-muted-foreground">{stages.length} 個階段</div>
          </div>
          <ProgressBar value={overall} className="h-3" />
        </CardContent>
      </Card>

      {/* Template + add */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        {templates.length > 0 ? (
          <>
            <div className="flex-1">
              <Label htmlFor="apply-template">從範本加入階段</Label>
              <Select id="apply-template" value={templateId || templates[0]?.id} onChange={e => setTemplateId(e.target.value)}>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}（{t.stages.length} 階段）</option>)}
              </Select>
            </div>
            <Button variant="outline" onClick={handleApply} disabled={applyTemplate.isPending}>套用範本</Button>
          </>
        ) : (
          <div className="flex-1 text-sm text-muted-foreground">
            還沒有階段範本，可到 <Link to="/stage-templates" className="text-primary underline">階段範本</Link> 建立。
          </div>
        )}
        <Button onClick={() => openEdit('new')}><Plus className="mr-1 h-4 w-4" />新增階段</Button>
      </div>

      {/* Stages */}
      {stages.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground">這個案件還沒有階段，先套用範本或新增一個。</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {stages.map((s, i) => (
            <Card key={s.id}>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{i + 1}. {s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.due_date ? `預計完成 ${s.due_date}` : '未設預計完成日'}</div>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button variant="ghost" size="icon" aria-label="上移" disabled={i === 0} onClick={() => move(i, -1)}><ChevronUp className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="下移" disabled={i === stages.length - 1} onClick={() => move(i, 1)}><ChevronDown className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" aria-label="編輯階段" onClick={() => openEdit(s)}><Pencil className="h-4 w-4" /></Button>
                    {canDelete && (<Button variant="ghost" size="icon" aria-label="刪除階段" onClick={() => removeStage(s)}><Trash2 className="h-4 w-4 text-destructive" /></Button>)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <ProgressBar value={s.percent} />
                  <span className="w-12 text-right text-sm font-semibold">{s.percent}%</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK.map(p => (
                    <Button
                      key={p}
                      size="sm"
                      variant={s.percent === p ? 'default' : 'outline'}
                      className="min-w-12"
                      disabled={report.isPending}
                      onClick={() => quickReport(s, p)}
                    >{p}%</Button>
                  ))}
                  <Button size="sm" variant="ghost" onClick={() => { setNoteFor(s); setNoteForm({ percent: s.percent, note: '' }) }}>
                    <MessageSquarePlus className="mr-1 h-4 w-4" />附說明
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Logs */}
      <Card>
        <CardHeader><CardTitle className="text-base">回報紀錄</CardTitle></CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-sm text-muted-foreground">尚無回報</div>
          ) : (
            <ul className="space-y-3">
              {logs.map(l => (
                <li key={l.id} className="flex gap-3 text-sm">
                  <div className="w-20 shrink-0 text-muted-foreground">{l.log_date.slice(5)}</div>
                  <div className="min-w-0">
                    <div>
                      <span className="font-medium">{l.stage?.name ?? '（已刪除階段）'}</span> → {l.percent}%
                      {l.source === 'line' && <Badge variant="secondary" className="ml-2 bg-status-done text-status-done-foreground">LINE</Badge>}
                    </div>
                    {l.note && <div className="text-muted-foreground break-words">{l.note}</div>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Stage dialog */}
      <Dialog open={!!editing} onOpenChange={o => { if (!o) setEditing(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? '新增階段' : '編輯階段'}</DialogTitle>
            <DialogDescription>階段名稱與預計完成日</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div><Label htmlFor="stage-name">階段名稱 *</Label><Input id="stage-name" value={stageForm.name} onChange={e => setStageForm({ ...stageForm, name: e.target.value })} placeholder="例：泥作" /></div>
            <div><Label htmlFor="stage-due">預計完成日</Label><Input id="stage-due" type="date" value={stageForm.due_date} onChange={e => setStageForm({ ...stageForm, due_date: e.target.value })} /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>取消</Button>
              <Button onClick={saveStage}>儲存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Report-with-note dialog */}
      <Dialog open={!!noteFor} onOpenChange={o => { if (!o) setNoteFor(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>回報進度</DialogTitle>
            <DialogDescription>{noteFor?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <Label>進度</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {QUICK.map(p => (
                  <Button key={p} size="sm" variant={noteForm.percent === p ? 'default' : 'outline'} className="min-w-12" onClick={() => setNoteForm({ ...noteForm, percent: p })}>{p}%</Button>
                ))}
              </div>
            </div>
            <div><Label htmlFor="progress-note">說明</Label><Textarea id="progress-note" rows={3} value={noteForm.note} onChange={e => setNoteForm({ ...noteForm, note: e.target.value })} placeholder="例：磁磚進場，明天開始鋪" /></div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setNoteFor(null)}>取消</Button>
              <Button onClick={submitNote} disabled={report.isPending}>送出回報</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
