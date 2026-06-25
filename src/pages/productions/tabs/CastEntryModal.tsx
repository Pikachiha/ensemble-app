import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { CastGroup, Member } from '../../../types'
import TagBadge from '../../../components/TagBadge'
import TagPicker from '../../../components/TagPicker'

type Props = {
  productionId: string
  members: Member[]
  groups: CastGroup[]
  onSave: (memberId: string, roleName: string | null, groupIds: string[]) => Promise<void>
  onGroupCreated: (group: CastGroup) => void
  onClose: () => void
}

export default function CastEntryModal({ productionId, members, groups: initialGroups, onSave, onGroupCreated, onClose }: Props) {
  const [memberId, setMemberId] = useState('')
  const [roleName, setRoleName] = useState('')
  const [groups, setGroups] = useState<CastGroup[]>(initialGroups)
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set())
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const toggleGroup = (group: CastGroup) => {
    setSelectedGroupIds(prev => {
      const s = new Set(prev)
      s.has(group.id) ? s.delete(group.id) : s.add(group.id)
      return s
    })
  }

  const handleCreateGroup = async (name: string, color: string): Promise<CastGroup | null> => {
    const { data } = await supabase
      .from('cast_groups')
      .insert({ production_id: productionId, name, color, order_index: groups.length })
      .select().single()
    if (data) {
      setGroups(prev => [...prev, data])
      onGroupCreated(data)
      return data
    }
    return null
  }

  const handleGroupUpdated = (group: CastGroup) => {
    setGroups(prev => prev.map(g => g.id === group.id ? group : g))
  }

  const handleGroupDeleted = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    setSelectedGroupIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!memberId) return
    setLoading(true)
    await onSave(memberId, roleName.trim() || null, [...selectedGroupIds])
    setLoading(false)
  }

  const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-base font-semibold text-[#111111]">キャストを追加</h3>
          <button onClick={onClose} className="text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">役名（任意）</label>
            <input
              type="text"
              value={roleName}
              onChange={e => setRoleName(e.target.value)}
              placeholder="例：主役、ナレーター"
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">キャスト</label>
            {members.length === 0 ? (
              <p className="text-sm text-[#999999]">追加できるメンバーがいません</p>
            ) : (
              <select
                value={memberId}
                onChange={e => setMemberId(e.target.value)}
                required
                className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] outline-none focus:border-[#000000] cursor-pointer"
              >
                <option value="">メンバーを選択</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">グループ（任意）</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedGroups.map(g => (
                <TagBadge key={g.id} group={g} onRemove={() => toggleGroup(g)} />
              ))}
              <div className="relative" ref={pickerRef}>
                <button
                  type="button"
                  onClick={() => setTagPickerOpen(o => !o)}
                  className="px-2.5 py-0.5 text-xs border border-dashed border-[#E5E5E5] rounded-full text-[#999999] hover:text-[#111111] hover:border-[#999999] bg-transparent cursor-pointer"
                >
                  + タグを追加
                </button>
                {tagPickerOpen && (
                  <div className="absolute left-0 top-7 z-30 bg-white border border-[#E5E5E5] rounded-xl shadow-lg w-64">
                    <TagPicker
                      groups={groups}
                      selectedIds={selectedGroupIds}
                      onToggle={g => { toggleGroup(g); setTagPickerOpen(false) }}
                      onCreate={handleCreateGroup}
                      onGroupUpdated={handleGroupUpdated}
                      onGroupDeleted={handleGroupDeleted}
                      onClose={() => setTagPickerOpen(false)}
                      table="cast_groups"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white text-[#111111] text-sm font-medium rounded-lg border border-[#E5E5E5] hover:bg-[#F5F5F5] cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading || !memberId}
              className="flex-1 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer"
            >
              {loading ? '追加中...' : '追加'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
