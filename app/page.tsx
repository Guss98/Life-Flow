"use client"

import { useState, useEffect, useRef } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { WeeklyCalendar, type CalendarEvent } from "@/components/weekly-calendar"
import { PreferenceSelector } from "@/components/preference-selector"
import { EditEventDialog } from "@/components/edit-event-dialog"
import { Mic, Send, Shuffle } from "lucide-react"
import { schedulesData } from "@/data/schedules"
import type SpeechRecognition from "speech-recognition"

type GymPreference = "mañana" | "tarde"
type LunchPreference = "temprano" | "tarde"
type StudyPreference = "despues_trabajo" | "noche"

const dayNameToIndex: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
}
const parseTime = (time: string): number => Number.parseInt(time.split(":")[0], 10)

export default function Home() {
  const [gymPreference, setGymPreference] = useState<GymPreference>("tarde")
  const [lunchPreference, setLunchPreference] = useState<LunchPreference>("temprano")
  const [studyPreference, setStudyPreference] = useState<StudyPreference>("despues_trabajo")
  const [schedule, setSchedule] = useState<CalendarEvent[]>([])
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null)
  const [inputText, setInputText] = useState("")
  const [isListening, setIsListening] = useState(false)
  const [isSpeechSupported, setIsSpeechSupported] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const [currentProfileName, setCurrentProfileName] = useState<string>("")
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { getEvents } = await import("./actions")
      const { events } = await getEvents()
      setSchedule(events)
    }
    load()
  }, [])

  useEffect(() => {
    if (schedule.length === 0) return
    setSchedule((prevSchedule) => {
      const newGymStartTime = gymPreference === "mañana" ? 7 : 18
      return prevSchedule.map((event) =>
        event.title === "Actividad Física"
          ? { ...event, startHour: newGymStartTime, endHour: newGymStartTime + 2 }
          : event,
      )
    })
  }, [gymPreference])

  useEffect(() => {
    if (schedule.length === 0) return
    setSchedule((prevSchedule) => {
      const newLunchStartTime = lunchPreference === "temprano" ? 12 : 14
      return prevSchedule.map((event) =>
        event.title === "Almuerzo" ? { ...event, startHour: newLunchStartTime, endHour: newLunchStartTime + 1 } : event,
      )
    })
  }, [lunchPreference])

  useEffect(() => {
    if (schedule.length === 0) return
    setSchedule((prevSchedule) => {
      const newStudyStartTime = studyPreference === "despues_trabajo" ? 17 : 21
      return prevSchedule.map((event) =>
        event.title === "Estudio/Lectura"
          ? { ...event, startHour: newStudyStartTime, endHour: newStudyStartTime + 1 }
          : event,
      )
    })
  }, [studyPreference])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (SpeechRecognition) {
      setIsSpeechSupported(true)
      recognitionRef.current = new SpeechRecognition()
      const recognition = recognitionRef.current
      recognition.continuous = true
      recognition.lang = "es-ES"
      recognition.interimResults = true
      recognition.onresult = (event) => {
        let finalTranscript = ""
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) finalTranscript += event.results[i][0].transcript
        }
        if (finalTranscript) setInputText((prev) => prev + finalTranscript + " ")
      }
      recognition.onend = () => setIsListening(false)
    }
  }, [])

  const handleToggleListening = () => {
    if (!recognitionRef.current) return
    if (isListening) recognitionRef.current.stop()
    else recognitionRef.current.start()
    setIsListening(!isListening)
  }

  const handleProcessInput = async () => {
    if (!inputText.trim()) return
    setIsProcessing(true)
    try {
      const { addEventFromText } = await import("./actions")
      const { event } = await addEventFromText(inputText)
      if (event) {
        setSchedule((prev) => [...prev, event])
      }
      setInputText("")
    } catch (error) {
      console.error("Error procesando la entrada:", error)
      // Aquí podrías mostrar una notificación de error al usuario
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateSchedule = () => {
    const randomIndex = Math.floor(Math.random() * schedulesData.length)
    const profile = schedulesData[randomIndex]
    const newSchedule: CalendarEvent[] = []

    // 1. Añadir eventos fijos del perfil
    profile.semana.eventosFijos.forEach((event, index) => {
      newSchedule.push({
        id: `fijo-${profile.idTrabajador}-${index}`,
        title: event.descripcion,
        day: dayNameToIndex[event.dia.toLowerCase()],
        startHour: parseTime(event.horaInicio),
        endHour: parseTime(event.horaFin),
        color: "bg-blue-600",
      })
    })

    // 2. Procesar eventos flexibles del perfil, vinculándolos a las preferencias
    const physicalActivityKeywords = ["actividad física", "yoga", "correr", "gimnasio", "spinning"]
    const lunchKeywords = ["almuerzo"]
    const studyKeywords = ["estudio", "curso", "lectura"]

    profile.semana.eventosFlexibles.forEach((event, index) => {
      const desc = event.descripcion.toLowerCase()
      let isControlled = false

      if (physicalActivityKeywords.some((keyword) => desc.includes(keyword))) {
        const startTime = gymPreference === "mañana" ? 7 : 18
        newSchedule.push({
          id: `controlled-gym-${profile.idTrabajador}-${index}`,
          title: "Actividad Física",
          day: dayNameToIndex[event.dia.toLowerCase()],
          startHour: startTime,
          endHour: startTime + 2,
          color: "bg-green-600",
        })
        isControlled = true
      } else if (lunchKeywords.some((keyword) => desc.includes(keyword))) {
        const startTime = lunchPreference === "temprano" ? 12 : 14
        newSchedule.push({
          id: `controlled-lunch-${profile.idTrabajador}-${index}`,
          title: "Almuerzo",
          day: dayNameToIndex[event.dia.toLowerCase()],
          startHour: startTime,
          endHour: startTime + 1,
          color: "bg-orange-500",
        })
        isControlled = true
      } else if (studyKeywords.some((keyword) => desc.includes(keyword))) {
        const startTime = studyPreference === "despues_trabajo" ? 17 : 21
        newSchedule.push({
          id: `controlled-study-${profile.idTrabajador}-${index}`,
          title: "Estudio/Lectura",
          day: dayNameToIndex[event.dia.toLowerCase()],
          startHour: startTime,
          endHour: startTime + 1,
          color: "bg-purple-600",
        })
        isControlled = true
      }

      if (!isControlled) {
        newSchedule.push({
          id: `flexible-otro-${profile.idTrabajador}-${index}`,
          title: event.descripcion,
          day: dayNameToIndex[event.dia.toLowerCase()],
          startHour: 20,
          endHour: 21,
          color: "bg-teal-500",
        })
      }
    })

    setSchedule(newSchedule)
    setCurrentProfileName(`Perfil: ${profile.nombreTrabajador} (${profile.rol})`)
    setInputText("")
  }

  const handleUpdateEvent = (updatedEvent: CalendarEvent) => {
    setSchedule((prevSchedule) => prevSchedule.map((event) => (event.id === updatedEvent.id ? updatedEvent : event)))
    setEditingEvent(null)
  }

  return (
    <div className="flex flex-col items-center p-4 md:p-8 min-h-screen bg-gray-50">
      <div className="w-full max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2 text-gray-800">Tu Organizador Semanal</h1>
          <p className="text-gray-600">Dime qué planificar o ajusta tus preferencias para empezar.</p>
          {currentProfileName && <p className="text-sm font-semibold text-indigo-600 mt-2">{currentProfileName}</p>}
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-4 rounded-lg border">
              <h2 className="font-semibold mb-3">Añade o genera tu plan</h2>
              <div className="relative flex items-center">
                <Input
                  placeholder={isListening ? "Escuchando..." : "Añade un evento (ej: 'Reunión mañana 15h')"}
                  className={`w-full p-2 pr-20 border-gray-300 ${isListening ? "border-red-500" : ""}`}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleProcessInput()}
                  disabled={isProcessing}
                />
                <div className="absolute right-1 flex items-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleToggleListening}
                    disabled={!isSpeechSupported || isProcessing}
                    className={isListening ? "text-red-500" : "text-gray-500"}
                  >
                    <Mic className="h-5 w-5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleProcessInput}
                    disabled={isProcessing}
                    className="text-gray-500"
                  >
                    {isProcessing ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg border">
              <h2 className="font-semibold mb-3">Generar un nuevo perfil</h2>
              <Button onClick={handleGenerateSchedule} className="w-full">
                <Shuffle className="mr-2 h-4 w-4" />
                Generar Horario Aleatorio
              </Button>
            </div>
            <PreferenceSelector
              question="Actividad Física"
              options={[
                { value: "mañana", label: "Mañana" },
                { value: "tarde", label: "Tarde" },
              ]}
              selectedValue={gymPreference}
              onValueChange={(v) => setGymPreference(v as GymPreference)}
            />
            <PreferenceSelector
              question="Almuerzo"
              options={[
                { value: "temprano", label: "Temprano" },
                { value: "tarde", label: "Tarde" },
              ]}
              selectedValue={lunchPreference}
              onValueChange={(v) => setLunchPreference(v as LunchPreference)}
            />
            <PreferenceSelector
              question="Estudio/Lectura"
              options={[
                { value: "despues_trabajo", label: "Post-trabajo" },
                { value: "noche", label: "Noche" },
              ]}
              selectedValue={studyPreference}
              onValueChange={(v) => setStudyPreference(v as StudyPreference)}
            />
          </div>

          <div className="lg:col-span-2">
            <WeeklyCalendar schedule={schedule} onEventClick={setEditingEvent} />
          </div>
        </div>
      </div>
      <EditEventDialog event={editingEvent} onUpdate={handleUpdateEvent} onClose={() => setEditingEvent(null)} />
    </div>
  )
}
