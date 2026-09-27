import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '@/integrations/supabase/client'
import type { StageTemplate, ProjectStage, ProgressLog, ProjectProgress } from '@/types/database'

// Progress tables are newer than the generated Database types; use an untyped
// client here and type the results with our own interfaces.
const db = supabase as unknown as SupabaseClient

const keys = {
  templates: ['stage-templates'] as const,
  stages: (projectId?: string) => ['project-stages', projectId] as const,
  logs: (projectId?: string) => ['progress-logs', projectId] as const,
  overview: ['project-progress'] as const,
}

function useInvalidateProgress() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['project-stages'] })
    qc.invalidateQueries({ queryKey: ['progress-logs'] })
    qc.invalidateQueries({ queryKey: keys.overview })
  }
}

// ── Stage templates (each 店鋪 has its own) ──

export function useStageTemplates() {
  return useQuery({
    queryKey: keys.templates,
    queryFn: async () => {
      const { data, error } = await db.from('stage_templates').select('*').order('sort_order').order('created_at')
      if (error) throw error
      return data as StageTemplate[]
    },
  })
}

export function useSaveStageTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { id?: string; name: string; stages: string[]; sort_order?: number }) => {
      const { id, ...row } = input
      const q = id
        ? db.from('stage_templates').update(row).eq('id', id)
        : db.from('stage_templates').insert(row)
      const { error } = await q
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }),
  })
}

export function useDeleteStageTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('stage_templates').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.templates }),
  })
}

// ── Project stages ──

export function useProjectStages(projectId?: string) {
  return useQuery({
    queryKey: keys.stages(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db
        .from('project_stages')
        .select('*')
        .eq('project_id', projectId!)
        .order('sort_order')
        .order('created_at')
      if (error) throw error
      return data as ProjectStage[]
    },
  })
}

export function useCreateStage() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async (input: { project_id: string; name: string; sort_order: number; due_date?: string | null }) => {
      const { error } = await db.from('project_stages').insert(input)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useUpdateStage() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string; name?: string; due_date?: string | null; sort_order?: number }) => {
      const { error } = await db.from('project_stages').update(input).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useDeleteStage() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db.from('project_stages').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

/** Swap sort_order of two stages (move up / down) */
export function useSwapStages() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async ({ a, b }: { a: ProjectStage; b: ProjectStage }) => {
      const r1 = await db.from('project_stages').update({ sort_order: b.sort_order }).eq('id', a.id)
      if (r1.error) throw r1.error
      const r2 = await db.from('project_stages').update({ sort_order: a.sort_order }).eq('id', b.id)
      if (r2.error) throw r2.error
    },
    onSuccess: invalidate,
  })
}

export function useApplyStageTemplate() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async ({ projectId, templateId }: { projectId: string; templateId: string }) => {
      const { data, error } = await db.rpc('rpc_apply_stage_template', { _project_id: projectId, _template_id: templateId })
      if (error) throw error
      return data as number
    },
    onSuccess: invalidate,
  })
}

// ── Progress reports ──

export function useReportProgress() {
  const invalidate = useInvalidateProgress()
  return useMutation({
    mutationFn: async (input: { stageId: string; percent: number; note?: string }) => {
      const { error } = await db.rpc('rpc_report_progress', {
        _stage_id: input.stageId,
        _percent: input.percent,
        _note: input.note ?? null,
        _source: 'web',
      })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useProgressLogs(projectId?: string, limit = 30) {
  return useQuery({
    queryKey: keys.logs(projectId),
    enabled: !!projectId,
    queryFn: async () => {
      const { data, error } = await db
        .from('progress_logs')
        .select('*, stage:project_stages(name)')
        .eq('project_id', projectId!)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error) throw error
      return data as ProgressLog[]
    },
  })
}

/** Overall % and last report time for every project of this 店鋪 */
export function useProjectProgress() {
  return useQuery({
    queryKey: keys.overview,
    queryFn: async () => {
      const { data, error } = await db.from('v_project_progress').select('*')
      if (error) throw error
      return data as ProjectProgress[]
    },
  })
}

/** Days since a timestamp (null → never reported) */
export function daysSince(ts: string | null): number | null {
  if (!ts) return null
  return Math.floor((Date.now() - new Date(ts).getTime()) / 86_400_000)
}
