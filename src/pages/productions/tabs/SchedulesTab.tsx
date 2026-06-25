import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import type { Production, Schedule, Scene } from '../../../types'
import ScheduleModal from '../../schedules/ScheduleModal'

type Props = { production: Production }

type ScheduleEntry = Schedule & { sceneIds: Set<string> }

export default function SchedulesTab({ production }: Props) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ScheduleEntry | null>(null)
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: sc }, { data: sch }, { data: ss }] = await Promise.all([
      supabase.from('scenes').select('*').eq('production_id', production.id).order('order_index'),
      supabase.from('schedules').select('*').eq('production_id', production.id).order('date', { ascending: true }),
      supabase.from('schedule_scenes').select('*'),
    ])

    const sceneMap: Record<string, Set<string>> = {}
    for (const row of ss ?? []) {
      if (!sceneMap[row.schedule_id]) sceneMap[row.schedule_id] = new Set()
      sceneMap[row.schedule_id].add(row.scene_id)
    }

    setScenes(sc ?? [])
    setSchedules((sch ?? []).map(s => ({ ...s, sceneIds: sceneMap[s.id] ?? new Set() })))
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('このスケジュールを削除しますか？')) return
    await supabase.from('schedules').delete().eq('id', id)
    setSchedules(prev => prev.filter(s => s.id !== id))
  }

  const handleSaved = (schedule: Schedule, sceneIds: Set<string>) => {
    setSchedules(prev => {
      const entry: ScheduleEntry = { ...schedule, sceneIds }
      const exists = prev.find(s => s.id === schedule.id)
      const updated = exists
        ? prev.map(s => s.id === schedule.id ? entry : s)
        : [...prev, entry]
      return updated.sort((a, b) => a.date.localeCompare(b.date))
    })
    setModalOpen(false)
    setEditing(null)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  if (loading) return <p className="text-sm text-[#666666]">読み込み中...</p>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#666666]">{schedules.length} 件</p>
        <button
          onClick={() => { setEditing(null); setModalOpen(true) }}
          className="flex items-center gap-1.5 px-3 py-2 bg-[#111111] text-white text-sm font-medium rounded-lg hover:bg-[#333333] cursor-pointer border-none"
        >
          <Plus size={15} />
          稽古日を追加
        </button>
      </div>

      {schedules.length === 0 ? (
        <div className="border border-[#E5E5E5] rounded-lg p-12 text-center">
          <p className="text-sm text-[#666666]">稽古日がまだありません</p>
        </div>
      ) : (
        <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
          {schedules.map((schedule, i) => {
            const linkedScenes = scenes.filter(s => schedule.sceneIds.has(s.id))
            return (
              <div
                key={schedule.id}
                className={`flex items-start justify-between px-5 py-3.5 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
              >
                <div>
                  <p className="text-sm font-medium text-[#111111]">{formatDate(schedule.date)}</p>
                  {schedule.location && <p className="text-xs text-[#666666] mt-0.5">{schedule.location}</p>}
                  {linkedScenes.length > 0 && (
                    <p className="text-xs text-[#999999] mt-1">
                      {linkedScenes.map(s => s.name).join('・')}
                    </p>
                  )}
                  {schedule.notes && <p className="text-xs text-[#999999] mt-0.5">{schedule.notes}</p>}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <button
                    onClick={() => navigate(`/productions/${production.id}/schedules/${schedule.id}`)}
                    className="px-3 py-1.5 text-xs font-medium text-[#111111] border border-[#E5E5E5] rounded-lg hover:bg-[#F5F5F5] bg-white cursor-pointer"
                  >
                    出欠
                  </button>
                  <button
                    onClick={() => { setEditing(schedule); setModalOpen(true) }}
                    className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(schedule.id)}
                    className="p-1.5 text-[#666666] hover:text-[#EF4444] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modalOpen && (
        <ScheduleModal
          productionId={production.id}
          schedule={editing}
          scenes={scenes}
          initialSceneIds={editing?.sceneIds ?? new Set()}
          onSaved={handleSaved}
          onClose={() => { setModalOpen(false); setEditing(null) }}
        />
      )}
    </div>
  )
}
