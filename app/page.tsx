import { getLatestReport, listWeekKeys } from '@/lib/kv'
import { getVentasUploadedAt } from '@/lib/asalariados-kv'
import { auth } from '@/auth'
import Link from 'next/link'
import UploadForm from '@/components/UploadForm'
import StipSyncForm from '@/components/StipSyncForm'
import VentasUploadForm from '@/components/VentasUploadForm'
import WeeksManager from '@/components/WeeksManager'

export const dynamic = 'force-dynamic'

const CHANNELS = [
  { href: '/horas',                    label: 'Análisis de Horas',        icon: '⏱️', desc: 'Tarjetas por empleado · ACO vs sin ACO · detalle de turnos' },
  { href: '/canales/cambaceo',         label: 'Canal Cambaceo',           icon: '🚶', desc: 'Canvaseo · métricas de turnos, AM/PM, individuos' },
  { href: '/canales/mall',             label: 'Canal Mall / Home Depot',  icon: '🏬', desc: 'Booth Malls · Home Depot · ponche, asignación' },
  { href: '/canales/independiente',    label: 'Canal Independiente',      icon: '📍', desc: 'Booth Ind · BCN · Eventos · Selectos y más' },
]

export default async function HomePage() {
  const [weeks, ventasUploadedAt, session] = await Promise.all([
    listWeekKeys().catch(() => [] as string[]),
    getVentasUploadedAt(),
    auth(),
  ])
  const latest = weeks[0]
  const isAdmin = (session?.user as any)?.role === 'admin'

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-[#003320] text-white rounded-2xl px-8 py-8">
        <h1 className="text-3xl font-bold">Windmar Horas</h1>
        <p className="text-[#00A651] mt-1">Dashboard de turnos y nómina — Windmar Energy</p>
        {latest && (
          <p className="text-slate-300 text-sm mt-2">
            Última semana cargada: <span className="font-semibold text-white">{latest}</span>
          </p>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Upload section */}
        <div className="space-y-5">
          <div>
            <h2 className="text-lg font-semibold text-[#0D1654] mb-3">Sincronizar turnos desde STIP</h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <StipSyncForm />
            </div>
          </div>

          <details className="group">
            <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-600 select-none list-none flex items-center gap-1">
              <svg className="w-3 h-3 transition-transform group-open:rotate-90" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd"/>
              </svg>
              Subir CSV manual (fallback)
            </summary>
            <div className="mt-3 bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <UploadForm />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Shifter exporta el CSV desde <strong>Akcelita → Reports → Weekly Shift Report</strong>.
            </p>
          </details>

          <div>
            <h2 className="text-lg font-semibold text-[#0D1654] mb-3">Subir reporte de ventas</h2>
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <VentasUploadForm uploadedAt={ventasUploadedAt} />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Exporta desde Smartsheet → <strong>Ventas Follow Up 2025</strong> → File → Export → CSV.
            </p>
          </div>
        </div>

        {/* Quick links */}
        <div>
          <h2 className="text-lg font-semibold text-[#0D1654] mb-3">Vistas disponibles</h2>
          <div className="space-y-2">
            {CHANNELS.map(({ href, label, icon, desc }) => (
              <Link
                key={href}
                href={href}
                className="flex items-start gap-3 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 hover:border-[#00A651] hover:shadow-md transition-all"
              >
                <span className="text-2xl leading-none mt-0.5">{icon}</span>
                <div>
                  <p className="font-semibold text-slate-800">{label}</p>
                  <p className="text-xs text-slate-500">{desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Week history */}
      <WeeksManager weeks={weeks} isAdmin={isAdmin} />
    </div>
  )
}
