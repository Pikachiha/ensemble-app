import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import type { Attendance, Member, Organization, Production, Schedule } from '../../types'

type Props = { member: Member }

type ScheduleEntry = Schedule & {
  production: Production
  attendance: Attendance | null
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'early_leave' | 'unknown'

const STATUS_LABELS: Record<AttendanceStatus, string> = {
  present: '出席',
  absent: '欠席',
  late: '遅刻',
  early_leave: '早退',
  unknown: '未回答',
}

const STATUS_STYLES: Record<AttendanceStatus, string> = {
  present: 'bg-[#111111] text-white border-[#111111]',
  absent: 'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA]',
  late: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  early_leave: 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]',
  unknown: 'bg-white text-[#999999] border-[#E5E5E5]',
}

const ALL_STATUSES: AttendanceStatus[] = ['present', 'absent', 'late', 'early_leave', 'unknown']

export default function MemberPage({ member }: Props) {
  const [schedules, setSchedules] = useState<ScheduleEntry[]>([])
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingNotes, setEditingNotes] = useState<string | null>(null)
  const [notesInput, setNotesInput] = useState('')
  const navigate = useNavigate()

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: prods }, { data: scheds }, { data: atts }, { data: org }] = await Promise.all([
      supabase.from('productions').select('*'),
      supabase.from('schedules').select('*').order('date', { ascending: true }),
      supabase.from('attendances').select('*').eq('member_id', member.id),
      supabase.from('organizations').select('*').eq('id', member.organization_id).single(),
    ])
    setOrganization(org)

    const prodMap = Object.fromEntries((prods ?? []).map(p => [p.id, p]))
    const attMap = Object.fromEntries((atts ?? []).map(a => [a.schedule_id, a]))

    const today = new Date().toISOString().split('T')[0]
    const entries: ScheduleEntry[] = (scheds ?? [])
      .filter(s => s.date >= today && prodMap[s.production_id])
      .map(s => ({
        ...s,
        production: prodMap[s.production_id],
        attendance: attMap[s.id] ?? null,
      }))

    setSchedules(entries)
    setLoading(false)
  }

  const setAttendance = async (entry: ScheduleEntry, status: AttendanceStatus) => {
    if (entry.attendance) {
      const { data } = await supabase
        .from('attendances').update({ status }).eq('id', entry.attendance.id).select().single()
      if (data) setSchedules(prev => prev.map(s => s.id === entry.id ? { ...s, attendance: data } : s))
    } else {
      const { data } = await supabase
        .from('attendances').insert({ schedule_id: entry.id, member_id: member.id, status }).select().single()
      if (data) setSchedules(prev => prev.map(s => s.id === entry.id ? { ...s, attendance: data } : s))
    }
  }

  const saveNotes = async (entry: ScheduleEntry) => {
    const notes = notesInput.trim() || null
    if (entry.attendance) {
      const { data } = await supabase
        .from('attendances').update({ notes }).eq('id', entry.attendance.id).select().single()
      if (data) setSchedules(prev => prev.map(s => s.id === entry.id ? { ...s, attendance: data } : s))
    } else {
      const { data } = await supabase
        .from('attendances').insert({ schedule_id: entry.id, member_id: member.id, status: 'unknown', notes }).select().single()
      if (data) setSchedules(prev => prev.map(s => s.id === entry.id ? { ...s, attendance: data } : s))
    }
    setEditingNotes(null)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/')
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric', weekday: 'short' })

  if (loading) return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <header className="bg-white border-b border-[#E5E5E5] px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-[#999999]">Ensemble</p>
          <p className="text-sm font-semibold text-[#111111]">{organization?.name ?? ''}</p>
        </div>
        <div className="flex items-center gap-4">
          <p className="text-sm text-[#666666]">{member.name}</p>
          <button
            onClick={handleLogout}
            className="text-xs text-[#999999] hover:text-[#111111] bg-transparent border-none cursor-pointer"
          >
            ログアウト
          </button>
        </div>
      </header>

      <div className="max-w-[600px] mx-auto px-4 py-6">
        <h1 className="text-base font-semibold text-[#111111] mb-4">スケジュール</h1>

        {schedules.length === 0 ? (
          <div className="border border-[#E5E5E5] rounded-lg p-12 text-center bg-white">
            <p className="text-sm text-[#666666]">今後の稽古日はありません</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {schedules.map(entry => {
              const status = (entry.attendance?.status ?? 'unknown') as AttendanceStatus
              const isEditingThis = editingNotes === entry.id
              return (
                <div key={entry.id} className="bg-white border border-[#E5E5E5] rounded-lg px-5 py-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="text-xs text-[#999999] mb-0.5">{entry.production.name}</p>
                      <p className="text-sm font-medium text-[#111111]">{formatDate(entry.date)}</p>
                      {entry.location && <p className="text-xs text-[#666666] mt-0.5">{entry.location}</p>}
                    </div>
                    <span className={`px-2.5 py-1 text-xs rounded-full border ${STATUS_STYLES[status]}`}>
                      {STATUS_LABELS[status]}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {ALL_STATUSES.map(s => (
                      <button
                        key={s}
                        onClick={() => setAttendance(entry, s)}
                        className={`px-3 py-1.5 text-xs rounded-lg border cursor-pointer transition-colors ${
                          status === s ? STATUS_STYLES[s] : 'bg-white text-[#666666] border-[#E5E5E5] hover:border-[#999999]'
                        }`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  {isEditingThis ? (
                    <div className="flex flex-col gap-2">
                      <textarea
                        value={notesInput}
                        onChange={e => setNotesInput(e.target.value)}
                        placeholder="備考を入力（例：15分遅れます）"
                        rows={2}
                        autoFocus
                        className="w-full px-3 py-2 text-xs border border-[#E5E5E5] rounded-lg outline-none focus:border-[#000000] resize-none text-[#111111] placeholder-[#999999]"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setEditingNotes(null)}
                          className="flex-1 py-1.5 text-xs border border-[#E5E5E5] rounded-lg bg-white text-[#666666] hover:bg-[#F5F5F5] cursor-pointer"
                        >
                          キャンセル
                        </button>
                        <button
                          onClick={() => saveNotes(entry)}
                          className="flex-1 py-1.5 text-xs bg-[#111111] text-white rounded-lg hover:bg-[#333333] cursor-pointer"
                        >
                          保存
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setEditingNotes(entry.id); setNotesInput(entry.attendance?.notes ?? '') }}
                      className="text-xs text-[#999999] hover:text-[#111111] bg-transparent border-none cursor-pointer p-0"
                    >
                      {entry.attendance?.notes ? `備考: ${entry.attendance.notes}` : '+ 備考を追加'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
