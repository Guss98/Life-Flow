"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { CalendarEvent } from "./weekly-calendar"

interface EditEventDialogProps {
  event: CalendarEvent | null
  onUpdate: (event: CalendarEvent) => void
  onClose: () => void
}

const daysOfWeek = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
const hoursOfDay = Array.from({ length: 17 }, (_, i) => i + 7) // 7am to 10pm

export function EditEventDialog({ event, onUpdate, onClose }: EditEventDialogProps) {
  const [day, setDay] = useState<number>(0)
  const [startHour, setStartHour] = useState<number>(9)

  useEffect(() => {
    if (event) {
      setDay(event.day)
      setStartHour(event.startHour)
    }
  }, [event])

  const handleSave = () => {
    if (!event) return
    const duration = event.endHour - event.startHour
    const updatedEvent: CalendarEvent = {
      ...event,
      day: day,
      startHour: startHour,
      endHour: startHour + duration,
    }
    onUpdate(updatedEvent)
  }

  return (
    <Dialog open={!!event} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Evento: {event?.title}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="day" className="text-right">
              Día
            </Label>
            <Select value={String(day)} onValueChange={(value) => setDay(Number(value))}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona un día" />
              </SelectTrigger>
              <SelectContent>
                {daysOfWeek.map((dayName, index) => (
                  <SelectItem key={dayName} value={String(index)}>
                    {dayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="startHour" className="text-right">
              Hora de inicio
            </Label>
            <Select value={String(startHour)} onValueChange={(value) => setStartHour(Number(value))}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Selecciona una hora" />
              </SelectTrigger>
              <SelectContent>
                {hoursOfDay.map((hour) => (
                  <SelectItem key={hour} value={String(hour)}>{`${hour}:00`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Cancelar
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleSave}>
            Guardar Cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
