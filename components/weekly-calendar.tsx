"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CalendarPlus } from "lucide-react"

export interface CalendarEvent {
  id: string // ID es ahora obligatorio
  day: number
  startHour: number
  endHour: number
  title: string
  color: string
}

interface WeeklyCalendarProps {
  schedule: CalendarEvent[]
  onEventClick: (event: CalendarEvent) => void
}

const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const hoursOfDay = Array.from({ length: 17 }, (_, i) => i + 7)

const formatHour = (hour: number) => {
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 === 0 ? 12 : hour % 12
  return `${displayHour}:00 ${ampm}`
}

export function WeeklyCalendar({ schedule, onEventClick }: WeeklyCalendarProps) {
  const startHourDisplay = hoursOfDay[0]

  if (schedule.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed rounded-lg bg-gray-50 text-center p-4">
        <CalendarPlus className="h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700">Tu calendario está vacío</h3>
        <p className="text-gray-500">Usa el panel de la izquierda para generar tu horario.</p>
      </div>
    )
  }

  const eventsByDay = schedule.reduce(
    (acc, event) => {
      ;(acc[event.day] = acc[event.day] || []).push(event)
      acc[event.day].sort((a, b) => a.startHour - b.startHour)
      return acc
    },
    {} as Record<number, CalendarEvent[]>,
  )

  return (
    <>
      {/* Vista Mobile */}
      <div className="md:hidden space-y-4">
        {daysOfWeek.map((dayName, dayIndex) => {
          const dailyEvents = eventsByDay[dayIndex]
          if (!dailyEvents || dailyEvents.length === 0) return null
          return (
            <Card key={`mobile-${dayIndex}`}>
              <CardHeader>
                <CardTitle>{dayName}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dailyEvents.map((event) => (
                  <div
                    key={event.id}
                    onClick={() => onEventClick(event)}
                    className={`p-3 rounded-lg text-white cursor-pointer ${event.color}`}
                  >
                    <p className="font-bold">{event.title}</p>
                    <p className="text-sm opacity-90">
                      {formatHour(event.startHour)} - {formatHour(event.endHour)}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Vista Desktop */}
      <div className="hidden md:block border rounded-lg overflow-hidden bg-white shadow-lg">
        <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50 sticky top-0 z-10">
          <div className="h-12" />
          {daysOfWeek.map((day) => (
            <div key={day} className="text-center py-3 font-semibold text-sm text-gray-600 border-l">
              {day}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-[60px_repeat(7,1fr)] relative">
          <div className="col-span-1 border-r bg-gray-50">
            {hoursOfDay.map((hour) => (
              <div key={`time-${hour}`} className="h-[60px] relative">
                <span className="absolute -top-2 right-2 text-xs text-gray-500">{formatHour(hour)}</span>
              </div>
            ))}
          </div>
          <div className="col-span-7 grid grid-cols-7 relative">
            {hoursOfDay.map((_, hourIndex) => (
              <div key={`hline-${hourIndex}`} className="col-span-7 border-t h-[60px]" />
            ))}
            {Array.from({ length: 6 }).map((_, dayIndex) => (
              <div
                key={`vline-${dayIndex}`}
                className="absolute inset-y-0 border-l"
                style={{ left: `${(dayIndex + 1) * (100 / 7)}%` }}
              />
            ))}
            {schedule.map((event) => {
              const duration = event.endHour - event.startHour
              const top = (event.startHour - startHourDisplay) * 60
              const height = duration * 60 - 4
              const left = `${event.day * (100 / 7)}%`
              const width = `calc(${100 / 7}% - 8px)`
              return (
                <div
                  key={event.id}
                  onClick={() => onEventClick(event)}
                  className={`absolute rounded-lg p-2 text-white text-xs overflow-hidden shadow-md transition-all duration-300 cursor-pointer hover:ring-2 hover:ring-offset-2 ${event.color}`}
                  style={{ top: `${top + 2}px`, height: `${height}px`, left, marginLeft: "4px", width }}
                >
                  <div className="font-bold">{event.title}</div>
                  <div className="text-white/80">
                    {formatHour(event.startHour).replace(":00 ", "")} - {formatHour(event.endHour).replace(":00 ", "")}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
