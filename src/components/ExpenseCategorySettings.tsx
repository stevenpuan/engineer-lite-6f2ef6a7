import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  useCategoryOptions,
  useToggleBuiltinCategory,
  useAddCustomCategory,
  useDeleteCustomCategory,
} from '@/hooks/useExpenseCategories'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/** 費用類別設定：內建類別可開關，自訂類別可新增、刪除 */
export function ExpenseCategorySettings({ open, onOpenChange }: Props) {
  const { options } = useCategoryOptions()
  const toggleBuiltin = useToggleBuiltinCategory()
  const addCustom = useAddCustomCategory()
  const deleteCustom = useDeleteCustomCategory()
  const [newName, setNewName] = useState('')

  const builtins = options.filter(o => !o.isCustom)
  const customs = options.filter(o => o.isCustom)

  async function handleAdd() {
    const name = newName.trim()
    if (!name) return
    try {
      await addCustom.mutateAsync(name)
      setNewName('')
      toast.success('已新增類別')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '新增失敗')
    }
  }

  async function handleToggle(key: string, active: boolean, rowId?: string) {
    try {
      await toggleBuiltin.mutateAsync({ key, active, rowId })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '更新失敗')
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteCustom.mutateAsync(id)
      toast.success('已刪除類別')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '刪除失敗')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>費用類別設定</DialogTitle>
          <DialogDescription>勾選要使用的類別，或新增自己的類別。已登錄的支出不受影響。</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 mt-4">
          <div>
            <Label className="text-sm font-semibold">內建類別</Label>
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 sm:grid-cols-3">
              {builtins.map(o => (
                <label key={o.key} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={o.active}
                    onChange={e => handleToggle(o.key, e.target.checked, o.rowId)}
                    className="h-4 w-4 accent-primary"
                  />
                  {o.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-sm font-semibold">自訂類別</Label>
            <div className="mt-2 space-y-2">
              {customs.length === 0 && (
                <p className="text-sm text-muted-foreground">還沒有自訂類別</p>
              )}
              {customs.map(o => (
                <div key={o.key} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <span className="text-sm">{o.label}</span>
                  <ConfirmDialog
                    title="刪除類別"
                    description={`確定要刪除「${o.label}」？已用這個類別的支出不會被刪除，但之後不能再選它。`}
                    onConfirm={() => handleDelete(o.rowId!)}
                    trigger={
                      <Button variant="ghost" size="icon" aria-label={`刪除${o.label}`} className="h-8 w-8">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    }
                  />
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="輸入新類別名稱"
                  onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
                />
                <Button onClick={handleAdd} disabled={!newName.trim() || addCustom.isPending}>
                  <Plus className="mr-1 h-4 w-4" />新增
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
