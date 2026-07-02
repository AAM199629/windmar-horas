import { NextRequest, NextResponse } from 'next/server'
import {
  getHomeDepotFinance, getMallFinance, getBoothEventFinance,
  getCambaseoFinance, homeDepotUnitsReady,
} from '@/lib/finance'
import {
  HD_LUMP_SUM_SEMESTRAL, HD_META_POR_TIENDA, cambaseoComisionPorMes,
} from '@/lib/finance-config'

export const dynamic = 'force-dynamic'

function monthRange(year: number, month1to12: number) {
  const from = `${year}-${String(month1to12).padStart(2, '0')}-01`
  const last = new Date(year, month1to12, 0).getDate()
  const to   = `${year}-${String(month1to12).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { from, to }
}
// Semestre calendario que contiene el mes (H1 ene–jun, H2 jul–dic).
function semesterRange(year: number, month1to12: number) {
  const isH1 = month1to12 <= 6
  const from = `${year}-${isH1 ? '01' : '07'}-01`
  const to   = `${year}-${isH1 ? '06-30' : '12-31'}`
  return { from, to, label: `${isH1 ? '1er' : '2do'} Semestre ${year}` }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const monthParam = searchParams.get('month') // YYYY-MM
  const now = new Date()
  let year  = now.getFullYear()
  let month = now.getMonth() + 1
  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    year = y; month = m
  }

  try {
    const mr  = monthRange(year, month)
    const sem = semesterRange(year, month)

    const [homeDepotMensual, homeDepotSemestral, malls, booths, coordinadores, hdReady] = await Promise.all([
      getHomeDepotFinance(mr.from, mr.to),
      getHomeDepotFinance(sem.from, sem.to),
      getMallFinance(mr.from, mr.to),
      getBoothEventFinance(mr.from, mr.to),
      getCambaseoFinance(mr.from, mr.to, month),
      homeDepotUnitsReady(),
    ])

    // ── Aporte por canal (mensual) ──
    const hdIngreso   = homeDepotMensual.reduce((s, t) => s + (t.ingreso ?? 0), 0)
    const hdCosto     = HD_LUMP_SUM_SEMESTRAL / 6
    const mallIngreso = malls.reduce((s, m) => s + m.ganancia, 0)
    const mallCosto   = malls.reduce((s, m) => s + m.costoMensual, 0)
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

    const ingresoMensual = canales.reduce((s, c) => s + c.ingreso, 0)
    const costoMensual   = canales.reduce((s, c) => s + c.costo, 0)
    const gananciaNeta   = ingresoMensual - costoMensual
    const margenPct      = ingresoMensual > 0 ? gananciaNeta / ingresoMensual : 0

    return NextResponse.json({
      year, month,
      monthLabel: new Date(year, month - 1, 1).toLocaleDateString('es-PR', { month: 'long', year: 'numeric' }),
      semesterLabel: sem.label,
      hdUnitsReady: hdReady,
      cambaseoComisionUnit: cambaseoComisionPorMes(month),
      resumen: { ingresoMensual, costoMensual, gananciaNeta, margenPct, canales },
      homeDepot: {
        mensual: homeDepotMensual,
        semestral: homeDepotSemestral,
        metaSemestre: HD_LUMP_SUM_SEMESTRAL,
        metaPorTienda: HD_META_POR_TIENDA,
        prorrateoMensual: hdCosto,
      },
      malls,
      booths,
      coordinadores,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message ?? 'Error cargando finanzas' }, { status: 500 })
  }
}
