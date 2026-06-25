import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useOrganization } from '../../hooks/useOrganization'
import type { Production } from '../../types'
import ProductionModal from './ProductionModal'

export default function ProductionsPage() {
  const { organization } = useOrganization()
  const navigate = useNavigate()
  const [productions, setProductions] = useState<Production[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Production | null>(null)

  useEffect(() => {
    if (organization) fetchProductions()
  }, [organization])

  async function fetchProductions() {
    const { data } = await supabase
      .from('productions')
      .select('*')
      .eq('organization_id', organization!.id)
      .order('created_at', { ascending: false })
    setProductions(data ?? [])
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('この演目を削除しますか？シーンなどの関連データも削除されます。')) return
    await supabase.from('productions').delete().eq('id', id)
    setProductions(prev => prev.filter(p => p.id !== id))
  }

  const openCreate = () => {
    setEditing(null)
    setModalOpen(true)
  }

  const openEdit = (e: React.MouseEvent, production: Production) => {
    e.stopPropagation()
    setEditing(production)
    setModalOpen(true)
  }

  const handleSaved = (production: Production) => {
    setProductions(prev => {
      const exists = prev.find(p => p.id === production.id)
      return exists
        ? prev.map(p => p.id === production.id ? production : p)
        : [production, ...prev]
    })
    setModalOpen(false)
  }

  const formatDate = (date: string | null) => {
    if (!date) return null
    return new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' })
  }

  return (
    <div className="p-8 max-w-[800px]">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-[#111111]">演目</h2>
          <p className="text-sm text-[#666666] mt-0.5">{productions.length} 件</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer"
        >
          <Plus size={15} />
          演目を追加
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-[#666666]">読み込み中...</p>
      ) : productions.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">演目がまだありません</p>
          <button onClick={openCreate} className="mt-3 text-sm text-[#111111] underline cursor-pointer bg-transparent border-none">
            最初の演目を追加する
          </button>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {productions.map((production, i) => (
            <div
              key={production.id}
              onClick={() => navigate(`/productions/${production.id}`)}
              className={`flex items-center justify-between px-5 py-4 cursor-pointer hover:bg-[#FAFAFA] ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
            >
              <div>
                <p className="text-sm font-medium text-[#111111]">{production.name}</p>
                {production.performance_date && (
                  <p className="text-xs text-[#666666] mt-0.5">{formatDate(production.performance_date)}</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={e => openEdit(e, production)}
                  className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={e => handleDelete(e, production.id)}
                  className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                >
                  <Trash2 size={14} />
                </button>
                <ChevronRight size={16} className="text-[#999999] ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <ProductionModal
          organizationId={organization!.id}
          production={editing}
          onSaved={handleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
