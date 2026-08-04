import { getVendedores, buildVendedorMap } from '@/lib/smartsheet'
import { getAsalariadoData, getActivePromotores } from '@/lib/redshift'
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import HorasDateView from '@/components/HorasDateView'

export const dynamic = 'force-dynamic'

export default async function HorasPage() {
  const [vendedores, session, asalariadoMap, promotores] = await Promise.all([
    getVendedores(),
    auth(),
    getAsalariadoData().catch(() => new Map()),
    getActivePromotores().catch(() => []),
  ])

  const promotorEmails = promotores.map(p => p.email.toLowerCase())

  const vmap = buildVendedorMap(vendedores)
  const role = (session?.user as any)?.role

  if (role === 'canal') redirect('/canales/cambaceo')

  // Serialize Maps to plain objects for client component
  const vendedorMapObj = Object.fromEntries(
    [...vmap.entries()].map(([k, v]) => [k, v])
  )
  const asalariadoMapObj = Object.fromEntries(
    [...asalariadoMap.entries()].map(([k, v]) => [k, v])
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#0D1654]">Análisis de Horas</h1>
        <p className="text-slate-500 text-sm mt-0.5">Turnos en tiempo real · STIP</p>
      </div>
      <HorasDateView
        vendedorMap={vendedorMapObj}
        asalariadoMap={asalariadoMapObj}
        promotorEmails={promotorEmails}
        role={role}
      />
    </div>
  )
}
