import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface NominaEntry {
  name: string
  email: string
  jobTitle: string
  hireDate: string
  metHoursOverride: boolean | null  // null = use auto (horasSinACO >= 40)
  sickHours: number
  vacationHours: number
  paid: boolean
  comments: string
  terminationDate: string           // non-empty = shown in Terminados section
}

export interface NominaRecord {
  weekKey: string
  entries: NominaEntry[]
  updatedAt: string
}

const key = (weekKey: string) => `horas:nomina:${weekKey}`

export async function getNomina(weekKey: string): Promise<NominaRecord | null> {
  const raw = await redis.get<string>(key(weekKey))
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : (raw as NominaRecord)
}

export async function saveNomina(record: NominaRecord): Promise<void> {
  await redis.set(key(record.weekKey), JSON.stringify(record))
}
