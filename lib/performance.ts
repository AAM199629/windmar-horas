import { getShifterShiftRows } from '@/lib/shifter-api'
import { getMonthDeals, getMonthLeadsByCoordinator } from '@/lib/redshift'
import type { CoordinadorRow } from '@/lib/redshift'
import type { ShiftRow } from '@/lib/types'

export type { CoordinadorRow }

export interface VendedorPerformanceRow {
  email: string
  name: string
  turnos: number
  missed: number
  ventasCanal: number
  totalVentas: number
}

export async function computeCambaceoPerformance(month: string): Promise<{
  vendedores: VendedorPerformanceRow[]
  coordinadores: CoordinadorRow[]
}> {
  const [year, mm] = month.split('-')
  const lastDayNum = new Date(Number(year), Number(mm), 0).getDate()
  const monthStart = `${year}-${mm}-01`
  const monthEnd   = `${year}-${mm}-${String(lastDayNum).padStart(2, '0')}`

  const [shiftRows, deals, coordinadores] = await Promise.all([
    getShifterShiftRows(monthStart, monthEnd).catch(() => [] as ShiftRow[]),
    getMonthDeals(monthStart, monthEnd).catch(() => []),
    getMonthLeadsByCoordinator(monthStart, monthEnd).catch(() => []),
  ])

  const shiftMap = new Map<string, { name: string; turnos: number; missed: number }>()

  for (const shift of shiftRows) {
    if (shift.canal !== 'cambaceo') continue
    if (shift.date < monthStart || shift.date > monthEnd) continue
    const email = shift.email.toLowerCase()
    if (!email) continue

    if (!shiftMap.has(email)) {
      shiftMap.set(email, { name: shift.name, turnos: 0, missed: 0 })
    }
    const s = shiftMap.get(email)!
    if (shift.shiftStatus === 'Missed') {
      s.missed++
    } else {
      s.turnos++
    }
  }

  const dealMap = new Map<string, { ventasCanal: number; totalVentas: number }>()
  for (const d of deals) {
    dealMap.set(d.email, {
      ventasCanal: d.ventasCanvassing,
      totalVentas: d.totalVentas,
    })
  }

  const vendedores: VendedorPerformanceRow[] = []
  for (const [email, s] of shiftMap) {
    const d = dealMap.get(email)
    vendedores.push({
      email,
      name:        s.name,
      turnos:      s.turnos,
      missed:      s.missed,
      ventasCanal: d?.ventasCanal ?? 0,
      totalVentas: d?.totalVentas ?? 0,
    })
  }

  vendedores.sort((a, b) => b.ventasCanal - a.ventasCanal || b.turnos - a.turnos)

  return { vendedores, coordinadores }
}
