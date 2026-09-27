import { useAuth } from '@/contexts/AuthContext'

/** 老闆（owner）才能刪資料；助理只能新增與修改。資料庫同樣限制（restrictive delete policy）。 */
export function useCanDelete() {
  const { profile } = useAuth()
  return profile?.role === 'owner'
}
