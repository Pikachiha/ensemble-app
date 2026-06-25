import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Pencil, Settings2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Production, Prop, PropPlacement, Scene, StageDiagram } from '../../../types'
import StageDiagramViewer, { type MizenPlacementFull, type PropPlacementFull } from '../../../components/StageDiagramViewer'
import StageDiagramEditor from '../../../components/StageDiagramEditor'

type Props = { production: Production }

type FlatPage = {
  scene: Scene
  diagram: StageDiagram
  propPlacements: PropPlacementFull[]
  mizenPlacements: MizenPlacementFull[]
}

export default function DiagramsTab({ production }: Props) {
  const [scenes, setScenes] = useState<Scene[]>([])
  const [pages, setPages] = useState<FlatPage[]>([])
  const [globalIndex, setGlobalIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [widthInput, setWidthInput] = useState('10')
  const [depthInput, setDepthInput] = useState('6')
  const [stageWidth, setStageWidth] = useState(10)
  const [stageDepth, setStageDepth] = useState(6)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorSceneIdx, setEditorSceneIdx] = useState(0)

  useEffect(() => { loadAll() }, [production.id])

  async function loadAll() {
    setLoading(true)

    const [{ data: sceneData }, { data: prod }] = await Promise.all([
      supabase.from('scenes').select('*').eq('production_id', production.id).order('order_index'),
      supabase.from('productions').select('stage_width_ken, stage_depth_ken').eq('id', production.id).single(),
    ])

    if (prod) {
      const w = prod.stage_width_ken ?? 10
      const d = prod.stage_depth_ken ?? 6
      setStageWidth(w); setStageDepth(d)
      setWidthInput(String(w)); setDepthInput(String(d))
    }

    const sceneList: Scene[] = sceneData ?? []
    setScenes(sceneList)

    if (sceneList.length === 0) { setLoading(false); return }

    const sceneIds = sceneList.map(s => s.id)

    // まずダイアグラム一覧とキャスト・メンバーを並列取得
    const [
      { data: diagrams },
      { data: allSC },
      { data: pm },
    ] = await Promise.all([
      supabase.from('stage_diagrams').select('*').in('scene_id', sceneIds).order('page_number'),
      supabase.from('scene_casts').select('*, members!member_id(id, name)').in('scene_id', sceneIds),
      supabase.from('production_members').select('id, member_id, role_name').eq('production_id', production.id),
    ])

    // ダイアグラムIDが確定してから配置データを取得
    const diagramIds = (diagrams ?? []).map(d => d.id)
    const [{ data: allPP }, { data: allMP }] = diagramIds.length > 0
      ? await Promise.all([
          supabase.from('prop_placements').select('*, prop:props(*)').in('stage_diagram_id', diagramIds),
          supabase.from('mizen_placements').select('*').in('stage_diagram_id', diagramIds),
        ])
      : [{ data: [] }, { data: [] }]

    // キャストの色マップを構築
    const pmIds = (pm ?? []).map(p => p.id)
    const colorMap: Record<string, string> = {}
    if (pmIds.length > 0) {
      const { data: pmgs } = await supabase
        .from('production_member_groups')
        .select('production_member_id, cast_groups(color)')
        .in('production_member_id', pmIds)
      for (const pmg of pmgs ?? []) {
        const pmr = (pm ?? []).find(p => p.id === pmg.production_member_id)
        if (pmr && (pmg as any).cast_groups?.color) colorMap[pmr.member_id] = (pmg as any).cast_groups.color
      }
    }

    // scene_id → CastOption のマップ
    const castByScene: Record<string, { sceneCastId: string; memberName: string; roleName: string | null; groupColor: string }[]> = {}
    for (const sc of allSC ?? []) {
      if (!castByScene[sc.scene_id]) castByScene[sc.scene_id] = []
      const prodMember = (pm ?? []).find(p => p.member_id === sc.member_id)
      castByScene[sc.scene_id].push({
        sceneCastId: sc.id,
        memberName: (sc as any).members?.name ?? '?',
        roleName: (prodMember as any)?.role_name ?? sc.role_name,
        groupColor: colorMap[sc.member_id] ?? '#888888',
      })
    }

    // diagram_id → placements のマップ
    const ppByDiagram: Record<string, PropPlacementFull[]> = {}
    for (const pp of allPP ?? []) {
      const d = pp as PropPlacement & { prop: Prop }
      if (!ppByDiagram[d.stage_diagram_id]) ppByDiagram[d.stage_diagram_id] = []
      ppByDiagram[d.stage_diagram_id].push({ ...d, prop: (d as any).prop as Prop })
    }

    const mpByDiagram: Record<string, MizenPlacementFull[]> = {}
    for (const mp of allMP ?? []) {
      if (!mpByDiagram[mp.stage_diagram_id]) mpByDiagram[mp.stage_diagram_id] = []
      const castOpts = castByScene[
        (diagrams ?? []).find(d => d.id === mp.stage_diagram_id)?.scene_id ?? ''
      ] ?? []
      const cast = castOpts.find(c => c.sceneCastId === mp.scene_cast_id)
      mpByDiagram[mp.stage_diagram_id].push({
        ...mp,
        memberName: cast?.memberName ?? '?',
        roleName: cast?.roleName ?? null,
        groupColor: cast?.groupColor ?? '#888888',
      })
    }

    // FlatPage 配列を組み立て
    const flat: FlatPage[] = []
    for (const scene of sceneList) {
      const sceneDiags = (diagrams ?? []).filter(d => d.scene_id === scene.id)
      for (const diagram of sceneDiags) {
        flat.push({
          scene,
          diagram,
          propPlacements: ppByDiagram[diagram.id] ?? [],
          mizenPlacements: mpByDiagram[diagram.id] ?? [],
        })
      }
    }

    setPages(flat)
    setGlobalIndex(0)
    setLoading(false)
  }

  const saveSettings = async () => {
    const wk = parseFloat(widthInput) || 10
    const dk = parseFloat(depthInput) || 6
    await supabase.from('productions').update({ stage_width_ken: wk, stage_depth_ken: dk }).eq('id', production.id)
    setStageWidth(wk); setStageDepth(dk)
    setSettingsOpen(false)
  }

  const openEditor = () => {
    const currentScene = pages[globalIndex]?.scene
    const si = currentScene ? scenes.findIndex(s => s.id === currentScene.id) : 0
    setEditorSceneIdx(si >= 0 ? si : 0)
    setEditorOpen(true)
  }

  const handleEditorClose = () => {
    setEditorOpen(false)
    loadAll()
  }

  const handleSceneSelect = (sceneId: string) => {
    const idx = pages.findIndex(p => p.scene.id === sceneId)
    if (idx >= 0) setGlobalIndex(idx)
  }

  if (loading) return <div className="text-sm text-[#666666]">読み込み中...</div>
  if (scenes.length === 0) return (
    <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
      <p className="text-sm text-[#666666]">シーンが登録されていません</p>
    </div>
  )

  const safeIndex = Math.min(globalIndex, Math.max(0, pages.length - 1))
  const currentPage = pages[safeIndex] ?? null
  const currentSceneId = currentPage?.scene.id ?? scenes[0]?.id

  return (
    <div className="flex flex-col gap-4">
      {/* 基本舞台設定バー */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F5F5F5] rounded-lg">
        <div className="flex items-center gap-3">
          <span className="text-xs text-[#666666]">基本舞台サイズ</span>
          <span className="text-xs font-medium text-[#111111]">横 {stageWidth}間 × 奥行 {stageDepth}間</span>
          <span className="text-xs text-[#999999]">（{Math.round(stageWidth * 180 / 100) / 10}m × {Math.round(stageDepth * 180 / 100) / 10}m）</span>
        </div>
        <button onClick={() => setSettingsOpen(true)}
          className="flex items-center gap-1.5 text-xs text-[#666666] hover:text-[#111111] bg-transparent border-none cursor-pointer">
          <Settings2 size={13} />変更
        </button>
      </div>

      {/* ナビゲーション */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={currentSceneId}
            onChange={e => handleSceneSelect(e.target.value)}
            className="pl-2.5 pr-7 py-1.5 text-sm font-medium border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000] bg-white text-[#111111] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center]"
          >
            {scenes.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setGlobalIndex(i => Math.max(0, i - 1))}
              disabled={safeIndex === 0}
              className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded disabled:opacity-30 disabled:cursor-default cursor-pointer bg-transparent border-none"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-[#666666] tabular-nums">
              {pages.length === 0 ? '—' : `${safeIndex + 1} / ${pages.length}`}
            </span>
            <button
              onClick={() => setGlobalIndex(i => Math.min(pages.length - 1, i + 1))}
              disabled={safeIndex >= pages.length - 1}
              className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded disabled:opacity-30 disabled:cursor-default cursor-pointer bg-transparent border-none"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>

        <button onClick={openEditor}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-[#E5E5E5] rounded-lg text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] bg-white cursor-pointer flex-shrink-0">
          <Pencil size={13} />編集
        </button>
      </div>

      {/* ビューアー */}
      {currentPage ? (
        <StageDiagramViewer
          key={currentPage.diagram.id}
          diagram={currentPage.diagram}
          scene={currentPage.scene}
          productionId={production.id}
          propPlacements={currentPage.propPlacements}
          mizenPlacements={currentPage.mizenPlacements}
        />
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">舞台図がまだありません</p>
          <p className="text-xs text-[#999999] mt-1">編集ボタンから作成してください</p>
        </div>
      )}

      {/* エディタオーバーレイ */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-[#E5E5E5] flex-shrink-0">
            <div className="flex items-center gap-3">
              <button onClick={handleEditorClose}
                className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none">
                <X size={18} />
              </button>
              <span className="text-sm text-[#999999]">舞台図を編集</span>
            </div>
            <select
              value={editorSceneIdx}
              onChange={e => setEditorSceneIdx(Number(e.target.value))}
              className="pl-3 pr-8 py-1.5 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000] bg-white text-[#111111] cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%3E%3Cpath%20fill%3D%22none%22%20stroke%3D%22%23666%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M6%209l6%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[right_8px_center]"
            >
              {scenes.map((s, i) => (
                <option key={s.id} value={i}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="flex-1 overflow-auto p-6">
            <StageDiagramEditor
              key={scenes[editorSceneIdx].id}
              scene={scenes[editorSceneIdx]}
              productionId={production.id}
              defaultWidthKen={stageWidth}
              defaultDepthKen={stageDepth}
            />
          </div>
        </div>
      )}

      {/* 基本舞台サイズ設定モーダル */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-xs p-6">
            <h3 className="text-base font-semibold text-[#111111] mb-1">基本舞台サイズ</h3>
            <p className="text-xs text-[#999999] mb-4">新しいシーンの舞台図を作成する際の初期値として使用されます。</p>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-sm text-[#111111] mb-1.5">横（間）</label>
                <input type="number" value={widthInput} onChange={e => setWidthInput(e.target.value)}
                  min={1} max={30} step={0.5}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
              </div>
              <div>
                <label className="block text-sm text-[#111111] mb-1.5">奥行（間）</label>
                <input type="number" value={depthInput} onChange={e => setDepthInput(e.target.value)}
                  min={1} max={30} step={0.5}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSettingsOpen(false)}
                className="flex-1 py-2.5 text-sm border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] cursor-pointer bg-white text-[#111111]">
                キャンセル
              </button>
              <button onClick={saveSettings}
                className="flex-1 py-2.5 text-sm bg-[#111111] text-white rounded-lg hover:bg-[#333333] cursor-pointer">
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
