import { useRef, useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { CastGroup } from '../../../types'
import type { TagGroup } from '../../../components/TagPicker'
import TagBadge from '../../../components/TagBadge'
import TagPicker from '../../../components/TagPicker'

type CastEntry = {
  id: string
  role_name: string | null
  groupIds: Set<string>
  member: { name: string }
}

type Props = {
  cast: CastEntry
  groups: CastGroup[]
  onSaved: (roleName: string | null, groupIds: Set<string>) => void
  onGroupCreated: (group: CastGroup) => void
  onGroupUpdated: (group: CastGroup) => void
  onGroupDeleted: (id: string) => void
  onCreate: (name: string, color: string) => Promise<CastGroup | null>
  onClose: () => void
}

export default function CastDetailModal({
  cast, groups, onSaved, onGroupUpdated, onGroupDeleted, onCreate, onClose,
}: Props) {
  const [roleName, setRoleName] = useState(cast.role_name ?? '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set(cast.groupIds))
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const toggleGroup = (group: TagGroup) => {
    setSelectedGroupIds(prev => {
      const s = new Set(prev)
      s.has(group.id) ? s.delete(group.id) : s.add(group.id)
      return s
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const role = roleName.trim() || null
    await supabase.from('production_members').update({ role_name: role }).eq('id', cast.id)

    const toAdd = [...selectedGroupIds].filter(id => !cast.groupIds.has(id))
    const toRemove = [...cast.groupIds].filter(id => !selectedGroupIds.has(id))
    if (toAdd.length > 0) {
      await supabase.from('production_member_groups').insert(
        toAdd.map(gid => ({ production_member_id: cast.id, cast_group_id: gid }))
      )
    }
    for (const gid of toRemove) {
      await supabase.from('production_member_groups')
        .delete().eq('production_member_id', cast.id).eq('cast_group_id', gid)
    }

    setLoading(false)
    onSaved(role, selectedGroupIds)
  }

  const handleGroupUpdated = (group: TagGroup) => onGroupUpdated(group as CastGroup)
  const handleGroupDeleted = (id: string) => {
    onGroupDeleted(id)
    setSelectedGroupIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-base font-semibold text-[#111111]">キャストを編集</h3>
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
            <div className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#666666] bg-[#FAFAFA]">
              {cast.member.name}
            </div>
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
                      onCreate={onCreate}
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
              disabled={loading}
              className="flex-1 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
