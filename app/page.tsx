import { getVentasUploadedAt } from '@/lib/asalariados-kv'
import Link from 'next/link'
import VentasUploadForm from '@/components/VentasUploadForm'

export const dynamic = 'force-dynamic'

const CHANNELS = [
  { href: '/horas',                    label: 'Análisis de Horas',        icon: '⏱️', desc: 'Tarjetas por empleado · ACO vs sin ACO · detalle de turnos' },
  { href: '/canales/cambaceo',         label: 'Canal Cambaceo',           icon: '🚶', desc: 'Canvaseo · métricas de turnos, AM/PM, individuos' },
  { href: '/canales/mall',             label: 'Canal Mall / Home Depot',  icon: '🏬', desc: 'Booth Malls · Home Depot · ponche, asignación' },
  { href: '/canales/independiente',    label: 'Canal Independiente',      icon: '📍', desc: 'Booth Ind · BCN · Eventos · Selectos y más' },
]

export default async function HomePage() {
  const ventasUploadedAt = await getVentasUploadedAt()

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="bg-[#003320] text-white rounded-2xl px-8 py-8">
        <h1 className="text-3xl font-bold">Windmar Horas</h1>
        <p className="text-[#00A651] mt-1">Dashboard de turnos y nómina — Windmar Energy</p>
        <p className="text-slate-300 text-sm mt-2">Datos en tiempo real · STIP</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Ventas upload */}
        <div>
          <h2 className="text-lg font-semibold text-[#0D1654] mb-3">Subir reporte de ventas</h2>
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <VentasUploadForm uploadedAt={ventasUploadedAt} />
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Exporta desde Smartsheet → <strong>Ventas Follow Up 2025</strong> → File → Export → CSV.
          </p>
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
    </div>
  )
}
