import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Pencil } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Attendance, Member, Production, Schedule, Scene, SceneCast } from '../../types'
import ScheduleModal from './ScheduleModal'

type MemberEntry = Member & { attendance: Attendance | null }
type ScheduleEntry = Schedule & { sceneIds: Set<string> }

const STATUS_LABELS: Record<string, string> = {
  present: '出席',
  absent: '欠席',
  late: '遅刻',
  early_leave: '早退',
  unknown: '未回答',
}

const STATUS_STYLES: Record<string, string> = {
  present: 'border-[#D1FAE5] text-[#065F46] bg-[#ECFDF5]',
  absent: 'border-[#FEE2E2] text-[#991B1B] bg-[#FEF2F2]',
  late: 'border-[#FEF3C7] text-[#92400E] bg-[#FFFBEB]',
  early_leave: 'border-[#FEF3C7] text-[#92400E] bg-[#FFFBEB]',
  unknown: 'border-[#E5E5E5] text-[#999999] bg-[#FAFAFA]',
}


export default function ScheduleDetailPage() {
  const { id: productionId, scheduleId } = useParams<{ id: string; scheduleId: string }>()
  const navigate = useNavigate()

  const [production, setProduction] = useState<Production | null>(null)
  const [schedule, setSchedule] = useState<ScheduleEntry | null>(null)
  const [scenes, setScenes] = useState<Scene[]>([])
  const [members, setMembers] = useState<MemberEntry[]>([])
  const [sceneCasts, setSceneCasts] = useState<SceneCast[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [allScenes, setAllScenes] = useState<Scene[]>([])

  useEffect(() => { fetchData() }, [scheduleId])

  async function fetchData() {
    const [
      { data: prod },
      { data: sch },
      { data: ss },
      { data: pm },
      { data: sc },
      { data: att },
      { data: scasts },
    ] = await Promise.all([
      supabase.from('productions').select('*').eq('id', productionId!).single(),
      supabase.from('schedules').select('*').eq('id', scheduleId!).single(),
      supabase.from('schedule_scenes').select('*').eq('schedule_id', scheduleId!),
      supabase.from('production_members').select('member_id').eq('production_id', productionId!),
      supabase.from('scenes').select('*').eq('production_id', productionId!).order('order_index'),
      supabase.from('attendances').select('*').eq('schedule_id', scheduleId!),
      supabase.from('scene_casts').select('*'),
    ])

    const memberIds = (pm ?? []).map(p => p.member_id)
    let memberData: Member[] = []
    if (memberIds.length > 0) {
      const { data } = await supabase.from('members').select('*').in('id', memberIds)
      memberData = data ?? []
    }

    const attMap: Record<string, Attendance> = {}
    for (const a of att ?? []) attMap[a.member_id] = a

    const sceneIdSet = new Set((ss ?? []).map(r => r.scene_id))
    const linkedScenes = (sc ?? []).filter(s => sceneIdSet.has(s.id))

    setProduction(prod)
    setSchedule(sch ? { ...sch, sceneIds: sceneIdSet } : null)
    setAllScenes(sc ?? [])
    setScenes(linkedScenes)
    setMembers(memberData.map(m => ({ ...m, attendance: attMap[m.id] ?? null })))
    setSceneCasts(scasts ?? [])
    setLoading(false)
  }

const handleScheduleSaved = (updated: Schedule, sceneIds: Set<string>) => {
    setSchedule({ ...updated, sceneIds })
    const linked = allScenes.filter(s => sceneIds.has(s.id))
    setScenes(linked)
    setModalOpen(false)
  }

  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

  if (loading) return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>
  if (!schedule || !production) return <div className="p-8 text-sm text-[#666666]">データが見つかりません</div>

  const getStatus = (member: MemberEntry) => member.attendance?.status ?? 'unknown'

  return (
    <div className="p-8 max-w-[800px]">
      {/* ヘッダー */}
      <button
        onClick={() => navigate(`/productions/${productionId}?tab=schedules`)}
        className="flex items-center gap-1.5 text-sm text-[#666666] hover:text-[#111111] bg-transparent border-none cursor-pointer p-0 mb-6"
      >
        <ArrowLeft size={15} />
        {production.name}
      </button>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-xl font-semibold text-[#111111]">{formatDate(schedule.date)}</h2>
          {schedule.location && <p className="text-sm text-[#666666] mt-1">{schedule.location}</p>}
          {schedule.notes && <p className="text-sm text-[#999999] mt-1">{schedule.notes}</p>}
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
        >
          <Pencil size={15} />
        </button>
      </div>

      {/* 出欠一覧 */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold text-[#111111] mb-3">出欠</h3>
        {members.length === 0 ? (
          <p className="text-sm text-[#999999]">キャストが登録されていません</p>
        ) : (
          <div className="flex flex-col gap-3">
            {([
              { key: 'present', label: '出席', members: members.filter(m => getStatus(m) === 'present') },
              { key: 'late_early', label: '遅刻・早退', members: members.filter(m => getStatus(m) === 'late' || getStatus(m) === 'early_leave') },
              { key: 'absent', label: '欠席', members: members.filter(m => getStatus(m) === 'absent') },
              { key: 'unknown', label: '未回答', members: members.filter(m => getStatus(m) === 'unknown') },
            ] as const).map(group => (
              <div key={group.key} className="border border-[#E5E5E5] rounded-lg overflow-hidden">
                <div className="px-5 py-2.5 bg-[#F5F5F5] border-b border-[#E5E5E5] flex items-center justify-between">
                  <span className="text-xs font-medium text-[#666666]">{group.label}</span>
                  <span className="text-xs text-[#999999]">{group.members.length} 名</span>
                </div>
                {group.members.length === 0 ? (
                  <p className="px-5 py-3 text-sm text-[#999999]">—</p>
                ) : (
                  group.members.map((member, i) => {
                    const status = getStatus(member)
                    return (
                      <div
                        key={member.id}
                        className={`flex items-center justify-between px-5 py-3 ${i !== 0 ? 'border-t border-[#E5E5E5]' : ''}`}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-[#111111]">{member.name}</span>
                            {(status === 'late' || status === 'early_leave') && (
                              <span className="text-xs text-[#92400E]">{STATUS_LABELS[status]}</span>
                            )}
                          </div>
                          {member.attendance?.notes && (
                            <p className="text-xs text-[#999999] mt-0.5">{member.attendance.notes}</p>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 練習シーン別 出欠状況 */}
      {scenes.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-[#111111] mb-3">シーン別出欠</h3>
          <div className="flex flex-col gap-3">
            {scenes.map(scene => {
              const castMemberIds = sceneCasts
                .filter(sc => sc.scene_id === scene.id)
                .map(sc => sc.member_id)
              const castMembers = members.filter(m => castMemberIds.includes(m.id))
              const absentMembers = castMembers.filter(m => getStatus(m) === 'absent')
              const lateMembers = castMembers.filter(m => getStatus(m) === 'late')
              const earlyLeaveMembers = castMembers.filter(m => getStatus(m) === 'early_leave')
              const unknownMembers = castMembers.filter(m => getStatus(m) === 'unknown')

              return (
                <div key={scene.id} className="border border-[#E5E5E5] rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-[#111111]">{scene.name}</p>
                    <span className="text-xs text-[#999999]">{castMembers.length} 名出演</span>
                  </div>
                  {castMembers.length === 0 ? (
                    <p className="text-xs text-[#999999]">出演キャストなし</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {castMembers.map(m => {
                        const s = getStatus(m)
                        return (
                          <span
                            key={m.id}
                            className={`px-2.5 py-1 text-xs rounded-full border ${STATUS_STYLES[s]}`}
                          >
                            {m.name}
                          </span>
                        )
                      })}
                    </div>
                  )}
                  {(absentMembers.length > 0 || lateMembers.length > 0 || earlyLeaveMembers.length > 0 || unknownMembers.length > 0) && (
                    <p className="text-xs text-[#999999] mt-2">
                      {[
                        absentMembers.length > 0 && `欠席 ${absentMembers.length} 名`,
                        lateMembers.length > 0 && `遅刻 ${lateMembers.length} 名`,
                        earlyLeaveMembers.length > 0 && `早退 ${earlyLeaveMembers.length} 名`,
                        unknownMembers.length > 0 && `未回答 ${unknownMembers.length} 名`,
                      ].filter(Boolean).join('・')}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {modalOpen && schedule && (
        <ScheduleModal
          productionId={productionId!}
          schedule={schedule}
          scenes={allScenes}
          initialSceneIds={schedule.sceneIds}
          onSaved={handleScheduleSaved}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}
