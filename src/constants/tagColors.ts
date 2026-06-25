export type TagColor = {
  key: string
  label: string
  bg: string
  text: string
  border: string
  mid: string  // border と text の中間（小道具の枠線用）
}

// 小道具用：アースカラー系
export const TAG_COLORS: TagColor[] = [
  { key: 'stone',      label: 'ストーン',   bg: '#F2EFE9', text: '#5C5650', border: '#DDD8CF', mid: '#B8B0A4' },
  { key: 'terracotta', label: 'テラコッタ', bg: '#F5E8E0', text: '#8B4A35', border: '#E5C5B0', mid: '#C8906E' },
  { key: 'sand',       label: 'サンド',     bg: '#F4EDD8', text: '#7A6430', border: '#E2D09A', mid: '#C4AA5E' },
  { key: 'olive',      label: 'オリーブ',   bg: '#EAF0DC', text: '#4A5E28', border: '#C8D9A0', mid: '#9AB86A' },
  { key: 'moss',       label: 'モス',       bg: '#E2EDE4', text: '#2E5435', border: '#AECDB4', mid: '#75A87E' },
  { key: 'slate',      label: 'スレート',   bg: '#E4EAF0', text: '#334560', border: '#A8BDD0', mid: '#6E92B0' },
  { key: 'mauve',      label: 'モーブ',     bg: '#EEE4EC', text: '#6A3D62', border: '#D4ADCC', mid: '#B078A6' },
  { key: 'charcoal',   label: 'チャコール', bg: '#E8E8E8', text: '#2C2C2C', border: '#BEBEBE', mid: '#888888' },
]

// キャストグループ用：一段濃いめの色
export const CAST_COLORS: TagColor[] = [
  { key: 'gray',   label: 'グレー',   bg: '#E5E5E5', text: '#444444', border: '#999999', mid: '#999999' },
  { key: 'red',    label: 'レッド',   bg: '#FECACA', text: '#991B1B', border: '#F87171', mid: '#F87171' },
  { key: 'orange', label: 'オレンジ', bg: '#FDE68A', text: '#92400E', border: '#FBBF24', mid: '#FBBF24' },
  { key: 'yellow', label: 'イエロー', bg: '#FEF08A', text: '#854D0E', border: '#FACC15', mid: '#FACC15' },
  { key: 'green',  label: 'グリーン', bg: '#BBF7D0', text: '#145228', border: '#34D399', mid: '#34D399' },
  { key: 'blue',   label: 'ブルー',   bg: '#BFDBFE', text: '#1E3A8A', border: '#60A5FA', mid: '#60A5FA' },
  { key: 'teal',   label: 'ティール', bg: '#99F6E4', text: '#0D5F58', border: '#2DD4BF', mid: '#2DD4BF' },
  { key: 'pink',   label: 'ピンク',   bg: '#FBCFE8', text: '#831843', border: '#F472B6', mid: '#F472B6' },
]

// キャストの色キーで検索（見つからなければグレー）
export function getCastColor(key: string): TagColor {
  return CAST_COLORS.find(c => c.key === key) ?? CAST_COLORS[0]
}

// 小道具の色キーで検索（見つからなければストーン）
export function getTagColor(key: string): TagColor {
  return TAG_COLORS.find(c => c.key === key) ?? TAG_COLORS[0]
}
