import { useEffect, useState } from 'react'
import { Plus, Pencil, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { CastGroup, Member, Production, ProductionMember } from '../../../types'
import TagBadge from '../../../components/TagBadge'
import CastEntryModal from './CastEntryModal'
import CastDetailModal from './CastDetailModal'

type Props = { production: Production }

type CastEntry = ProductionMember & {
  member: Member
  groupIds: Set<string>
}

export default function CastTab({ production }: Props) {
  const [groups, setGroups] = useState<CastGroup[]>([])
  const [casts, setCasts] = useState<CastEntry[]>([])
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [editingCast, setEditingCast] = useState<CastEntry | null>(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: g }, { data: pm }, { data: m }, { data: pmg }] = await Promise.all([
      supabase.from('cast_groups').select('*').eq('production_id', production.id).order('order_index'),
      supabase.from('production_members').select('*').eq('production_id', production.id).order('created_at'),
      supabase.from('members').select('*').eq('organization_id', production.organization_id).order('created_at'),
      supabase.from('production_member_groups').select('*'),
    ])

    const memberMap = Object.fromEntries((m ?? []).map(mem => [mem.id, mem]))
    const groupMap: Record<string, Set<string>> = {}
    for (const row of pmg ?? []) {
      if (!groupMap[row.production_member_id]) groupMap[row.production_member_id] = new Set()
      groupMap[row.production_member_id].add(row.cast_group_id)
    }
    const castEntries: CastEntry[] = (pm ?? [])
      .filter(p => memberMap[p.member_id])
      .map(p => ({ ...p, member: memberMap[p.member_id], groupIds: groupMap[p.id] ?? new Set() }))

    setGroups(g ?? [])
    setCasts(castEntries)
    setAllMembers(m ?? [])
    setLoading(false)
  }

  const assignedMemberIds = new Set(casts.map(c => c.member_id))
  const unassignedMembers = allMembers.filter(m => !assignedMemberIds.has(m.id))

  const handleAddCast = async (memberId: string, roleName: string | null, groupIds: string[]) => {
    const { data } = await supabase
      .from('production_members')
      .insert({ production_id: production.id, member_id: memberId, role_name: roleName })
      .select().single()
    if (!data) return
    if (groupIds.length > 0) {
      await supabase.from('production_member_groups').insert(
        groupIds.map(gid => ({ production_member_id: data.id, cast_group_id: gid }))
      )
    }
    const member = allMembers.find(m => m.id === memberId)!
    setCasts(prev => [...prev, { ...data, member, groupIds: new Set(groupIds) }])
    setAddModalOpen(false)
  }

  const removeCast = async (id: string) => {
    await supabase.from('production_members').delete().eq('id', id)
    setCasts(prev => prev.filter(c => c.id !== id))
  }

  const handleCastSaved = (castId: string, roleName: string | null, groupIds: Set<string>) => {
    setCasts(prev => prev.map(c =>
      c.id === castId ? { ...c, role_name: roleName, groupIds } : c
    ))
    setEditingCast(null)
  }

  const handleGroupCreated = (group: CastGroup) => {
    setGroups(prev => [...prev, group])
  }

  const handleGroupUpdated = (group: CastGroup) => {
    setGroups(prev => prev.map(g => g.id === group.id ? group : g))
  }

  const handleGroupDeleted = (id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id))
    setCasts(prev => prev.map(c => {
      const s = new Set(c.groupIds); s.delete(id)
      return { ...c, groupIds: s }
    }))
  }

  const handleCreateGroup = async (name: string, color: string): Promise<CastGroup | null> => {
    const { data } = await supabase
      .from('cast_groups')
      .insert({ production_id: production.id, name, color, order_index: groups.length })
      .select().single()
    if (data) {
      setGroups(prev => [...prev, data])
      return data
    }
    return null
  }

  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#666666]">{casts.length} 名</p>
        <button
          onClick={() => setAddModalOpen(true)}
          disabled={unassignedMembers.length === 0}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-40 border-none cursor-pointer disabled:cursor-not-allowed"
        >
          <Plus size={15} />
          キャストを追加
        </button>
      </div>

      {casts.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">キャストがまだいません</p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          <div className="grid grid-cols-[1fr_1fr_1fr_64px] px-4 py-2 border-b border-[#E5E5E5] bg-[#FAFAFA]">
            <span className="text-xs font-medium text-[#666666]">役名</span>
            <span className="text-xs font-medium text-[#666666]">キャスト</span>
            <span className="text-xs font-medium text-[#666666]">グループ</span>
            <span />
          </div>
          {casts.map((cast, i) => (
            <div
              key={cast.id}
              className={`grid grid-cols-[1fr_1fr_1fr_64px] items-center px-4 py-2.5 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <span className={`text-sm ${cast.role_name ? 'text-[#111111]' : 'text-[#CCCCCC]'}`}>
                {cast.role_name ?? '未入力'}
              </span>

              <span className="text-sm text-[#111111]">{cast.member.name}</span>

              <div className="flex flex-wrap items-center gap-1">
                {groups.filter(g => cast.groupIds.has(g.id)).map(g => (
                  <TagBadge key={g.id} group={g} />
                ))}
              </div>

              <div className="flex items-center gap-0.5 justify-self-end">
                <button
                  onClick={() => setEditingCast(cast)}
                  className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => removeCast(cast.id)}
                  className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => setAddModalOpen(true)}
            disabled={unassignedMembers.length === 0}
            className="flex items-center gap-1.5 w-full px-5 py-3 border-t border-[#E5E5E5] text-sm text-[#999999] hover:text-[#111111] hover:bg-[#F5F5F5] bg-transparent cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} />
            キャストを追加
          </button>
        </div>
      )}

      {addModalOpen && (
        <CastEntryModal
          productionId={production.id}
          members={unassignedMembers}
          groups={groups}
          onSave={handleAddCast}
          onGroupCreated={handleGroupCreated}
          onClose={() => setAddModalOpen(false)}
        />
      )}

      {editingCast && (
        <CastDetailModal
          cast={editingCast}
          groups={groups}
          onSaved={(roleName, groupIds) => handleCastSaved(editingCast.id, roleName, groupIds)}
          onGroupCreated={handleGroupCreated}
          onGroupUpdated={handleGroupUpdated}
          onGroupDeleted={handleGroupDeleted}
          onCreate={handleCreateGroup}
          onClose={() => setEditingCast(null)}
        />
      )}
    </div>
  )
}
