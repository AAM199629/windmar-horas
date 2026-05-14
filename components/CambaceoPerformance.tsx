'use client'

import { useRouter } from 'next/navigation'
import type { VendedorPerformanceRow, CoordinadorRow } from '@/lib/performance'

const MONTHS_ES: Record<string, string> = {
  '01': 'Enero',    '02': 'Febrero',   '03': 'Marzo',     '04': 'Abril',
  '05': 'Mayo',     '06': 'Junio',     '07': 'Julio',     '08': 'Agosto',
  '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre',
}

function fmtMonth(yyyymm: string): string {
  const [y, m] = yyyymm.split('-')
  return `${MONTHS_ES[m] ?? m} ${y}`
}

function getMonths(): string[] {
  const months: string[] = []
  const now   = new Date()
  const start = new Date(2026, 0, 1)
  let d = new Date(now.getFullYear(), now.getMonth(), 1)
  while (d >= start) {
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d = new Date(d.getFullYear(), d.getMonth() - 1, 1)
  }
  return months
}

function KpiBox({ label, value, color = 'text-slate-900' }: {
  label: string; value: string; color?: string
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm px-5 py-4 min-w-[130px]">
      <p className="text-xs text-slate-500 font-medium">{label}</p>
      <p className={`text-2xl font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  )
}

export default function CambaceoPerformance({
  vendedores,
  coordinadores,
  month,
}: {
  vendedores: VendedorPerformanceRow[]
  coordinadores: CoordinadorRow[]
  month: string
}) {
  const router = useRouter()
  const months = getMonths()

  const totalTurnos = vendedores.reduce((s, v) => s + v.turnos, 0)
  const totalMissed = vendedores.reduce((s, v) => s + v.missed, 0)
  const totalVentas = vendedores.reduce((s, v) => s + v.ventasCanal, 0)

  return (
    <div className="space-y-8">
      {/* Month selector + KPIs */}
      <div className="flex flex-wrap items-start gap-4">
        <select
          value={month}
          onChange={e => router.push(`/canales/cambaceo?view=performance&month=${e.target.value}`)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:border-[#00A651] bg-white"
        >
          {months.map(m => (
            <option key={m} value={m}>{fmtMonth(m)}</option>
          ))}
        </select>
        <div className="flex flex-wrap gap-3">
          <KpiBox label="Vendedores" value={String(vendedores.length)} />
          <KpiBox label="Turnos" value={String(totalTurnos)} />
          <KpiBox
            label="Missed"
            value={String(totalMissed)}
            color={totalMissed > 0 ? 'text-red-500' : 'text-slate-900'}
          />
          <KpiBox label="Ventas Canvassing" value={String(totalVentas)} color="text-[#00A651]" />
        </div>
      </div>

      {/* Sección 1: Vendedores */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Vendedores</h2>
        {vendedores.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">
            No hay turnos de cambaceo en {fmtMonth(month)}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase w-10">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Vendedor</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Turnos</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Missed</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Ventas Canv.</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase whitespace-nowrap">Total Ventas</th>
                </tr>
              </thead>
              <tbody>
                {vendedores.map((v, idx) => (
                  <tr key={v.email} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5">
                      <p className="font-semibold text-[#0D1654] leading-tight">{v.name}</p>
                      <p className="text-[10px] text-slate-400">{v.email}</p>
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-700">{v.turnos}</td>
                    <td className="px-4 py-2.5 text-center font-medium">
                      <span className={v.missed > 0 ? 'text-red-500' : 'text-slate-300'}>{v.missed}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold">
                      <span className={v.ventasCanal > 0 ? 'text-[#00A651]' : 'text-slate-300'}>{v.ventasCanal}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center font-medium text-slate-700">{v.totalVentas}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sección 2: Coordinadores */}
      <div>
        <h2 className="text-base font-semibold text-slate-700 mb-3">Por Coordinador de Canvaseo</h2>
        {coordinadores.length === 0 ? (
          <p className="text-slate-400 text-sm py-8 text-center">
            No hay data de coordinadores para {fmtMonth(month)}.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase w-10">#</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase">Coordinador</th>
                  <th className="px-4 py-2.5 text-center text-xs font-semibold text-slate-500 uppercase">Leads</th>
                </tr>
              </thead>
              <tbody>
                {coordinadores.map((c, idx) => (
                  <tr key={`${c.coordinador}-${idx}`} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-2.5 text-slate-400 text-xs">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-semibold text-[#0D1654]">{c.coordinador}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-[#1565C0]">{c.leads}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
