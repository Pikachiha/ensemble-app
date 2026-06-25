import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Production } from '../../types'
import DatePicker from '../../components/DatePicker'

type Props = {
  organizationId: string
  production: Production | null
  onSaved: (production: Production) => void
  onClose: () => void
}

export default function ProductionModal({ organizationId, production, onSaved, onClose }: Props) {
  const [name, setName] = useState(production?.name ?? '')
  const [performanceDate, setPerformanceDate] = useState(production?.performance_date ?? '')
  const [notes, setNotes] = useState(production?.notes ?? '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      name,
      performance_date: performanceDate || null,
      notes: notes || null,
      organization_id: organizationId,
    }

    if (production) {
      const { data, error } = await supabase
        .from('productions')
        .update(payload)
        .eq('id', production.id)
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      onSaved(data)
    } else {
      const { data, error } = await supabase
        .from('productions')
        .insert(payload)
        .select()
        .single()
      if (error) { setError(error.message); setLoading(false); return }
      onSaved(data)
    }
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-base font-semibold text-[#111111]">
            {production ? '演目を編集' : '演目を追加'}
          </h3>
          <button onClick={onClose} className="text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">作品名</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">公演日（任意）</label>
            <DatePicker value={performanceDate} onChange={setPerformanceDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">メモ（任意）</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000] resize-none"
            />
          </div>

          {error && <p className="text-sm text-[#EF4444]">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 bg-white text-[#111111] text-sm font-medium rounded-lg border border-[#E5E5E5] hover:bg-[#F5F5F5] cursor-pointer"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] disabled:opacity-50 cursor-pointer"
            >
              {loading ? '保存中...' : '保存'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
