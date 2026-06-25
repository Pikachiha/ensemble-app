import { useEffect, useRef, useState } from 'react'
import { Copy, Layers, Plus, Printer, Settings2, Trash2, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { MizenPlacement, Prop, PropPlacement, Scene, StageDiagram } from '../types'
import { StageGrid, cmToPx, kenToCanvas } from './StageGrid'
import { getCastColor, getTagColor } from '../constants/tagColors'

const CAST_DIAMETER_CM = 30

type CastOption = {
  sceneCastId: string
  memberId: string
  memberName: string
  roleName: string | null
  groupColor: string
}
type PropPlacementFull = PropPlacement & { prop: Prop }
type MizenPlacementFull = MizenPlacement & CastOption
type DragState = { id: string; type: 'prop' | 'cast'; offsetX: number; offsetY: number }

// クリップボードのデータ形式（シーンを跨いでコピペするためにmember_idで保存）
type ClipboardData = {
  propPlacements: Array<{ prop_id: string; x: number; y: number; width: number; height: number; rotation: number }>
  mizenPlacements: Array<{ member_id: string; x: number; y: number; direction: number }>
}

type Props = { scene: Scene; productionId: string; defaultWidthKen?: number; defaultDepthKen?: number }

export default function StageDiagramEditor({ scene, productionId, defaultWidthKen = 10, defaultDepthKen = 6 }: Props) {
  const [diagrams, setDiagrams] = useState<StageDiagram[]>([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [propPlacements, setPropPlacements] = useState<PropPlacementFull[]>([])
  const [mizenPlacements, setMizenPlacements] = useState<MizenPlacementFull[]>([])
  const [availableProps, setAvailableProps] = useState<Prop[]>([])
  const [castOptions, setCastOptions] = useState<CastOption[]>([])
  const [showMizen, setShowMizen] = useState(true)
  const [selected, setSelected] = useState<{ id: string; type: 'prop' | 'cast' } | null>(null)
  const [dragState, setDragState] = useState<DragState | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [widthKenInput, setWidthKenInput] = useState('10')
  const [comment, setComment] = useState('')
  const [depthKenInput, setDepthKenInput] = useState('6')
  const [loading, setLoading] = useState(true)
  const [scale, setScale] = useState(1)
  const [hasClipboard, setHasClipboard] = useState(false)
  const svgRef = useRef<SVGSVGElement>(null)

  const diagram = diagrams[currentIdx] ?? null

  useEffect(() => {
    if (loading || !diagram) return
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / (diagram.width_ken * 80))
    })
    ro.observe(svg)
    return () => ro.disconnect()
  }, [loading, diagram])

  useEffect(() => { init() }, [scene.id])

  useEffect(() => {
    setHasClipboard(!!localStorage.getItem('diagramClipboard'))
  }, [])

  // 小道具タブで変更後に戻ってきたとき配置データをリフレッシュ
  useEffect(() => {
    const onFocus = () => { if (diagram) loadData(diagram.id) }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [diagram])

  async function init() {
    setLoading(true)
    try {
      let { data: allDiags } = await supabase
        .from('stage_diagrams').select('*')
        .eq('scene_id', scene.id)
        .order('page_number')

      if (!allDiags || allDiags.length === 0) {
        const { data: inserted } = await supabase.from('stage_diagrams')
          .insert({ scene_id: scene.id, width_ken: defaultWidthKen, depth_ken: defaultDepthKen, page_number: 1 })
          .select().single()
        if (inserted) allDiags = [inserted]
      }

      if (!allDiags || allDiags.length === 0) return

      setDiagrams(allDiags)
      setCurrentIdx(0)
      const first = allDiags[0]
      setWidthKenInput(String(first.width_ken))
      setDepthKenInput(String(first.depth_ken))
      setComment(first.comment ?? '')
      await loadData(first.id)
    } finally {
      setLoading(false)
    }
  }

  async function loadData(diagramId: string) {
    const [{ data: pp }, { data: mp }, { data: prp }, { data: sc }, { data: pm }] = await Promise.all([
      supabase.from('prop_placements').select('*, prop:props(*)').eq('stage_diagram_id', diagramId),
      supabase.from('mizen_placements').select('*').eq('stage_diagram_id', diagramId),
      supabase.from('props').select('*').eq('production_id', productionId),
      supabase.from('scene_casts').select('*, members!member_id(id, name)').eq('scene_id', scene.id),
      supabase.from('production_members').select('id, member_id, role_name').eq('production_id', productionId),
    ])

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

    const castOpts: CastOption[] = (sc ?? []).map(s => {
      const prodMember = (pm ?? []).find(p => p.member_id === s.member_id)
      return {
        sceneCastId: s.id,
        memberId: s.member_id,
        memberName: (s as any).members?.name ?? '?',
        roleName: (prodMember as any)?.role_name ?? s.role_name,
        groupColor: colorMap[s.member_id] ?? '#888888',
      }
    })

    setPropPlacements((pp ?? []).map(p => ({ ...p, prop: (p as any).prop as Prop })))
    setMizenPlacements((mp ?? []).map(m => {
      const cast = castOpts.find(c => c.sceneCastId === m.scene_cast_id)
      return { ...m, ...(cast ?? { sceneCastId: m.scene_cast_id, memberId: '', memberName: '?', roleName: null, groupColor: '#888888' }) }
    }))
    setAvailableProps(prp ?? [])
    setCastOptions(castOpts)
    setSelected(null)
  }

  async function switchPage(idx: number) {
    if (idx === currentIdx) return
    setCurrentIdx(idx)
    const d = diagrams[idx]
    setWidthKenInput(String(d.width_ken))
    setDepthKenInput(String(d.depth_ken))
    setComment(d.comment ?? '')
    await loadData(d.id)
  }

  async function addPage() {
    if (!diagram) return
    const maxPage = Math.max(...diagrams.map(d => d.page_number ?? 1))
    const { data } = await supabase.from('stage_diagrams')
      .insert({ scene_id: scene.id, width_ken: diagram.width_ken, depth_ken: diagram.depth_ken, page_number: maxPage + 1 })
      .select().single()
    if (!data) return
    const newDiagrams = [...diagrams, data]
    setDiagrams(newDiagrams)
    setCurrentIdx(newDiagrams.length - 1)
    setWidthKenInput(String(data.width_ken))
    setDepthKenInput(String(data.depth_ken))
    await loadData(data.id)
  }

  async function deletePage() {
    if (!diagram || diagrams.length <= 1) return
    if (!confirm(`ページ${currentIdx + 1}を削除しますか？配置済みのコンテンツもすべて削除されます。`)) return
    await supabase.from('stage_diagrams').delete().eq('id', diagram.id)
    const newDiagrams = diagrams.filter((_, i) => i !== currentIdx)
    setDiagrams(newDiagrams)
    const newIdx = Math.min(currentIdx, newDiagrams.length - 1)
    setCurrentIdx(newIdx)
    await loadData(newDiagrams[newIdx].id)
  }

  function copyPage() {
    const data: ClipboardData = {
      propPlacements: propPlacements.map(p => ({
        prop_id: p.prop_id, x: p.x, y: p.y,
        width: p.width, height: p.height, rotation: p.rotation,
      })),
      mizenPlacements: mizenPlacements.map(m => ({
        member_id: m.memberId, x: m.x, y: m.y, direction: m.direction,
      })),
    }
    localStorage.setItem('diagramClipboard', JSON.stringify(data))
    setHasClipboard(true)
  }

  async function pastePage() {
    if (!diagram) return
    const raw = localStorage.getItem('diagramClipboard')
    if (!raw) return
    const data: ClipboardData = JSON.parse(raw)

    const propInserts = data.propPlacements.map(p => ({
      stage_diagram_id: diagram.id,
      prop_id: p.prop_id, x: p.x, y: p.y,
      width: p.width, height: p.height, rotation: p.rotation,
    }))
    const mizenInserts = data.mizenPlacements
      .map(m => {
        const cast = castOptions.find(c => c.memberId === m.member_id)
        if (!cast) return null
        return { stage_diagram_id: diagram.id, scene_cast_id: cast.sceneCastId, x: m.x, y: m.y, direction: m.direction }
      })
      .filter(Boolean) as object[]

    if (propInserts.length > 0) await supabase.from('prop_placements').insert(propInserts)
    if (mizenInserts.length > 0) await supabase.from('mizen_placements').insert(mizenInserts)
    await loadData(diagram.id)
  }

  const getSvgPoint = (e: React.PointerEvent) => {
    const svg = svgRef.current
    if (!svg) return { x: 0, y: 0 }
    const pt = svg.createSVGPoint()
    pt.x = e.clientX; pt.y = e.clientY
    const m = svg.getScreenCTM()?.inverse()
    if (!m) return { x: 0, y: 0 }
    const sp = pt.matrixTransform(m)
    return { x: Math.round(sp.x), y: Math.round(sp.y) }
  }

  const handlePointerDown = (e: React.PointerEvent, id: string, type: 'prop' | 'cast', ix: number, iy: number) => {
    e.stopPropagation()
    const pt = getSvgPoint(e)
    setDragState({ id, type, offsetX: pt.x - ix, offsetY: pt.y - iy })
    setSelected({ id, type })
  }

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragState || !diagram) return
    const { cw, ch } = kenToCanvas(diagram.width_ken, diagram.depth_ken)
    const { x, y } = getSvgPoint(e)
    const nx = Math.max(0, Math.min(cw, x - dragState.offsetX))
    const ny = Math.max(0, Math.min(ch, y - dragState.offsetY))
    if (dragState.type === 'prop') {
      setPropPlacements(prev => prev.map(p => p.id === dragState.id ? { ...p, x: nx, y: ny } : p))
    } else {
      setMizenPlacements(prev => prev.map(m => m.id === dragState.id ? { ...m, x: nx, y: ny } : m))
    }
  }

  const handlePointerUp = async () => {
    if (!dragState) return
    const snapshot = dragState
    setDragState(null)
    const table = snapshot.type === 'prop' ? 'prop_placements' : 'mizen_placements'
    const item = snapshot.type === 'prop'
      ? propPlacements.find(p => p.id === snapshot.id)
      : mizenPlacements.find(m => m.id === snapshot.id)
    if (item) await supabase.from(table).update({ x: item.x, y: item.y }).eq('id', item.id)
  }

  const addProp = async (prop: Prop) => {
    if (!diagram) return
    const { cw, ch } = kenToCanvas(diagram.width_ken, diagram.depth_ken)
    const { data } = await supabase.from('prop_placements').insert({
      stage_diagram_id: diagram.id, prop_id: prop.id,
      x: Math.round(cw / 2), y: Math.round(ch / 2),
      width: prop.default_width, height: prop.default_height,
    }).select().maybeSingle()
    if (data) setPropPlacements(prev => [...prev, { ...data, prop }])
  }

  const addCast = async (cast: CastOption) => {
    if (!diagram) return
    const { cw, ch } = kenToCanvas(diagram.width_ken, diagram.depth_ken)
    const { data } = await supabase.from('mizen_placements').insert({
      stage_diagram_id: diagram.id, scene_cast_id: cast.sceneCastId,
      x: Math.round(cw / 2), y: Math.round(ch / 2),
    }).select().maybeSingle()
    if (data) setMizenPlacements(prev => [...prev, { ...data, ...cast }])
  }

  const deleteSelected = async () => {
    if (!selected) return
    if (selected.type === 'prop') {
      await supabase.from('prop_placements').delete().eq('id', selected.id)
      setPropPlacements(prev => prev.filter(p => p.id !== selected.id))
    } else {
      await supabase.from('mizen_placements').delete().eq('id', selected.id)
      setMizenPlacements(prev => prev.filter(m => m.id !== selected.id))
    }
    setSelected(null)
  }

  const saveComment = async () => {
    if (!diagram) return
    await supabase.from('stage_diagrams').update({ comment }).eq('id', diagram.id)
    setDiagrams(prev => prev.map((d, i) => i === currentIdx ? { ...d, comment } : d))
  }

  const saveSettings = async () => {
    if (!diagram) return
    const wk = parseFloat(widthKenInput) || 10
    const dk = parseFloat(depthKenInput) || 6
    await supabase.from('stage_diagrams').update({ width_ken: wk, depth_ken: dk }).eq('id', diagram.id)
    setDiagrams(prev => prev.map((d, i) => i === currentIdx ? { ...d, width_ken: wk, depth_ken: dk } : d))
    setSettingsOpen(false)
  }

  const handlePrint = () => {
    const svg = svgRef.current
    if (!svg) return
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(`<!DOCTYPE html><html><head><title>${scene.name} 舞台図</title>
      <style>@media print{body{margin:0}}body{display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}</style>
      </head><body>${svg.outerHTML}</body></html>`)
    win.document.close()
    win.focus()
    setTimeout(() => { win.print(); win.close() }, 300)
  }

  if (loading) return <div className="p-4 text-sm text-[#666666]">読み込み中...</div>
  if (!diagram) return null

  const { cw, ch } = kenToCanvas(diagram.width_ken, diagram.depth_ken)
  const placedCastIds = new Set(mizenPlacements.map(m => m.sceneCastId))
  const toPx = (cm: number) => cmToPx(cm, cw, diagram.width_ken)

  const CIRCLED = '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳'
  const propLabelMap = (() => {
    const groups: Record<string, string[]> = {}
    for (const pp of propPlacements) {
      if (!groups[pp.prop.id]) groups[pp.prop.id] = []
      groups[pp.prop.id].push(pp.id)
    }
    const map: Record<string, string> = {}
    for (const pp of propPlacements) {
      const ids = groups[pp.prop.id]
      const idx = ids.indexOf(pp.id)
      map[pp.id] = ids.length > 1 ? `${pp.prop.name}${CIRCLED[idx] ?? idx + 1}` : pp.prop.name
    }
    return map
  })()

  return (
    <div className="flex flex-col gap-3">
      {/* ツールバー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowMizen(v => !v)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${showMizen ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#999999]'}`}
          >
            <Layers size={13} />ミザンを表示
          </button>
          {selected && (
            <button onClick={deleteSelected}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border border-[#EF4444] text-[#EF4444] hover:bg-[#FEE2E2] cursor-pointer bg-white">
              <X size={13} />削除
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={copyPage}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none" title="このページをコピー">
            <Copy size={13} />コピー
          </button>
          {hasClipboard && (
            <button onClick={pastePage}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none" title="ペースト">
              ペースト
            </button>
          )}
          <button onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none" title="サイズ設定">
            <Settings2 size={15} />
          </button>
          <button onClick={handlePrint}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none" title="印刷">
            <Printer size={15} />
          </button>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        {/* サイドバー */}
        <div className="w-40 flex-shrink-0 flex flex-col gap-5">
          <div>
            <p className="text-xs font-medium text-[#666666] mb-2">小道具</p>
            {availableProps.length === 0 ? (
              <p className="text-xs text-[#999999]">なし</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {availableProps.map(prop => (
                  <div key={prop.id} className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-3 h-3 rounded-sm flex-shrink-0" style={{ background: prop.color }} />
                      <span className="text-xs text-[#111111] truncate">{prop.name}</span>
                    </div>
                    <button onClick={() => addProp(prop)}
                      className="text-[11px] text-[#666666] hover:text-[#111111] flex-shrink-0 bg-transparent border-none cursor-pointer px-1 whitespace-nowrap">
                      +配置
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {showMizen && (
            <div>
              <p className="text-xs font-medium text-[#666666] mb-2">キャスト</p>
              {castOptions.length === 0 ? (
                <p className="text-xs text-[#999999]">香盤表にキャストがいません</p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {castOptions.map(cast => {
                    const placed = placedCastIds.has(cast.sceneCastId)
                    return (
                      <div key={cast.sceneCastId} className="flex items-center justify-between gap-1">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: cast.groupColor }} />
                          <span className="text-xs text-[#111111] truncate">{cast.roleName ?? cast.memberName}</span>
                        </div>
                        <button
                          onClick={() => !placed && addCast(cast)}
                          disabled={placed}
                          className={`text-[11px] flex-shrink-0 bg-transparent border-none px-1 whitespace-nowrap ${placed ? 'text-[#CCCCCC] cursor-default' : 'text-[#666666] hover:text-[#111111] cursor-pointer'}`}
                        >
                          {placed ? '済' : '+配置'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* SVGキャンバスエリア */}
        <div className="flex-1 flex flex-col gap-0">
          {/* ページタブ */}
          <div className="flex items-center border border-b-0 border-[#E5E5E5] bg-[#FAFAFA]">
            {diagrams.map((d, i) => (
              <button
                key={d.id}
                onClick={() => switchPage(i)}
                className={`px-3 py-1.5 text-xs border-r border-[#E5E5E5] cursor-pointer bg-transparent border-t-0 border-b-0 border-l-0 transition-colors ${
                  i === currentIdx
                    ? 'text-[#111111] font-medium bg-white'
                    : 'text-[#999999] hover:text-[#111111] hover:bg-[#F0F0F0]'
                }`}
              >
                ページ{i + 1}
              </button>
            ))}
            <button
              onClick={addPage}
              className="flex items-center gap-0.5 px-2.5 py-1.5 text-xs text-[#999999] hover:text-[#111111] hover:bg-[#F0F0F0] cursor-pointer bg-transparent border-none"
              title="ページを追加"
            >
              <Plus size={12} />
            </button>
            {diagrams.length > 1 && (
              <button
                onClick={deletePage}
                className="ml-auto px-2.5 py-1.5 text-xs text-[#999999] hover:text-[#EF4444] hover:bg-[#F0F0F0] cursor-pointer bg-transparent border-none border-l border-[#E5E5E5]"
                title="このページを削除"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>

          {/* SVGキャンバス */}
          <div className="border border-[#E5E5E5] overflow-hidden bg-white">
            <svg
              ref={svgRef}
              viewBox={`0 0 ${cw} ${ch}`}
              style={{ width: '100%', display: 'block', cursor: dragState ? 'grabbing' : 'default' }}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerLeave={handlePointerUp}
              onClick={() => setSelected(null)}
            >
              <rect x={0} y={0} width={cw} height={ch} fill="white" />
              <StageGrid cw={cw} ch={ch} widthKen={diagram.width_ken} depthKen={diagram.depth_ken} scale={scale} />

              {propPlacements.map(pp => {
                const sel = selected?.id === pp.id
                const pw = toPx(pp.prop.default_width), ph = toPx(pp.prop.default_height)
                const hw = pw / 2, hh = ph / 2
                const tc = getTagColor(pp.prop.color)
                const sw = 1 / scale
                return (
                  <g key={pp.id} style={{ cursor: 'grab' }}
                    onPointerDown={e => handlePointerDown(e, pp.id, 'prop', pp.x, pp.y)}
                    onClick={e => { e.stopPropagation(); setSelected({ id: pp.id, type: 'prop' }) }}>
                    {pp.prop.shape === 'circle' ? (
                      <ellipse cx={pp.x} cy={pp.y} rx={hw} ry={hh} fill={sel ? tc.mid : tc.border} stroke={tc.mid} strokeWidth={sw} />
                    ) : pp.prop.shape === 'triangle' ? (
                      <polygon points={`${pp.x},${pp.y - hh} ${pp.x - hw},${pp.y + hh} ${pp.x + hw},${pp.y + hh}`}
                        fill={sel ? tc.mid : tc.border} transform={`rotate(${pp.rotation},${pp.x},${pp.y})`} stroke={tc.mid} strokeWidth={sw} />
                    ) : (
                      <rect x={pp.x - hw} y={pp.y - hh} width={pw} height={ph} rx={0}
                        fill={sel ? tc.mid : tc.border} transform={`rotate(${pp.rotation},${pp.x},${pp.y})`} stroke={tc.mid} strokeWidth={sw} />
                    )}
                    <text x={pp.x} y={pp.y} textAnchor="middle" dominantBaseline="central" fontSize={10 / scale} fill={tc.text}>{propLabelMap[pp.id]}</text>
                  </g>
                )
              })}

              {showMizen && mizenPlacements.map(mp => {
                const sel = selected?.id === mp.id
                const label = mp.roleName ?? ''
                const tc = getCastColor(mp.groupColor)
                return (
                  <g key={mp.id} style={{ cursor: 'grab' }}
                    onPointerDown={e => handlePointerDown(e, mp.id, 'cast', mp.x, mp.y)}
                    onClick={e => { e.stopPropagation(); setSelected({ id: mp.id, type: 'cast' }) }}>
                    <circle cx={mp.x} cy={mp.y} r={toPx(CAST_DIAMETER_CM / 2)} fill={sel ? tc.border : tc.bg} stroke={tc.border} strokeWidth={1 / scale} />
                    <text x={mp.x} y={mp.y + toPx(CAST_DIAMETER_CM / 2) + 14 / scale} textAnchor="middle"
                      fontSize={10 / scale} fill="#333333">{label}</text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>
      </div>

      {/* キッカケメモ */}
      <div>
        <label className="block text-xs text-[#999999] mb-1.5">メモ</label>
        <textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          onBlur={saveComment}
          placeholder="どのセリフ・歌詞でこの構図になるかをメモ..."
          rows={2}
          className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000] resize-none text-[#111111] placeholder:text-[#CCCCCC]"
        />
      </div>

      {/* 設定モーダル */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-xs p-6">
            <h3 className="text-base font-semibold text-[#111111] mb-4">舞台サイズ設定</h3>
            <div className="flex flex-col gap-3 mb-5">
              <div>
                <label className="block text-sm text-[#111111] mb-1.5">横（間）</label>
                <input type="number" value={widthKenInput} onChange={e => setWidthKenInput(e.target.value)}
                  min={1} max={30} step={0.5}
                  className="w-full px-3 py-2 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
              </div>
              <div>
                <label className="block text-sm text-[#111111] mb-1.5">縦（間）</label>
                <input type="number" value={depthKenInput} onChange={e => setDepthKenInput(e.target.value)}
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
