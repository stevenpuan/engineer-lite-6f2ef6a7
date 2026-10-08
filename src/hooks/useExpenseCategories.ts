import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { EXPENSE_CATEGORY_LABELS } from '@/types/database'

export interface CategoryOption {
  key: string
  label: string
  isCustom: boolean
  active: boolean
  rowId?: string
}

export function useExpenseCategoryRows() {
  return useQuery({
    queryKey: ['expense_categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*')
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

/** 內建類別（可被隱藏）＋自訂類別，合併成一份清單 */
export function useCategoryOptions() {
  const { data: rows = [], ...rest } = useExpenseCategoryRows()
  const options: CategoryOption[] = Object.entries(EXPENSE_CATEGORY_LABELS).map(([key, label]) => {
    const row = rows.find(r => r.builtin_key === key)
    return { key, label, isCustom: false, active: row ? row.is_active : true, rowId: row?.id }
  })
  for (const r of rows.filter(r => r.name)) {
    options.push({ key: r.name!, label: r.name!, isCustom: true, active: r.is_active, rowId: r.id })
  }
  return { options, ...rest }
}

/** 新增支出表單用的「啟用中」類別 */
export function useActiveCategoryOptions() {
  const { options, ...rest } = useCategoryOptions()
  return { options: options.filter(o => o.active), ...rest }
}

export function useToggleBuiltinCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ key, active, rowId }: { key: string; active: boolean; rowId?: string }) => {
      if (rowId) {
        const { error } = await supabase.from('expense_categories').update({ is_active: active }).eq('id', rowId)
        if (error) throw error
      } else {
        const { error } = await supabase.from('expense_categories').insert({ builtin_key: key, is_active: active } as never)
        if (error) throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense_categories'] }),
  })
}

export function useAddCustomCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase.from('expense_categories').insert({ name } as never)
      if (error) {
        if (error.code === '23505') throw new Error('已經有這個類別了')
        throw error
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense_categories'] }),
  })
}

export function useDeleteCustomCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('expense_categories').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['expense_categories'] }),
  })
}
