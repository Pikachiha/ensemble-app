import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, X } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Prop, Production } from '../../../types'
import { TAG_COLORS, getTagColor } from '../../../constants/tagColors'

type Props = { production: Production }

const SHAPES = [
  { value: 'rect', label: '四角' },
  { value: 'circle', label: '丸' },
  { value: 'triangle', label: '三角' },
]

function PropShape({ shape, colorKey }: { shape: string; colorKey: string }) {
  const tc = getTagColor(colorKey)
  if (shape === 'circle') return (
    <div className="w-6 h-6 rounded-full flex-shrink-0 border"
      style={{ background: tc.border, borderColor: tc.mid }} />
  )
  if (shape === 'triangle') return (
    <svg width={24} height={22} viewBox="0 0 24 22" className="flex-shrink-0">
      <polygon points="12,1 1,21 23,21" fill={tc.border} stroke={tc.mid} strokeWidth={1} />
    </svg>
  )
  return <div className="w-7 h-4 rounded-sm flex-shrink-0 border" style={{ background: tc.border, borderColor: tc.mid }} />
}

export default function PropsTab({ production }: Props) {
  const [props, setProps] = useState<Prop[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Prop | null>(null)
  const [name, setName] = useState('')
  const [shape, setShape] = useState<'rect' | 'circle' | 'triangle'>('rect')
  const [color, setColor] = useState('gray')
  const [defaultWidth, setDefaultWidth] = useState('60')
  const [defaultHeight, setDefaultHeight] = useState('40')
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchProps() }, [])

  async function fetchProps() {
    const { data } = await supabase.from('props').select('*').eq('production_id', production.id).order('created_at')
    setProps(data ?? [])
    setLoading(false)
  }

  const openAdd = () => {
    setEditing(null)
    setName(''); setShape('rect'); setColor('gray'); setDefaultWidth('90'); setDefaultHeight('45')
    setModalOpen(true)
  }

  const openEdit = (prop: Prop) => {
    setEditing(prop)
    setName(prop.name); setShape(prop.shape); setColor(prop.color)
    setDefaultWidth(String(prop.default_width)); setDefaultHeight(String(prop.default_height))
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!name.trim()) return
    setSaving(true)
    const payload = {
      name: name.trim(), shape, color,
      default_width: parseInt(defaultWidth) || 60,
      default_height: parseInt(defaultHeight) || 40,
      production_id: production.id,
    }
    if (editing) {
      await supabase.from('props').update(payload).eq('id', editing.id)
      setProps(prev => prev.map(p => p.id === editing.id ? { ...p, ...payload } : p))
    } else {
      const { data } = await supabase.from('props').insert(payload).select().maybeSingle()
      if (data) setProps(prev => [...prev, data])
    }
    setSaving(false)
    setModalOpen(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('この小道具を削除しますか？')) return
    await supabase.from('props').delete().eq('id', id)
    setProps(prev => prev.filter(p => p.id !== id))
  }

  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#666666]">{props.length} 件</p>
        <button onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer border-none">
          <Plus size={15} />小道具を追加
        </button>
      </div>

      {props.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">小道具がまだありません</p>
          <button onClick={openAdd} className="mt-3 text-sm text-[#111111] underline cursor-pointer bg-transparent border-none">
            最初の小道具を追加する
          </button>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {props.map((prop, i) => (
            <div key={prop.id} className={`flex items-center gap-3 px-5 py-3.5 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}>
              <PropShape shape={prop.shape} colorKey={prop.color} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#111111]">{prop.name}</p>
                <p className="text-xs text-[#999999]">
                  {SHAPES.find(s => s.value === prop.shape)?.label} · {prop.default_width}×{prop.default_height}cm
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => openEdit(prop)}
                  className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none">
                  <Pencil size={14} />
                </button>
                <button onClick={() => handleDelete(prop.id)}
                  className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
          <button onClick={openAdd}
            className="flex items-center gap-1.5 w-full px-5 py-3 border-t border-[#E5E5E5] text-sm text-[#999999] hover:text-[#111111] hover:bg-[#F5F5F5] bg-transparent cursor-pointer">
            <Plus size={14} />小道具を追加
          </button>
        </div>
      )}

      {modalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
              <h3 className="text-base font-semibold text-[#111111]">{editing ? '小道具を編集' : '小道具を追加'}</h3>
              <button onClick={() => setModalOpen(false)} className="text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">名前</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} autoFocus
                  className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">形</label>
                <div className="flex gap-2">
                  {SHAPES.map(s => (
                    <button key={s.value} onClick={() => setShape(s.value as typeof shape)}
                      className={`flex-1 py-2 text-sm rounded-lg border cursor-pointer transition-colors ${shape === s.value ? 'bg-[#111111] text-white border-[#111111]' : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#999999]'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111111] mb-1.5">色</label>
                <div className="flex gap-2 flex-wrap">
                  {TAG_COLORS.map(tc => (
                    <button key={tc.key} onClick={() => setColor(tc.key)}
                      className={`w-7 h-7 rounded-full cursor-pointer border-2 transition-all ${color === tc.key ? 'border-[#111111] scale-110' : 'border-transparent hover:border-[#999999]'}`}
                      style={{ background: tc.border }} />
                  ))}
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">幅（cm）</label>
                  <input type="number" value={defaultWidth} onChange={e => setDefaultWidth(e.target.value)} min={1}
                    className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-[#111111] mb-1.5">奥行（cm）</label>
                  <input type="number" value={defaultHeight} onChange={e => setDefaultHeight(e.target.value)} min={1}
                    className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000]" />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button onClick={() => setModalOpen(false)}
                  className="flex-1 py-2.5 text-sm border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] cursor-pointer bg-white text-[#111111]">
                  キャンセル
                </button>
                <button onClick={handleSave} disabled={saving || !name.trim()}
                  className="flex-1 py-2.5 text-sm bg-[#111111] text-white rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
