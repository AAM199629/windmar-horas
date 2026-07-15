import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import {
  getHomeDepotFinance, getMallFinance, getBoothEventFinance,
  getCambaseoFinance, homeDepotUnitsReady, monthsInRange,
  getShiftCoverageByLocation,
} from '@/lib/finance'
import {
  HD_LUMP_SUM_SEMESTRAL, HD_META_POR_TIENDA, cambaseoComisionPorMes,
} from '@/lib/finance-config'

export const dynamic = 'force-dynamic'

function isDate(s: string | null): s is string { return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s) }
function isMonth(s: string | null): s is string { return !!s && /^\d{4}-\d{2}$/.test(s) }

function monthBounds(year: number, month1to12: number) {
  const from = `${year}-${String(month1to12).padStart(2, '0')}-01`
  const last = new Date(year, month1to12, 0).getDate()
  const to   = `${year}-${String(month1to12).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}

// Etiqueta amigable del rango: un mes calendario completo → "junio de 2026";
// semestre completo → "1er/2do Semestre 2026"; si no → "1 ene 2026 – 30 jun 2026".
function rangeLabel(from: string, to: string): string {
  const fmt = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('es-PR', { day: 'numeric', month: 'short', year: 'numeric' })
  const [fy, fm, fd] = from.split('-').map(Number)
  const [ty, tm, td] = to.split('-').map(Number)
  const lastOf = (y: number, m: number) => new Date(y, m, 0).getDate()
  if (fy === ty && fm === tm && fd === 1 && td === lastOf(ty, tm)) {
    return new Date(from + 'T12:00:00').toLocaleDateString('es-PR', { month: 'long', year: 'numeric' })
  }
  if (fy === ty && fd === 1 && td === lastOf(ty, tm)) {
    if (fm === 1 && tm === 6)  return `1er Semestre ${fy}`
    if (fm === 7 && tm === 12) return `2do Semestre ${fy}`
    if (fm === 1 && tm === 12) return `Año ${fy}`
  }
  return `${fmt(from)} – ${fmt(to)}`
}

export async function GET(req: NextRequest) {
  const denied = await requireRole(['admin'])
  if (denied) return denied
  const { searchParams } = req.nextUrl
  const now = new Date()

  // Prioridad: from+to explícitos → month (compat) → mes actual.
  let from: string, to: string
  const fromP = searchParams.get('from'), toP = searchParams.get('to'), monthP = searchParams.get('month')
  if (isDate(fromP) && isDate(toP)) {
    from = fromP <= toP ? fromP : toP
    to   = fromP <= toP ? toP : fromP
  } else if (isMonth(monthP)) {
    const [y, m] = monthP.split('-').map(Number)
    ;({ from, to } = monthBounds(y, m))
  } else {
    ;({ from, to } = monthBounds(now.getFullYear(), now.getMonth() + 1))
  }

  try {
    const meses = monthsInRange(from, to)
    const mesesCount = meses.length

    // Cobertura de turnos (Shifter) por (canal, location) — se calcula una vez y
    // se reparte entre HD, malls y booths.
    const cov = await getShiftCoverageByLocation(from, to)

    const [homeDepot, malls, booths, coordinadores, hdReady] = await Promise.all([
      getHomeDepotFinance(from, to, cov),
      getMallFinance(from, to, cov),
      getBoothEventFinance(from, to, cov),
      getCambaseoFinance(from, to, mesesCount),
      homeDepotUnitsReady(),
    ])

    // ── Aporte por canal (acumulado del período) ──
    const hdIngreso    = homeDepot.reduce((s, t) => s + (t.ingreso ?? 0), 0)
    const hdCosto      = (HD_LUMP_SUM_SEMESTRAL / 6) * mesesCount   // prorrateo por mes del rango
    const mallIngreso  = malls.reduce((s, m) => s + m.ganancia, 0)
    const mallCosto    = malls.reduce((s, m) => s + m.costoPeriodo, 0)
    const boothIngreso = booths.reduce((s, b) => s + b.ingreso, 0)
    const boothCosto   = booths.reduce((s, b) => s + b.costo, 0)
    const cambIngreso  = coordinadores.reduce((s, c) => s + c.gananciaCompania, 0)
    const cambCosto    = coordinadores.reduce((s, c) => s + c.costoTotal, 0)

    const canales = [
      { nombre: 'Home Depot',          ingreso: hdIngreso,    costo: hdCosto,    neto: hdIngreso - hdCosto },
      { nombre: 'Centros Comerciales', ingreso: mallIngreso,  costo: mallCosto,  neto: mallIngreso - mallCosto },
      { nombre: 'Booths & Eventos',    ingreso: boothIngreso, costo: boothCosto, neto: boothIngreso - boothCosto },
      { nombre: 'Cambaseo',            ingreso: cambIngreso,   costo: cambCosto,  neto: cambIngreso - cambCosto },
    ]

    const ingreso = canales.reduce((s, c) => s + c.ingreso, 0)
    const costo   = canales.reduce((s, c) => s + c.costo, 0)
    const gananciaNeta = ingreso - costo
    const margenPct    = ingreso > 0 ? gananciaNeta / ingreso : 0

    // Tarifa de comisión de cambaseo en el rango (puede variar por mes).
    const solarRates = Array.from(new Set(meses.map(mm => cambaseoComisionPorMes(mm.month))))
    const cambaseoComision = { rate: solarRates.length === 1 ? solarRates[0] : null, variable: solarRates.length > 1 }

    return NextResponse.json({
      from, to, meses: mesesCount, rangeLabel: rangeLabel(from, to),
      hdUnitsReady: hdReady,
      cambaseoComision,
      resumen: { ingreso, costo, gananciaNeta, margenPct, canales },
      homeDepot: {
        stores: homeDepot,
        metaSemestre: HD_LUMP_SUM_SEMESTRAL,
        metaPorTienda: HD_META_POR_TIENDA,
        prorrateoPeriodo: hdCosto,
      },
      malls,
      booths,
      coordinadores,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error cargando finanzas' }, { status: 500 })
  }
}
