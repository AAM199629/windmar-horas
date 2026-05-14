import { listWeekKeys, getWeeklyReport } from '@/lib/kv'
import { getMonthDeals, getMonthLeadsByCoordinator } from '@/lib/redshift'
import type { CoordinadorRow } from '@/lib/redshift'

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

  const weekKeys = await listWeekKeys()
  const [reports, deals, coordinadores] = await Promise.all([
    Promise.all(weekKeys.map(k => getWeeklyReport(k))),
    getMonthDeals(monthStart, monthEnd).catch(() => []),
    getMonthLeadsByCoordinator(monthStart, monthEnd).catch(() => []),
  ])

  const shiftMap = new Map<string, { name: string; turnos: number; missed: number }>()

  for (let i = 0; i < weekKeys.length; i++) {
    const report = reports[i]
    if (!report) continue
    if (report.weekEnd < monthStart || report.weekStart > monthEnd) continue

    for (const emp of report.employees) {
      const email = emp.email.toLowerCase()
      for (const shift of emp.shifts) {
        if (shift.canal !== 'cambaceo') continue
        if (shift.date < monthStart || shift.date > monthEnd) continue

        if (!shiftMap.has(email)) {
          shiftMap.set(email, { name: emp.name, turnos: 0, missed: 0 })
        }
        const s = shiftMap.get(email)!
        if (shift.shiftStatus === 'Missed') {
          s.missed++
        } else {
          s.turnos++
        }
      }
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
