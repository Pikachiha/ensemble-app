import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Prop, PropPlacement, Scene, StageDiagram } from '../types'
import { StageGrid, cmToPx, kenToCanvas } from './StageGrid'
import { getCastColor, getTagColor } from '../constants/tagColors'

const CAST_DIAMETER_CM = 30

export type PropPlacementFull = PropPlacement & { prop: Prop }
export type MizenPlacementFull = {
  id: string
  stage_diagram_id: string
  scene_cast_id: string
  x: number
  y: number
  direction: number
  label: string | null
  created_at: string
  memberName: string
  roleName: string | null
  groupColor: string
}

type Props = {
  diagram: StageDiagram
  scene: Scene
  productionId: string
  propPlacements: PropPlacementFull[]
  mizenPlacements: MizenPlacementFull[]
}

export default function StageDiagramViewer({ diagram, propPlacements, mizenPlacements }: Props) {
  const [scale, setScale] = useState(1)
  const svgRef = useRef<SVGSVGElement>(null)

  // 描画前に初回スケールを同期計測してフラッシュを防ぐ
  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const width = svg.getBoundingClientRect().width
    if (width > 0) setScale(width / (diagram.width_ken * 80))
  }, [diagram])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const ro = new ResizeObserver(([entry]) => {
      setScale(entry.contentRect.width / (diagram.width_ken * 80))
    })
    ro.observe(svg)
    return () => ro.disconnect()
  }, [diagram])

  const { cw, ch } = kenToCanvas(diagram.width_ken, diagram.depth_ken)
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
    <div className="flex flex-col gap-2">
      <div className="border border-[#E5E5E5] overflow-hidden bg-white">
        <svg ref={svgRef} viewBox={`0 0 ${cw} ${ch}`} style={{ width: '100%', display: 'block' }}>
          <rect x={0} y={0} width={cw} height={ch} fill="white" />
          <StageGrid cw={cw} ch={ch} widthKen={diagram.width_ken} depthKen={diagram.depth_ken} scale={scale} />

          {propPlacements.map(pp => {
            const pw = toPx(pp.prop.default_width), ph = toPx(pp.prop.default_height)
            const hw = pw / 2, hh = ph / 2
            const tc = getTagColor(pp.prop.color)
            return (
              <g key={pp.id}>
                {pp.prop.shape === 'circle' ? (
                  <ellipse cx={pp.x} cy={pp.y} rx={hw} ry={hh} fill={tc.border} stroke={tc.mid} strokeWidth={1 / scale} />
                ) : pp.prop.shape === 'triangle' ? (
                  <polygon points={`${pp.x},${pp.y - hh} ${pp.x - hw},${pp.y + hh} ${pp.x + hw},${pp.y + hh}`}
                    fill={tc.border} transform={`rotate(${pp.rotation},${pp.x},${pp.y})`} stroke={tc.mid} strokeWidth={1 / scale} />
                ) : (
                  <rect x={pp.x - hw} y={pp.y - hh} width={pw} height={ph} rx={0}
                    fill={tc.border} transform={`rotate(${pp.rotation},${pp.x},${pp.y})`} stroke={tc.mid} strokeWidth={1 / scale} />
                )}
                <text x={pp.x} y={pp.y} textAnchor="middle" dominantBaseline="central" fontSize={10 / scale} fill={tc.text}>{propLabelMap[pp.id]}</text>
              </g>
            )
          })}

          {mizenPlacements.map(mp => {
            const tc = getCastColor(mp.groupColor)
            return (
              <g key={mp.id}>
                <circle cx={mp.x} cy={mp.y} r={toPx(CAST_DIAMETER_CM / 2)} fill={tc.bg} stroke={tc.border} strokeWidth={0.5 / scale} />
                <text x={mp.x} y={mp.y + toPx(CAST_DIAMETER_CM / 2) + 11 / scale} textAnchor="middle"
                  fontSize={10 / scale} fill="#333333">{mp.roleName ?? ''}</text>
              </g>
            )
          })}
        </svg>
      </div>

      {diagram.comment && (
        <div className="px-3 py-2 bg-[#F5F5F5] rounded-lg">
          <p className="text-xs text-[#999999] mb-0.5">メモ</p>
          <p className="text-sm text-[#333333] whitespace-pre-wrap">{diagram.comment}</p>
        </div>
      )}
    </div>
  )
}
