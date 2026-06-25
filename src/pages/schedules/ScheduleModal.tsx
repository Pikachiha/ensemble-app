import { useState } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Schedule, Scene } from '../../types'
import DatePicker from '../../components/DatePicker'

type Props = {
  productionId: string
  schedule: Schedule | null
  scenes: Scene[]
  initialSceneIds: Set<string>
  onSaved: (schedule: Schedule, sceneIds: Set<string>) => void
  onClose: () => void
}

export default function ScheduleModal({ productionId, schedule, scenes, initialSceneIds, onSaved, onClose }: Props) {
  const [date, setDate] = useState(schedule?.date ?? '')
  const [location, setLocation] = useState(schedule?.location ?? '')
  const [notes, setNotes] = useState(schedule?.notes ?? '')
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<string>>(new Set(initialSceneIds))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleScene = (sceneId: string) => {
    setSelectedSceneIds(prev => {
      const s = new Set(prev)
      s.has(sceneId) ? s.delete(sceneId) : s.add(sceneId)
      return s
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const payload = {
      date,
      location: location || null,
      notes: notes || null,
      production_id: productionId,
    }

    let savedSchedule: Schedule | null = null

    if (schedule) {
      const { data, error } = await supabase
        .from('schedules').update(payload).eq('id', schedule.id).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      savedSchedule = data

      // シーン紐付けの差分同期
      const toAdd = [...selectedSceneIds].filter(id => !initialSceneIds.has(id))
      const toRemove = [...initialSceneIds].filter(id => !selectedSceneIds.has(id))
      if (toAdd.length > 0) {
        await supabase.from('schedule_scenes').insert(
          toAdd.map(sid => ({ schedule_id: schedule.id, scene_id: sid }))
        )
      }
      for (const sid of toRemove) {
        await supabase.from('schedule_scenes')
          .delete().eq('schedule_id', schedule.id).eq('scene_id', sid)
      }
    } else {
      const { data, error } = await supabase
        .from('schedules').insert(payload).select().single()
      if (error) { setError(error.message); setLoading(false); return }
      savedSchedule = data

      if (selectedSceneIds.size > 0) {
        await supabase.from('schedule_scenes').insert(
          [...selectedSceneIds].map(sid => ({ schedule_id: savedSchedule!.id, scene_id: sid }))
        )
      }
    }

    setLoading(false)
    onSaved(savedSchedule!, selectedSceneIds)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5E5]">
          <h3 className="text-base font-semibold text-[#111111]">
            {schedule ? '稽古日を編集' : '稽古日を追加'}
          </h3>
          <button onClick={onClose} className="text-[#666666] hover:text-[#111111] cursor-pointer bg-transparent border-none">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 120px)' }}>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">日付</label>
            <DatePicker value={date} onChange={setDate} />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#111111] mb-1.5">場所（任意）</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="例：〇〇公民館"
              className="w-full px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg text-[#111111] placeholder-[#999999] outline-none focus:border-[#000000]"
            />
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

          {scenes.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-[#111111] mb-1.5">練習シーン（任意）</label>
              <div className="border border-[#E5E5E5] rounded-lg overflow-y-auto" style={{ maxHeight: '200px' }}>
                {scenes.map((scene, i) => (
                  <label
                    key={scene.id}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-[#F5F5F5] ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
                  >
                    <span
                      className="flex-shrink-0 w-4 h-4 rounded border flex items-center justify-center"
                      style={selectedSceneIds.has(scene.id)
                        ? { background: '#111111', borderColor: '#111111' }
                        : { borderColor: '#CCCCCC' }
                      }
                    >
                      {selectedSceneIds.has(scene.id) && (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={selectedSceneIds.has(scene.id)}
                      onChange={() => toggleScene(scene.id)}
                    />
                    <span className="text-sm text-[#111111]">{scene.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

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
              disabled={loading || !date}
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
