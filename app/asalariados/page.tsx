import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getVentasRows, getVentasUploadedAt, getAllComunicados } from '@/lib/asalariados-kv'
import { getVendedores } from '@/lib/smartsheet'
import {
  isEmpleadoRole, isActiveSupervisor,
  calcMonthMetrics, getRecentMonths,
  calcConsecutiveMisses, pendingComunicado,
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
  months: MonthMetrics[]
  consecutive: number
  pendingStatus: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  approved: ComunicadoRecord | null
}

export default async function AsalariadosPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || (role !== 'admin' && role !== 'supervisor')) redirect('/')

  const [ventasRows, uploadedAt, comunicados, vendedores] = await Promise.all([
    getVentasRows(),
    getVentasUploadedAt(),
    getAllComunicados(),
    getVendedores(),
  ])

  const comunicadoMap = new Map<string, ComunicadoRecord>(
    comunicados.map(c => [c.nombre.toLowerCase(), c])
  )

  // Build vendedor lookup by name (lowercase) — primary match key
  const vendedorByName = new Map(
    vendedores
      .filter(v => v.name)
      .map(v => [v.name.toLowerCase(), v])
  )

  const recentMonths = getRecentMonths(6)

  // Collect all unique empleado names from the ventas CSV
  const nombreSet = new Set<string>()
  for (const r of ventasRows) {
    if (isEmpleadoRole(r.salesRole)) nombreSet.add(r.salesTeamName)
  }
  // Also include empleados from vendedores who might have 0 sales
  for (const v of vendedores) {
    if (isEmpleadoRole(v.salesRole ?? '')) nombreSet.add(v.name)
  }

  const asalariados: AsalariadoData[] = []

  for (const nombre of nombreSet) {
    // Match to vendedor for metadata
    const vend = vendedorByName.get(nombre.toLowerCase())
    const salesRole  = vend?.salesRole ?? ventasRows.find(r => r.salesTeamName.toLowerCase() === nombre.toLowerCase())?.salesRole ?? ''

    if (!isEmpleadoRole(salesRole)) continue

    const supervisor = vend?.supervisorRegional ?? null
    // Only include employees with an active supervisor (or those in the ventas CSV with a known role)
    // If supervisor is set but not in the active list → treat as no region (still show, just no grouping)
    const effectiveSupervisor = isActiveSupervisor(supervisor) ? supervisor : null

    const months = recentMonths.map(({ year, month }) =>
      calcMonthMetrics(ventasRows, nombre, year, month)
    )

    const consecutive   = calcConsecutiveMisses(months)
    const { status }    = pendingComunicado(consecutive)
    const approved      = comunicadoMap.get(nombre.toLowerCase()) ?? null

    asalariados.push({
      nombre,
      email:             vend?.email ?? null,
      salesRole,
      supervisorRegional: effectiveSupervisor,
      ciudad:            vend?.ciudad ?? null,
      months,
      consecutive,
      pendingStatus:     status,
      approved,
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
          {uploadedAt && (
            <p className="text-xs text-slate-400 mt-0.5">
              Datos de ventas: {new Date(uploadedAt).toLocaleDateString('es-PR', { dateStyle: 'medium' })}
            </p>
          )}
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
