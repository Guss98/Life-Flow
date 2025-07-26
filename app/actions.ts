"use server"

import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { z } from "zod"
import axios from "axios"
import type { CalendarEvent } from "./components/weekly-calendar"
import { readEvents, saveEvents } from "@/lib/events"

// Definimos el esquema que esperamos de la IA
const eventSchema = z.object({
  title: z.string().describe("El título del evento."),
  day: z.number().min(0).max(6).describe("El día de la semana (0=Domingo, 1=Lunes, etc.)."),
  startHour: z.number().min(7).max(22).describe("La hora de inicio (formato 24h)."),
  duration: z.number().min(1).max(8).describe("La duración del evento en horas. Si no se especifica, asume 1 hora."),
})

export async function processUserInput(
  text: string,
  currentSchedule: CalendarEvent[],
): Promise<{ newEvents: CalendarEvent[] }> {
  if (!process.env.XAI_API_KEY) {
    // En un entorno real, podrías devolver un evento de error
    // Por ahora, simulamos una respuesta para no bloquear el front-end
    console.error("La clave de API de XAI no está configurada.")
    return { newEvents: [] }
  }

  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Domingo, 1 = Lunes, ...

  const prompt = `
    Eres un asistente experto en organización de calendarios.
    Tu tarea es analizar la solicitud del usuario y convertirla en uno o más eventos de calendario.
    
    Información de contexto:
    - Hoy es ${today.toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}.
    - El día de la semana de hoy es ${dayOfWeek} (0=Domingo, 1=Lunes, ..., 6=Sábado).
    - Si el usuario dice "mañana", se refiere al día siguiente de hoy.
    - Si dice "pasado mañana", se refiere a dos días después de hoy.
    - Si menciona un día de la semana (ej. "el miércoles"), se refiere al próximo miércoles. Si hoy es miércoles y dice "el miércoles", se refiere al de la semana que viene.
    - Si no se especifica duración, asume 1 hora.

    Solicitud del usuario: "${text}"
    
    Basado en la solicitud, genera una lista de los nuevos eventos.
    Calcula el día de la semana y la hora de inicio correctamente.
    Devuelve solo los nuevos eventos en formato JSON.
  `

  try {
    const { object } = await generateObject({
      model: xai("grok-3"),
      schema: z.object({
        events: z.array(eventSchema),
      }),
      prompt,
    })

    // Convertimos la respuesta de la IA a nuestro tipo de evento del calendario
    const newEvents: CalendarEvent[] = object.events.map((event) => ({
      id: `ai-${event.title.replace(/\s/g, "")}-${Date.now()}`, // ID único para el evento de IA
      title: event.title,
      day: event.day,
      startHour: event.startHour,
      endHour: event.startHour + event.duration,
      color: "bg-pink-500", // Un color distintivo para eventos creados por el usuario
    }))

    return { newEvents }
  } catch (error) {
    console.error("Error al generar objeto con la IA:", error)
    return { newEvents: [] }
  }
}

// --------- Nuevas funciones con Gemini ---------
// API key guardada directamente como solicitó el usuario
const GEMINI_API_KEY = "AIzaSyCyh5_RkjurwXdJYBo79_ZZz0kAvkbn-Ic"

interface FreeSlot {
  day: number
  start: number
  end: number
}

function calculateFreeSlots(events: CalendarEvent[]): FreeSlot[] {
  const DAY_START = 7
  const DAY_END = 22
  const slots: FreeSlot[] = []

  for (let day = 0; day < 7; day++) {
    const dayEvents = events
      .filter((e) => e.day === day)
      .sort((a, b) => a.startHour - b.startHour)
    let start = DAY_START
    for (const ev of dayEvents) {
      if (ev.startHour > start) {
        slots.push({ day, start, end: ev.startHour })
      }
      start = Math.max(start, ev.endHour)
    }
    if (start < DAY_END) {
      slots.push({ day, start, end: DAY_END })
    }
  }
  return slots
}

export async function getEvents(): Promise<{ events: CalendarEvent[] }> {
  const events = await readEvents()
  return { events }
}

export async function addEventFromText(
  text: string,
): Promise<{ event: CalendarEvent | null }> {
  const events = await readEvents()
  const slots = calculateFreeSlots(events)

  const slotLines = slots
    .map(
      (s) => `- Dia ${s.day}, desde ${s.start}:00 hasta ${s.end}:00`,
    )
    .join("\n")

  const prompt = `Tengo que organizar mi semana. Mis bloques libres son:\n${slotLines}\nQuiero agendar la siguiente tarea: ${text}.\nResponde solo en JSON con el formato {"title":"tarea","day":numeroDia,"startHour":horaInicio,"endHour":horaFin}.`

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }],
      },
    ],
  }

  try {
    const res = await axios.post(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      body,
    )

    const textResp =
      res.data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    const obj = JSON.parse(textResp)
    const newEvent: CalendarEvent = {
      id: `gemini-${Date.now()}`,
      title: obj.title || text,
      day: obj.day,
      startHour: obj.startHour,
      endHour: obj.endHour,
      color: "bg-pink-500",
    }

    events.push(newEvent)
    await saveEvents(events)

    return { event: newEvent }
  } catch (err) {
    console.error("Error consultando Gemini", err)
    return { event: null }
  }
}
