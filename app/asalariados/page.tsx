import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getAllComunicados } from '@/lib/asalariados-kv'
import { getVendedores } from '@/lib/smartsheet'
import { getActiveAsalariados, getVentasFromRedshift, getFollowUpFromRedshift } from '@/lib/redshift'
import {
  isActiveSupervisor,
  calcMonthMetrics, getRecentMonths,
  calcConsecutiveMisses, pendingComunicado, monthsAsAsalariado,
} from '@/lib/ventas'
import AsalariadosClient from './AsalariadosClient'
import type { ComunicadoRecord } from '@/lib/asalariados-kv'
import type { MonthMetrics } from '@/lib/ventas'

export const dynamic = 'force-dynamic'

export interface AsalariadoData {
  nombre: string
  email: string | null
  salesRole: string
  supervisorRegional: string | null
  ciudad: string | null
  hireDate: string | null
  months: MonthMetrics[]
  consecutive: number
  pendingStatus: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  redshiftStatus: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  memo1Date: string | null
  memo2Date: string | null
  terminacionDate: string | null
  approved: ComunicadoRecord | null
  leads: number | null
  citas: number | null
  orientaciones: number | null
  monthsAsAsalariado: number | null
}

function memoLevelToStatus(level: number | null): AsalariadoData['redshiftStatus'] {
  if (!level || level <= 0) return 'none'
  if (level >= 3) return 'terminacion'
  if (level >= 2) return 'comunicado2'
  return 'comunicado1'
}

export default async function AsalariadosPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || (role !== 'admin' && role !== 'supervisor')) redirect('/')

  const [ventasRows, comunicados, vendedores, activeAsalariados, followUpMap] = await Promise.all([
    getVentasFromRedshift().catch(() => []),
    getAllComunicados(),
    getVendedores(),
    getActiveAsalariados().catch(() => [] as Awaited<ReturnType<typeof getActiveAsalariados>>),
    getFollowUpFromRedshift().catch(() => new Map()),
  ])

  const comunicadoMap = new Map<string, ComunicadoRecord>(
    comunicados.map(c => [c.nombre.toLowerCase(), c])
  )

  // Smartsheet lookup for supervisorRegional (Redshift doesn't have this yet)
  const vendedorByEmail = new Map(
    vendedores.filter(v => v.email).map(v => [v.email!.toLowerCase(), v])
  )

  const recentMonths = getRecentMonths(6)

  const asalariados: AsalariadoData[] = []

  for (const emp of activeAsalariados) {
    // Get supervisorRegional from Smartsheet by email
    const vend = vendedorByEmail.get(emp.email)
    const supervisor = vend?.supervisorRegional ?? null
    const effectiveSupervisor = isActiveSupervisor(supervisor) ? supervisor : null

    const months = recentMonths.map(({ year, month }) =>
      calcMonthMetrics(ventasRows, emp.fullName, year, month, emp.hireDate)
    )

    const consecutive = calcConsecutiveMisses(months)
    const { status }  = pendingComunicado(consecutive)
    const approved    = comunicadoMap.get(emp.fullName.toLowerCase()) ?? null

    const fu = followUpMap.get(emp.email) ?? followUpMap.get(emp.fullName.toLowerCase()) ?? null

    asalariados.push({
      nombre:             emp.fullName,
      email:              emp.email,
      salesRole:          emp.salesRole,
      supervisorRegional: effectiveSupervisor,
      ciudad:             emp.ciudad ?? vend?.ciudad ?? null,
      hireDate:           emp.hireDate,
      months,
      consecutive,
      pendingStatus:      status,
      redshiftStatus:     memoLevelToStatus(emp.memoLevel),
      memo1Date:          emp.memo1Date,
      memo2Date:          emp.memo2Date,
      terminacionDate:    emp.terminacionDate,
      approved,
      leads:              fu?.leads ?? null,
      citas:              fu?.citas ?? null,
      orientaciones:      fu?.citasRealizadas ?? null,
      monthsAsAsalariado: monthsAsAsalariado(emp.hireDate),
    })
  }

  // Sort alphabetically within groups
  asalariados.sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Asalariados</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Seguimiento de metas y comunicados — Empleados directos
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Datos de ventas en vivo · Redshift
          </p>
        </div>
      </div>
      <AsalariadosClient
        asalariados={asalariados}
        recentMonths={recentMonths}
        isAdmin={role === 'admin'}
      />
    </div>
  )
}
