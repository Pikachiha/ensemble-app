import { useEffect, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Member, Production } from '../../../types'

type Props = { production: Production }

export default function ProductionMembersTab({ production }: Props) {
  const [allMembers, setAllMembers] = useState<Member[]>([])
  const [assignedIds, setAssignedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    const { data: members } = await supabase
      .from('members')
      .select('*')
      .eq('organization_id', production.organization_id)
      .order('created_at')

    const { data: pm } = await supabase
      .from('production_members')
      .select('member_id')
      .eq('production_id', production.id)

    setAllMembers(members ?? [])
    setAssignedIds(new Set((pm ?? []).map(p => p.member_id)))
    setLoading(false)
  }

  const assign = async (memberId: string) => {
    await supabase.from('production_members').insert({ production_id: production.id, member_id: memberId })
    setAssignedIds(prev => new Set([...prev, memberId]))
  }

  const unassign = async (memberId: string) => {
    await supabase.from('production_members').delete()
      .eq('production_id', production.id).eq('member_id', memberId)
    setAssignedIds(prev => { const s = new Set(prev); s.delete(memberId); return s })
  }

  const assigned = allMembers.filter(m => assignedIds.has(m.id))
  const unassigned = allMembers.filter(m => !assignedIds.has(m.id))

  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#666666]">{assigned.length} 名が参加中</p>
        {unassigned.length > 0 && (
          <button
            onClick={() => setAdding(o => !o)}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer"
          >
            <Plus size={15} />
            メンバーを追加
          </button>
        )}
      </div>

      {/* 追加パネル */}
      {adding && unassigned.length > 0 && (
        <div className="border border-[#E5E5E5] rounded-lg mb-4 overflow-hidden">
          <p className="px-4 py-2.5 text-xs font-medium text-[#666666] bg-[#FAFAFA] border-b border-[#E5E5E5]">
            追加するメンバーを選択
          </p>
          {unassigned.map((member, i) => (
            <div
              key={member.id}
              className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <span className="text-sm text-[#111111]">{member.name}</span>
              <button
                onClick={() => assign(member.id)}
                className="text-xs px-2.5 py-1 border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] cursor-pointer bg-white text-[#111111]"
              >
                追加
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 参加メンバー一覧 */}
      {assigned.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">参加メンバーがいません</p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {assigned.map((member, i) => (
            <div
              key={member.id}
              className={`flex items-center justify-between px-4 py-3 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <div>
                <p className="text-sm font-medium text-[#111111]">{member.name}</p>
                {(member.email || member.phone) && (
                  <p className="text-xs text-[#666666] mt-0.5">
                    {[member.email, member.phone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => unassign(member.id)}
                className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
