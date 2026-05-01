import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { getActivePromotores } from '@/lib/redshift'
import { getFollowUpFromRedshift } from '@/lib/redshift'
import { getPromoterLeadStats } from '@/lib/zoho-crm'
import { getLatestReport } from '@/lib/kv'
import { getVendedores } from '@/lib/smartsheet'
import { isActiveSupervisor } from '@/lib/ventas'
import PromotoresClient from './PromotoresClient'
import type { DayShiftSummary } from '@/lib/types'

export const dynamic = 'force-dynamic'

export interface PromotorData {
  nombre: string
  email: string
  ciudad: string | null
  supervisorRegional: string | null
  hireDate: string | null
  leadsThisMonth: number | null
  leadsThisWeek: number | null
  ventasFromLeads: number | null
  citas: number | null
  horasConACO: number
  shifterWeekKey: string | null
  shifts: DayShiftSummary[]
  locations: string[]
}

export default async function PromotoresPage() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || (role !== 'admin' && role !== 'supervisor')) redirect('/')

  const [promotores, followUpMap, vendedores, report] = await Promise.all([
    getActivePromotores().catch(() => []),
    getFollowUpFromRedshift().catch(() => new Map()),
    getVendedores(),
    getLatestReport().catch(() => null),
  ])

  const promoterList = promotores.map(p => ({ email: p.email, name: p.fullName }))
  const zohoStats = await getPromoterLeadStats(promoterList).catch(() => new Map())

  const vendedorByEmail = new Map(
    vendedores.filter(v => v.email).map(v => [v.email!.toLowerCase(), v])
  )

  // Build Shifter lookup by email
  const shifterByEmail = new Map(
    (report?.employees ?? []).map(e => [e.email.toLowerCase(), e])
  )

  const data: PromotorData[] = promotores.map(p => {
    const vend       = vendedorByEmail.get(p.email)
    const supervisor = vend?.supervisorRegional ?? null
    const fu         = followUpMap.get(p.email) ?? followUpMap.get(p.fullName.toLowerCase()) ?? null
    const zoho       = zohoStats.get(p.email) ?? null
    const shifter    = shifterByEmail.get(p.email) ?? null

    const locations = shifter
      ? [...new Set(
          shifter.shifts
            .filter(s => s.shiftStatus === 'Completed' && s.location)
            .map(s => s.location)
        )]
      : []

    return {
      nombre:             p.fullName,
      email:              p.email,
      ciudad:             p.ciudad ?? vend?.ciudad ?? null,
      supervisorRegional: isActiveSupervisor(supervisor) ? supervisor : null,
      hireDate:           p.hireDate,
      leadsThisMonth:     zoho?.leadsThisMonth ?? fu?.leads ?? null,
      leadsThisWeek:      zoho?.leadsThisWeek ?? null,
      ventasFromLeads:    zoho?.ventasFromLeads ?? null,
      citas:              fu?.citas ?? null,
      horasConACO:        shifter?.horasConACO ?? 0,
      shifterWeekKey:     report?.weekKey ?? null,
      shifts:             shifter?.shifts ?? [],
      locations,
    }
  })

  data.sort((a, b) => a.nombre.localeCompare(b.nombre))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Promotores</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Leads, conversiones y actividad semanal · {promotores.length} activos
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Leads via Zoho CRM · Horas via Shifter
        </p>
      </div>
      <PromotoresClient promotores={data} weekKey={report?.weekKey ?? null} />
    </div>
  )
}
