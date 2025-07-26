"use server"

import { generateObject } from "ai"
import { xai } from "@ai-sdk/xai"
import { z } from "zod"
import type { CalendarEvent } from "./components/weekly-calendar"

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
