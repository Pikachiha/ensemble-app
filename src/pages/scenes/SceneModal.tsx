import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Scene, SceneGroup } from '../../types'
import type { TagGroup } from '../../components/TagPicker'
import TagBadge from '../../components/TagBadge'
import TagPicker from '../../components/TagPicker'

type Props = {
  productionId: string
  scene: Scene | null
  orderIndex: number
  groups: SceneGroup[]
  initialGroupIds: Set<string>
  onSaved: (scene: Scene, groupIds: Set<string>) => void
  onGroupCreated: (group: SceneGroup) => void
  onGroupUpdated: (group: SceneGroup) => void
  onGroupDeleted: (id: string) => void
  onCreate: (name: string, color: string) => Promise<SceneGroup | null>
  onClose: () => void
}

export default function SceneModal({
  productionId, scene, orderIndex, groups, initialGroupIds,
  onSaved, onGroupCreated: _onGroupCreated, onGroupUpdated, onGroupDeleted, onCreate, onClose,
}: Props) {
  const [name, setName] = useState(scene?.name ?? '')
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set(initialGroupIds))
  const [tagPickerOpen, setTagPickerOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleGroup = (group: TagGroup) => {
    setSelectedGroupIds(prev => {
      const s = new Set(prev)
      s.has(group.id) ? s.delete(group.id) : s.add(group.id)
      return s
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)

    const payload = {
      name: name.trim(),
      production_id: productionId,
      order_index: scene?.order_index ?? orderIndex,
    }

    let savedScene: Scene | null = null

    if (scene) {
      const { data, error } = await supabase
        .from('scenes').update(payload).eq('id', scene.id).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      savedScene = data

      // タグの差分同期
      const toAdd = [...selectedGroupIds].filter(id => !initialGroupIds.has(id))
      const toRemove = [...initialGroupIds].filter(id => !selectedGroupIds.has(id))
      if (toAdd.length > 0) {
        await supabase.from('scene_scene_groups').insert(
          toAdd.map(gid => ({ scene_id: scene.id, scene_group_id: gid }))
        )
      }
      for (const gid of toRemove) {
        await supabase.from('scene_scene_groups')
          .delete().eq('scene_id', scene.id).eq('scene_group_id', gid)
      }
    } else {
      const { data, error } = await supabase
        .from('scenes').insert(payload).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      savedScene = data

      if (selectedGroupIds.size > 0) {
        await supabase.from('scene_scene_groups').insert(
          [...selectedGroupIds].map(gid => ({ scene_id: savedScene!.id, scene_group_id: gid }))
        )
      }
    }

    setLoading(false)
    onSaved(savedScene!, selectedGroupIds)
  }

  const handleGroupUpdated = (group: TagGroup) => onGroupUpdated(group as SceneGroup)
  const handleGroupDeleted = (id: string) => {
    onGroupDeleted(id)
    setSelectedGroupIds(prev => { const s = new Set(prev); s.delete(id); return s })
  }

  const selectedGroups = groups.filter(g => selectedGroupIds.has(g.id))

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-base font-semibold text-[#111111]">
            {scene ? 'シーンを編集' : 'シーンを追加'}
          </h3>
          <button onClick={onClose} className="text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">シーン名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="例：第1場、オープニング"
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">タグ（任意）</label>
            <div className="flex flex-wrap gap-1.5">
              {selectedGroups.map(g => (
                <TagBadge key={g.id} group={g} onRemove={() => toggleGroup(g)} />
              ))}
              <div className="relative">
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
                      table="scene_groups"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

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
