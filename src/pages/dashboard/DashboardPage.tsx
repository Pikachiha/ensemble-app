import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Organization, Production, Schedule } from '../../types'

type Props = { organization: Organization }

type ScheduleWithProduction = Schedule & { production: Production }

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

export default function DashboardPage({ organization }: Props) {
  const navigate = useNavigate()
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [schedules, setSchedules] = useState<ScheduleWithProduction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const [{ data: prods }, { data: scheds }] = await Promise.all([
      supabase.from('productions').select('*').eq('organization_id', organization.id),
      supabase.from('schedules').select('*').order('date', { ascending: true }),
    ])
    const prodMap = Object.fromEntries((prods ?? []).map(p => [p.id, p]))
    const prodIds = new Set((prods ?? []).map(p => p.id))
    const result: ScheduleWithProduction[] = (scheds ?? [])
      .filter(s => prodIds.has(s.production_id))
      .map(s => ({ ...s, production: prodMap[s.production_id] }))
    setSchedules(result)
    setLoading(false)
  }

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
  }

  // カレンダーグリッド生成
  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const schedulesByDate: Record<string, ScheduleWithProduction[]> = {}
  for (const s of schedules) {
    schedulesByDate[s.date] = schedulesByDate[s.date] ?? []
    schedulesByDate[s.date].push(s)
  }

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const isToday = (day: number) =>
    year === today.getFullYear() && month === today.getMonth() && day === today.getDate()
  const dateStr = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  if (loading) return <div className="p-8 text-sm text-[#666666]">読み込み中...</div>

  return (
    <div className="p-8 max-w-[800px]">
      <h1 className="text-xl font-semibold text-[#111111] mb-6">ダッシュボード</h1>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-sm font-medium text-[#666666]">{organization.name}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={prevMonth}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-sm font-medium text-[#111111] w-20 text-center">
            {year}年{month + 1}月
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 text-[#666666] hover:text-[#111111] hover:bg-[#F5F5F5] rounded cursor-pointer bg-transparent border-none"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="border border-[#E5E5E5] rounded-lg overflow-hidden">
        {/* 曜日ヘッダー */}
        <div className="grid grid-cols-7 border-b border-[#E5E5E5]">
          {WEEKDAYS.map((d, i) => (
            <div
              key={d}
              className={`py-2 text-center text-xs font-medium ${
                i === 0 ? 'text-[#EF4444]' : i === 6 ? 'text-[#3B82F6]' : 'text-[#666666]'
              }`}
            >
              {d}
            </div>
          ))}
        </div>

        {/* 日付グリッド */}
        <div className="grid grid-cols-7">
          {cells.map((day, idx) => {
            const ds = day ? dateStr(day) : ''
            const daySchedules = day ? (schedulesByDate[ds] ?? []) : []
            const colIdx = idx % 7
            const isSun = colIdx === 0
            const isSat = colIdx === 6
            const isLastRow = idx >= cells.length - 7
            const isPast = day ? ds < todayStr : false

            return (
              <div
                key={idx}
                className={`min-h-[80px] p-1.5 ${!isLastRow ? 'border-b border-[#E5E5E5]' : ''} ${colIdx !== 6 ? 'border-r border-[#E5E5E5]' : ''} ${!day ? 'bg-[#FAFAFA]' : ''}`}
              >
                {day && (
                  <>
                    <div className="flex justify-end mb-1">
                      <span className={`w-6 h-6 flex items-center justify-center text-xs rounded-full ${
                        isToday(day)
                          ? 'bg-[#111111] text-white font-medium'
                          : isSun
                          ? isPast ? 'text-[#FECACA]' : 'text-[#EF4444]'
                          : isSat
                          ? isPast ? 'text-[#BFDBFE]' : 'text-[#3B82F6]'
                          : isPast
                          ? 'text-[#CCCCCC]'
                          : 'text-[#111111]'
                      }`}>
                        {day}
                      </span>
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {daySchedules.map(s => (
                        <button
                          key={s.id}
                          onClick={() => navigate(`/productions/${s.production_id}/schedules/${s.id}`)}
                          className="w-full text-left px-1.5 py-0.5 text-[10px] bg-[#111111] text-white rounded truncate cursor-pointer hover:bg-[#333333] border-none leading-4"
                          title={s.production.name}
                        >
                          {s.production.name}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
