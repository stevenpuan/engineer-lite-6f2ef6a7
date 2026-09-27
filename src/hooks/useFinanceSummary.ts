import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { ProjectFinanceSummary } from '@/types/database'

export function useFinanceSummary() {
  return useQuery({
    queryKey: ['finance-summary'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_project_finance_summary')
        .select('*')
      if (error) throw error
      return data as ProjectFinanceSummary[]
    },
  })
}
