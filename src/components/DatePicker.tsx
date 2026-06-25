import { useState, useRef, useEffect } from 'react'
import { DayPicker } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarDays, X } from 'lucide-react'
import * as HolidayJp from '@holiday-jp/holiday_jp'
import 'react-day-picker/style.css'

type Props = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

function isSaturday(date: Date) { return date.getDay() === 6 }
function isSunday(date: Date) { return date.getDay() === 0 }
function isHoliday(date: Date) { return HolidayJp.isHoliday(date) }

function DayContent({ date }: { date: Date }) {
  const sat = isSaturday(date)
  const sun = isSunday(date)
  const holiday = isHoliday(date)
  const color = (sun || holiday) ? '#EF4444' : sat ? '#3B82F6' : undefined
  return <span style={color ? { color } : undefined}>{date.getDate()}</span>
}

export default function DatePicker({ value, onChange, placeholder = '日付を選択' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const selected = value ? parseISO(value) : undefined

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSelect = (date: Date | undefined) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '')
    setOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-[#E5E5E5] rounded-lg bg-white hover:border-[#999999] cursor-pointer"
      >
        <span className={selected ? 'text-[#111111]' : 'text-[#999999]'}>
          {selected ? format(selected, 'yyyy年M月d日', { locale: ja }) : placeholder}
        </span>
        <div className="flex items-center gap-1">
          {selected && (
            <span onClick={handleClear} className="text-[#999999] hover:text-[#111111]">
              <X size={14} />
            </span>
          )}
          <CalendarDays size={15} className="text-[#666666]" />
        </div>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 bg-white border border-[#E5E5E5] rounded-xl shadow-lg">
          <DayPicker
            mode="single"
            selected={selected}
            onSelect={handleSelect}
            defaultMonth={selected}
            locale={ja}
            components={{
              DayButton: ({ day, ...props }) => (
                <button {...props}>
                  <DayContent date={day.date} />
                </button>
              ),
            }}
            styles={{
              root: { margin: 0, padding: '12px' },
            }}
            classNames={{
              today: 'font-semibold',
              selected: '!bg-[#DBEAFE] rounded-lg [&>span]:!text-[#1E40AF]',
              day_button: 'rounded-lg hover:bg-[#F5F5F5] cursor-pointer w-9 h-9 text-sm',
              chevron: 'fill-[#111111]',
            }}
          />
        </div>
      )}
    </div>
  )
}
