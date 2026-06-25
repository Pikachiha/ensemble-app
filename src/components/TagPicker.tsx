import { useEffect, useRef, useState } from 'react'
import { Check, MoreHorizontal, Trash2 } from 'lucide-react'
import { CAST_COLORS, getCastColor } from '../constants/tagColors'
import { supabase } from '../lib/supabase'

export type TagGroup = {
  id: string
  name: string
  color: string
  [key: string]: unknown
}

type Props = {
  groups: TagGroup[]
  selectedIds: Set<string>
  onToggle: (group: TagGroup) => void
  onCreate: (name: string, color: string) => Promise<TagGroup | null>
  onGroupUpdated: (group: TagGroup) => void
  onGroupDeleted: (id: string) => void
  onClose: () => void
  table: string
}

type EditMode = { type: 'create' } | { type: 'edit'; group: TagGroup }

export default function TagPicker({ groups, selectedIds, onToggle, onCreate, onGroupUpdated, onGroupDeleted, onClose, table }: Props) {
  const [query, setQuery] = useState('')
  const [editMode, setEditMode] = useState<EditMode | null>(null)
  const [editName, setEditName] = useState('')
  const [editColor, setEditColor] = useState('gray')
  const [loading, setLoading] = useState(false)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const editNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (editMode) setTimeout(() => editNameRef.current?.focus(), 50)
  }, [editMode])

  const filtered = groups.filter(g => g.name.toLowerCase().includes(query.toLowerCase()))
  const exactMatch = groups.some(g => g.name === query.trim())

  const handleToggle = (group: TagGroup) => {
    onToggle(group)
    onClose()
  }

  const startCreate = () => {
    setEditMode({ type: 'create' })
    setEditName(query)
    setEditColor('gray')
  }

  const startEdit = (e: React.MouseEvent, group: TagGroup) => {
    e.stopPropagation()
    setEditMode({ type: 'edit', group })
    setEditName(group.name)
    setEditColor(group.color)
  }

  const handleSave = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!editName.trim() || loading) return
    setLoading(true)

    if (editMode?.type === 'create') {
      const group = await onCreate(editName.trim(), editColor)
      if (group) { onToggle(group); onClose() }
    } else if (editMode?.type === 'edit') {
      const { data } = await supabase
        .from(table)
        .update({ name: editName.trim(), color: editColor })
        .eq('id', editMode.group.id)
        .select().single()
      if (data) onGroupUpdated(data)
      setEditMode(null)
    }
    setLoading(false)
  }

  const handleDelete = async (e: React.MouseEvent, groupId: string) => {
    e.stopPropagation()
    if (!confirm('このグループを削除しますか？')) return
    await supabase.from(table).delete().eq('id', groupId)
    onGroupDeleted(groupId)
    setEditMode(null)
  }

  const ColorSwatches = ({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) => (
    <div className="flex flex-wrap gap-1.5">
      {CAST_COLORS.map(c => (
        <button
          key={c.key}
          type="button"
          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onSelect(c.key) }}
          className="w-5 h-5 rounded-full flex-shrink-0 cursor-pointer"
          style={{ background: c.bg, border: `2px solid ${selected === c.key ? c.text : c.border}` }}
          title={c.label}
        />
      ))}
    </div>
  )

  // 編集パネル（作成・編集共通）
  if (editMode) {
    const title = editMode.type === 'create' ? 'グループを作成' : 'グループを編集'
    return (
      <div onClick={e => e.stopPropagation()} className="px-3 py-3">
        <p className="text-xs font-medium text-[#666666] mb-2">{title}</p>
        <input
          ref={editNameRef}
          value={editName}
          onChange={e => setEditName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSave() } if (e.key === 'Escape') setEditMode(null) }}
          className="w-full px-2 py-1.5 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000] mb-3"
        />
        <p className="text-xs text-[#666666] mb-2">色</p>
        <ColorSwatches selected={editColor} onSelect={setEditColor} />
        <div className="mt-3 flex items-center gap-2">
          <span
            className="px-2 py-0.5 text-xs rounded-full font-medium"
            style={{ background: getCastColor(editColor).bg, color: getCastColor(editColor).text, border: `1px solid ${getCastColor(editColor).border}` }}
          >
            {editName || '　'}
          </span>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onMouseDown={handleSave}
            disabled={loading || !editName.trim()}
            className="px-3 py-1.5 bg-[#111111] text-white text-xs rounded-lg border-none cursor-pointer disabled:opacity-50"
          >
            {loading ? '...' : editMode.type === 'create' ? '作成' : '保存'}
          </button>
          <button
            type="button"
            onClick={() => setEditMode(null)}
            className="text-xs text-[#666666] hover:text-[#111111] bg-transparent border-none cursor-pointer"
          >
            戻る
          </button>
          {editMode.type === 'edit' && (
            <button
              type="button"
              onClick={e => handleDelete(e, editMode.group.id)}
              className="ml-auto flex items-center gap-1 text-xs text-[#999999] hover:text-[#EF4444] bg-transparent border-none cursor-pointer"
            >
              <Trash2 size={12} />削除
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div onClick={e => e.stopPropagation()}>
      <input
        ref={inputRef}
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="グループを検索または作成..."
        className="w-full px-3 py-2 text-sm border-b border-[#E5E5E5] outline-none text-[#111111] placeholder-[#999999]"
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); if (!exactMatch && query.trim()) startCreate() }
          if (e.key === 'Escape') onClose()
        }}
      />

      <div className="max-h-48 overflow-y-auto">
        {filtered.map(g => {
          const color = getCastColor(g.color)
          const selected = selectedIds.has(g.id)
          return (
            <div
              key={g.id}
              className="flex items-center gap-2 px-3 py-2 hover:bg-[#F5F5F5] cursor-pointer"
              onMouseEnter={() => setHoveredId(g.id)}
              onMouseLeave={() => setHoveredId(null)}
              onClick={() => handleToggle(g)}
            >
              <span
                className="flex-shrink-0 w-3 h-3 rounded-sm border flex items-center justify-center"
                style={selected ? { background: '#111111', borderColor: '#111111' } : { borderColor: '#999999' }}
              >
                {selected && <Check size={9} color="#fff" />}
              </span>
              <span
                className="px-2 py-0.5 text-xs rounded-full font-medium"
                style={{ background: color.bg, color: color.text, border: `1px solid ${color.border}` }}
              >
                {g.name}
              </span>
              {hoveredId === g.id && (
                <button
                  type="button"
                  onClick={e => startEdit(e, g)}
                  className="flex-shrink-0 p-0.5 text-[#999999] hover:text-[#111111] bg-transparent border-none cursor-pointer"
                >
                  <MoreHorizontal size={14} />
                </button>
              )}
            </div>
          )
        })}

        {query.trim() && !exactMatch && (
          <button
            type="button"
            onClick={startCreate}
            className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#F5F5F5] bg-transparent border-none cursor-pointer text-sm text-[#666666]"
          >
            「{query}」を作成
          </button>
        )}

        {filtered.length === 0 && !query.trim() && (
          <p className="px-3 py-3 text-xs text-[#999999]">グループがまだありません</p>
        )}
      </div>
    </div>
  )
}
