import type { Member, Scene, SceneCast } from '../types'

type CastMap = Record<string, Record<string, SceneCast | null>>

export function printCastingTable(
  productionName: string,
  scenes: Scene[],
  members: Member[],
  castMap: CastMap,
) {
  // キャスト数に応じて列幅を動的計算（A4縦 210mm - 余白20mm - シーン列120px ≒ 残り幅で割る）
  const colWidth = Math.max(20, Math.min(40, Math.floor(130 / members.length)))

  const rows = scenes.map(scene => {
    const cells = members.map(member => {
      const cast = castMap[scene.id]?.[member.id]
      if (!cast) return '<td class="cell"></td>'
      return `<td class="cell filled">${cast.role_name ? `<div class="role">${cast.role_name}</div>` : '<span class="dot">●</span>'}</td>`
    }).join('')
    return `<tr><td class="scene-name">${scene.name}</td>${cells}</tr>`
  }).join('')

  const headers = members.map(m =>
    `<th class="member-name" style="width:${colWidth}px"><div>${m.name}</div></th>`
  ).join('')

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>${productionName} 香盤表</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Hiragino Sans', 'Yu Gothic', sans-serif;
    font-size: 10px;
    color: #111;
    padding: 12px 16px;
  }
  h1 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 10px;
  }
  table {
    border-collapse: collapse;
    width: 100%;
    table-layout: fixed;
  }
  th, td {
    border: 0.5px solid #CCCCCC;
  }
  .corner {
    background: #F5F5F5;
    padding: 4px 6px;
    font-size: 9px;
    color: #999;
    width: 120px;
  }
  .member-name {
    text-align: center;
    vertical-align: bottom;
    padding: 4px 2px;
    font-weight: 500;
    font-size: 10px;
    background: #F5F5F5;
    height: 88px;
  }
  .member-name div {
    writing-mode: vertical-rl;
    text-orientation: mixed;
    white-space: nowrap;
    overflow: hidden;
    max-height: 80px;
    margin: 0 auto;
  }
  .scene-name {
    padding: 4px 6px;
    font-weight: 500;
    font-size: 10px;
    background: #F5F5F5;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    width: 120px;
  }
  .cell {
    text-align: center;
    vertical-align: middle;
    height: 24px;
    padding: 2px;
  }
  .cell.filled {
    background: #EEEEEE;
  }
  .dot {
    font-size: 10px;
  }
  .role {
    font-size: 8px;
    color: #333;
    line-height: 1.2;
    writing-mode: vertical-rl;
    white-space: nowrap;
    overflow: hidden;
    max-height: 20px;
    margin: 0 auto;
  }
  @media print {
    body { padding: 0; }
    @page {
      margin: 10mm;
      size: A4 portrait;
    }
  }
</style>
</head>
<body>
<h1>${productionName}　香盤表</h1>
<table>
  <thead>
    <tr>
      <th class="corner">シーン</th>
      ${headers}
    </tr>
  </thead>
  <tbody>
    ${rows}
  </tbody>
</table>
<script>
  window.onload = function() {
    window.print()
    window.onafterprint = function() { window.close() }
  }
</script>
</body>
</html>`

  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
