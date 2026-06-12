import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getAllComunicados } from '@/lib/asalariados-kv'
import { getVendedores } from '@/lib/smartsheet'
import { getActiveAsalariados, getVentasFromRedshift, getFollowUpFromRedshift } from '@/lib/redshift'
import {
  isActiveSupervisor,
  calcMonthMetrics, getRecentMonths,
  calcConsecutiveMisses, monthsAsAsalariado,
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

const STATUS_ORDER: Record<string, number> = {
  none: 0, comunicado1: 1, comunicado2: 2, terminacion: 3,
}

function maxStatus(
  a: AsalariadoData['pendingStatus'],
  b: AsalariadoData['pendingStatus'],
): AsalariadoData['pendingStatus'] {
  return STATUS_ORDER[a] >= STATUS_ORDER[b] ? a : b
}

function memoImpliedStatus(
  memo1Date: string | null,
  memo2Date: string | null,
  months: MonthMetrics[],
): AsalariadoData['pendingStatus'] {
  if (months.length < 2) return 'none'
  const current  = months[months.length - 1]  // mes actual (en curso)
  const previous = months[months.length - 2]  // mes anterior (completo)
  const prevStr  = `${previous.year}-${String(previous.month).padStart(2, '0')}`

  const memo2LastMonth = Boolean(memo2Date && memo2Date.slice(0, 7) === prevStr)
  const memo1LastMonth = Boolean(memo1Date && memo1Date.slice(0, 7) === prevStr)

  if (memo2LastMonth) return !current.met ? 'terminacion' : 'none'
  if (memo1LastMonth) return !current.met ? 'comunicado2' : 'none'

  // Sin memo el mes pasado: comunicado1 si el mes anterior (ya completo) no fue cumplido
  if (!previous.isGrace && !previous.met) return 'comunicado1'
  return 'none'
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
    const implied     = memoImpliedStatus(emp.memo1Date, emp.memo2Date, months)
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
      pendingStatus:      implied,
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
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26, fontFamily: "'Montserrat', sans-serif" }}>
        <div>
          <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: '#1D429B', marginBottom: 6 }}>
            EMPLEADOS DIRECTOS · METAS Y COMUNICADOS · REDSHIFT
          </p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 'clamp(40px, 5vw, 60px)', lineHeight: 0.9, margin: 0 }}>
            <span style={{ color: '#21274E' }}>Equipo </span>
            <span style={{ color: '#F89B24' }}>Asalariados</span>
          </h1>
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
