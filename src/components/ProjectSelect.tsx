import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Project } from '@/types/database'

const OPEN = ['進行中', '洽談中']
const DONE = ['完工']
/** 超過這個數量才出現搜尋框 */
const SEARCH_THRESHOLD = 8

interface Props {
  projects: Project[]
  value: string
  onChange: (id: string) => void
  /** 第一個選項（空值）的文字，例如「公司支出（不歸工地）」 */
  emptyLabel: string
  id?: string
}

/**
 * 案件選單：進行中／洽談中排前面，已完工放在後面一組（尾款、保固支出還用得到），
 * 結案與取消的不出現。案件多時可以打字篩選（案名、客戶、地址）。
 */
export function ProjectSelect({ projects, value, onChange, emptyLabel, id }: Props) {
  const [q, setQ] = useState('')

  const { open, done } = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const match = (p: Project) => {
      if (!kw) return true
      const client = (p.client as { name?: string } | null | undefined)?.name ?? ''
      return [p.name, client, p.address ?? ''].some(s => s.toLowerCase().includes(kw))
    }
    const byName = (a: Project, b: Project) => a.name.localeCompare(b.name, 'zh-Hant')
    const open = projects.filter(p => OPEN.includes(p.status) && match(p))
    const done = projects.filter(p => DONE.includes(p.status) && match(p))
    // 目前選到的案件就算被篩掉或已結案也要留著，避免選單顯示空白
    const selected = projects.find(p => p.id === value)
    if (selected && !open.includes(selected) && !done.includes(selected)) {
      (DONE.includes(selected.status) ? done : open).push(selected)
    }
    return { open: open.sort(byName), done: done.sort(byName) }
  }, [projects, q, value])

  const selectable = projects.filter(p => OPEN.includes(p.status) || DONE.includes(p.status)).length
  const found = open.length + done.length

  return (
    <div className="space-y-1.5">
      {selectable > SEARCH_THRESHOLD && (
        <Input
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="打字找案件（案名、客戶、地址）"
          aria-label="搜尋案件"
        />
      )}
      <Select id={id} value={value} onChange={e => onChange(e.target.value)}>
        <option value="">{q && found === 0 ? `找不到「${q}」` : emptyLabel}</option>
        {open.length > 0 && (
          <optgroup label="進行中・洽談中">
            {open.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        )}
        {done.length > 0 && (
          <optgroup label="已完工">
            {done.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </optgroup>
        )}
      </Select>
    </div>
  )
}
