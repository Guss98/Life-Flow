import { promises as fs } from 'fs'
import path from 'path'
import type { CalendarEvent } from '@/components/weekly-calendar'

const eventsFile = path.join(process.cwd(), 'data', 'events.json')

export async function readEvents(): Promise<CalendarEvent[]> {
  try {
    const data = await fs.readFile(eventsFile, 'utf8')
    return JSON.parse(data)
  } catch {
    return []
  }
}

export async function saveEvents(events: CalendarEvent[]) {
  await fs.writeFile(eventsFile, JSON.stringify(events, null, 2))
}
