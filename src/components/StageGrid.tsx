/**
 * 舞台グリッドSVG要素
 * - 1間・半間のグリッド線
 * - 中央0基準のバミリ番号（半間ごと）
 * - 1間 = 180cm として小道具サイズを換算
 */

/** 1間あたりのSVGピクセル数（縦横共通） */
export const PX_PER_KEN = 80

/** ken値からcanvasサイズを計算 */
export function kenToCanvas(widthKen: number, depthKen: number) {
  return { cw: widthKen * PX_PER_KEN, ch: depthKen * PX_PER_KEN }
}

type StageGridProps = {
  cw: number       // canvas width (SVG単位)
  ch: number       // canvas height (SVG単位)
  widthKen: number
  depthKen: number
  /** SVGの実描画幅 / cw。文字・線幅を視覚的に固定するために使用 */
  scale?: number
}

export function StageGrid({ cw, ch, widthKen, depthKen, scale = 1 }: StageGridProps) {
  const xStep = cw / widthKen   // 1間あたりのpx（横）
  const yStep = ch / depthKen   // 1間あたりのpx（縦）
  const halfX = xStep / 2
  const halfY = yStep / 2

  // スケール補正：視覚的に一定のサイズを保つためSVG単位に逆換算
  const sw = (px: number) => px / scale          // strokeWidth
  const fs = (px: number) => px / scale          // fontSize
  const da = (a: number, b: number) => `${a / scale} ${b / scale}` // strokeDasharray

  // 縦線（1間・半間）
  const vLines: JSX.Element[] = []
  const totalHalfV = Math.ceil(widthKen * 2)
  for (let i = 0; i <= totalHalfV; i++) {
    const x = i * halfX
    const isEdge = i === 0 || i === totalHalfV
    const isFullKen = i % 2 === 0
    vLines.push(
      <line key={`v${i}`}
        x1={x} y1={0} x2={x} y2={ch}
        stroke={isEdge ? '#CCCCCC' : isFullKen ? '#DDDDDD' : '#EEEEEE'}
        strokeWidth={isEdge ? sw(1.5) : sw(1)}
        strokeDasharray={isEdge ? 'none' : isFullKen ? da(6, 4) : da(2, 5)} />
    )
  }

  // 横線（1間・半間）
  const hLines: JSX.Element[] = []
  const totalHalfH = Math.ceil(depthKen * 2)
  for (let i = 0; i <= totalHalfH; i++) {
    const y = i * halfY
    const isEdge = i === 0 || i === totalHalfH
    const isFullKen = i % 2 === 0
    hLines.push(
      <line key={`h${i}`}
        x1={0} y1={y} x2={cw} y2={y}
        stroke={isEdge ? '#CCCCCC' : isFullKen ? '#DDDDDD' : '#EEEEEE'}
        strokeWidth={isEdge ? sw(1.5) : sw(1)}
        strokeDasharray={isEdge ? 'none' : isFullKen ? da(6, 4) : da(2, 5)} />
    )
  }

  // バミリ番号（中央0、半間ごとに外側へ1,2,3...）
  const centerX = cw / 2
  const bamiNumbers: JSX.Element[] = []
  for (let i = 0; i <= totalHalfV; i++) {
    if (i === 0 || i === totalHalfV) continue  // 端のラインは表示しない
    const x = i * halfX
    const distFromCenter = Math.abs(x - centerX) / halfX
    const n = Math.round(distFromCenter)
    bamiNumbers.push(
      <text key={`bn${i}`}
        x={x} y={ch - fs(5)}
        textAnchor="middle"
        fontSize={fs(9)}
        fill={n === 0 ? '#999999' : '#BBBBBB'}
        fontWeight={n === 0 ? '600' : '400'}
      >{n}</text>
    )
  }

  // 方向ラベル
  return (
    <>
      {vLines}
      {hLines}
      {bamiNumbers}
      <text x={cw / 2} y={ch - fs(16)} textAnchor="middle" fontSize={fs(10)} fill="#CCCCCC">客席</text>
      <text x={fs(12)} y={fs(16)} fontSize={fs(10)} fill="#CCCCCC">下手</text>
      <text x={cw - fs(12)} y={fs(16)} textAnchor="end" fontSize={fs(10)} fill="#CCCCCC">上手</text>
    </>
  )
}

/** cm → SVGキャンバス単位（横方向基準） */
export function cmToPx(cm: number, cw: number, widthKen: number) {
  return cm * cw / (widthKen * 180)
}
