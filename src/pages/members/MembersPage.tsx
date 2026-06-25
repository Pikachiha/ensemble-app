import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../hooks/useOrganization'
import type { Member } from '../../types'
import MemberModal from './MemberModal'

export default function MembersPage() {
  const { organization } = useOrganization()
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Member | null>(null)

  useEffect(() => {
    if (organization) fetchMembers()
  }, [organization])

  async function fetchMembers() {
    const { data } = await supabase
      .from('members')
      .select('*')
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: true })
    setMembers(data ?? [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このメンバーを削除しますか？')) return
    await supabase.from('members').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (member: Member) => {
    setEditing(member)
    setModalOpen(true)
  }

  const handleSaved = (member: Member) => {
    setMembers(prev => {
      const exists = prev.find(m => m.id === member.id)
      return exists ? prev.map(m => m.id === member.id ? member : m) : [...prev, member]
    })
    setModalOpen(false)
  }

  return (
    <div className="p-8 max-w-[800px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#111111]">メンバー</h2>
          <p className="text-sm text-[#666666] mt-0.5">{members.length} 名</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer"
        >
          <Plus size={15} />
          メンバーを追加
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#666666]">読み込み中...</p>
      ) : members.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">メンバーがまだいません</p>
          <button onClick={openCreate} className="mt-3 text-sm text-[#111111] underline cursor-pointer bg-transparent border-none">
            最初のメンバーを追加する
          </button>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {members.map((member, i) => (
            <div
              key={member.id}
              className={`flex items-center justify-between px-5 py-3.5 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <div>
                <p className="text-sm font-medium text-[#111111]">{member.name}</p>
                {(member.email || member.phone) && (
                  <p className="text-xs text-[#666666] mt-0.5">
                    {[member.email, member.phone].filter(Boolean).join(' · ')}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => openEdit(member)}
                  className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(member.id)}
                  className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <MemberModal
          organizationId={organization!.id}
          member={editing}
          onSaved={handleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
