import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useProductions } from '../../hooks/useProductions'
import type { Production } from '../../types'
import ProductionModal from './ProductionModal'
import CastTab from './tabs/CastTab'
import ScenesTab from './tabs/ScenesTab'
import SchedulesTab from './tabs/SchedulesTab'
import CastingTab from './tabs/CastingTab'
import PropsTab from './tabs/PropsTab'
import DiagramsTab from './tabs/DiagramsTab'

type Tab = 'cast' | 'scenes' | 'casting' | 'schedules' | 'props' | 'diagrams'

const FULL_WIDTH_TABS: Tab[] = ['casting', 'diagrams']

const TAB_LABELS: Record<Tab, string> = {
  cast: 'キャスト',
  scenes: 'シーン',
  casting: '香盤表',
  schedules: 'スケジュール',
  props: '小道具',
  diagrams: '舞台図',
}

export default function ProductionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const { updateProduction } = useProductions()
  const [production, setProduction] = useState<Production | null>(null)
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const activeTab = (searchParams.get('tab') as Tab) ?? 'cast'

  useEffect(() => {
    if (id) fetchProduction()
  }, [id])

  async function fetchProduction() {
    setLoading(true)
    const { data } = await supabase.from('productions').select('*').eq('id', id!).single()
    setProduction(data)
    setLoading(false)
  }

  const handleSaved = (updated: Production) => {
    setProduction(updated)
    updateProduction(updated)
    setModalOpen(false)
  }

if (loading) return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>
  if (!production) return <div className="p-8 text-sm text-[#666666]">演目が見つかりません</div>

  const isFullWidth = FULL_WIDTH_TABS.includes(activeTab)

  return (
    <div className={`p-8 ${isFullWidth ? '' : 'max-w-[800px]'}`}>
      <h1 className="text-xl font-semibold text-[#111111] mb-6">{TAB_LABELS[activeTab]}</h1>
      {activeTab === 'cast' && <CastTab production={production} />}
      {activeTab === 'scenes' && <ScenesTab production={production} />}
      {activeTab === 'casting' && <CastingTab production={production} />}
      {activeTab === 'schedules' && <SchedulesTab production={production} />}
      {activeTab === 'props' && <PropsTab production={production} />}
      {activeTab === 'diagrams' && <DiagramsTab production={production} />}

      {modalOpen && (
        <ProductionModal
          organizationId={production.organization_id}
          production={production}
          onSaved={handleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
