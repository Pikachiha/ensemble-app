import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Production, Scene, SceneGroup } from '../../../types'
import TagBadge from '../../../components/TagBadge'
import SceneModal from '../../scenes/SceneModal'

type Props = { production: Production }

type SceneEntry = Scene & { groupIds: Set<string> }

export default function ScenesTab({ production }: Props) {
const [scenes, setScenes] = useState<SceneEntry[]>([])
  const [groups, setGroups] = useState<SceneGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<SceneEntry | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: sc }, { data: sg }, { data: ssg }] = await Promise.all([
      supabase.from('scenes').select('*').eq('production_id', production.id).order('order_index'),
      supabase.from('scene_groups').select('*').eq('production_id', production.id).order('order_index'),
      supabase.from('scene_scene_groups').select('*'),
    ])

    const groupMap: Record<string, Set<string>> = {}
    for (const row of ssg ?? []) {
      if (!groupMap[row.scene_id]) groupMap[row.scene_id] = new Set()
      groupMap[row.scene_id].add(row.scene_group_id)
    }
    setScenes((sc ?? []).map(s => ({ ...s, groupIds: groupMap[s.id] ?? new Set() })))
    setGroups(sg ?? [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このシーンを削除しますか？')) return
    await supabase.from('scenes').delete().eq('id', id)
    setScenes(prev => prev.filter(s => s.id !== id))
  }

  const handleSaved = (scene: Scene, groupIds: Set<string>) => {
    setScenes(prev => {
      const exists = prev.find(s => s.id === scene.id)
      return exists
        ? prev.map(s => s.id === scene.id ? { ...s, ...scene, groupIds } : s)
        : [...prev, { ...scene, groupIds }]
    })
    setModalOpen(false)
    setEditing(null)
  }

  const handleGroupCreated = (group: SceneGroup) => setGroups(prev => [...prev, group])
  const handleGroupUpdated = (group: SceneGroup) => setGroups(prev => prev.map(g => g.id === group.id ? group : g))
  const handleGroupDeleted = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    setScenes(prev => prev.map(s => {
      const gs = new Set(s.groupIds); gs.delete(id); return { ...s, groupIds: gs }
    }))
  }

  const handleCreateGroup = async (name: string, color: string): Promise<SceneGroup | null> => {
    const { data } = await supabase
      .from('scene_groups')
      .insert({ production_id: production.id, name, color, order_index: groups.length })
      .select().single()
    if (data) { setGroups(prev => [...prev, data]); return data }
    return null
  }

  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#666666]">{scenes.length} シーン</p>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer border-none"
        >
          <Plus size={15} />
          シーンを追加
        </button>
      </div>

      {scenes.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">シーンがまだありません</p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {scenes.map((scene, i) => (
            <div
              key={scene.id}
              className={`flex items-center gap-3 px-5 py-3.5 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <span className="text-xs text-[#999999] w-5 text-right flex-shrink-0">{i + 1}</span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111111]">{scene.name}</p>
                {scene.groupIds.size > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {groups.filter(g => scene.groupIds.has(g.id)).map(g => (
                      <TagBadge key={g.id} group={g} />
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
<button
                  onClick={() => { setEditing(scene); setModalOpen(true) }}
                  className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(scene.id)}
                  className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => { setEditing(null); setModalOpen(true) }}
            className="flex items-center gap-1.5 w-full px-5 py-3 border-t border-[#E5E5E5] text-sm text-[#999999] hover:text-[#111111] hover:bg-[#F5F5F5] bg-transparent cursor-pointer"
          >
            <Plus size={14} />
            シーンを追加
          </button>
        </div>
      )}

      {modalOpen && (
        <SceneModal
          productionId={production.id}
          scene={editing}
          orderIndex={scenes.length}
          groups={groups}
          initialGroupIds={editing?.groupIds ?? new Set()}
          onSaved={handleSaved}
          onGroupCreated={handleGroupCreated}
          onGroupUpdated={handleGroupUpdated}
          onGroupDeleted={handleGroupDeleted}
          onCreate={handleCreateGroup}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
