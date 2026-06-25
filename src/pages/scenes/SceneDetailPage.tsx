import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Production, Scene } from '../../types'
import StageDiagramEditor from '../../components/StageDiagramEditor'

export default function SceneDetailPage() {
  const { id: productionId, sceneId } = useParams<{ id: string; sceneId: string }>()
  const navigate = useNavigate()
  const [production, setProduction] = useState<Production | null>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      const [{ data: prod }, { data: sc }] = await Promise.all([
        supabase.from('productions').select('*').eq('id', productionId!).single(),
        supabase.from('scenes').select('*').eq('id', sceneId!).single(),
      ])
      setProduction(prod)
      setScene(sc)
      setLoading(false)
    }
    fetchData()
  }, [sceneId])

  if (loading) return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>
  if (!production || !scene) return <div className="p-8 text-sm text-[#666666]">データが見つかりません</div>

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(`/productions/${productionId}?tab=scenes`)}
        className="flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#111111] bg-transparent border-none cursor-pointer p-0 mb-6"
      >
        <ArrowLeft size={15} />
        {production.name} / シーン
      </button>

      <h2 className="text-xl font-semibold text-[#111111] mb-6">{scene.name} — 舞台図</h2>

      <StageDiagramEditor
        scene={scene}
        productionId={productionId!}
        defaultWidthKen={production.stage_width_ken ?? 10}
        defaultDepthKen={production.stage_depth_ken ?? 6}
      />
    </div>
  )
}
