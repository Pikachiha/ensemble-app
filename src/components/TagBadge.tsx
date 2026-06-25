import { getCastColor } from '../constants/tagColors'
import type { TagGroup } from './TagPicker'

type Props = {
  group: TagGroup
  onRemove?: () => void
}

export default function TagBadge({ group, onRemove }: Props) {
  const color = getCastColor(group.color)
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full font-medium"
      style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
    >
      {group.name}
      {onRemove && (
        <button
          onClick={onRemove}
          className="ml-0.5 opacity-60 hover:opacity-100 bg-transparent border-none cursor-pointer p-0 leading-none"
          style={{ color: color.text }}
        >
          ×
        </button>
      )}
    </span>
  )
}
