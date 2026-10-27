import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/api-auth'
import {
  loadRecruitRows, buildCohorts, cohortUniverse, buildFunnel, buildKpis,
  buildSourceBreakdown, buildBreakdown, buildMentorRoster, getFilterOptions, getMemberOutcomes,
  sessionsCollapse,
  DEFAULT_LOOKBACK_DAYS,
  type RecruitFilters, type SolarAcademyHorarioFilter, type MemberOutcome,
} from '@/lib/reclutamiento'

export const dynamic = 'force-dynamic'

// GET /api/reclutamiento/summary?sede=&horario=&source=&solarFrom=&solarTo=&lookbackDays=
//
// Un solo ancla de fecha: el rango del Solar Academy. La ventana de llamadas se
// deriva restándole lookbackDays. Las opciones de filtro se calculan sobre el
// universo completo (no sobre el filtrado) para que los pills no desaparezcan.
export async function GET(req: NextRequest) {
  const denied = await requireRole(['admin', 'supervisor'])
  if (denied) return denied

  try {
    const q = req.nextUrl.searchParams
    const lookbackRaw = Number(q.get('lookbackDays'))
    const filters: RecruitFilters = {
      sede:      q.get('sede')      || undefined,
      horario:  (q.get('horario')   || undefined) as SolarAcademyHorarioFilter,
      source:    q.get('source')    || undefined,
      formulario: q.get('formulario') || undefined,
      solarFrom: q.get('solarFrom') || undefined,
      solarTo:   q.get('solarTo')   || undefined,
      lookbackDays: Number.isFinite(lookbackRaw) && lookbackRaw > 0 ? lookbackRaw : DEFAULT_LOOKBACK_DAYS,
    }

    // La rebanada se pide ya filtrada por la ventana: son ~60,000 records en
    // Redshift y no caben en memoria por request.
    const [{ rows, source: dataSource, lastDate }, options] = await Promise.all([
      loadRecruitRows(filters),
      getFilterOptions(),
    ])

    if (!rows.length) {
      return NextResponse.json({
        dataSource, lastDate, total: 0, universo: 0,
        options,
        window: null, kpis: null, funnel: [], sources: [], mentores: [],
        breakdown: { source: [], sede: [] },
        outcomesDisponibles: false,
      })
    }

    const cohorts = buildCohorts(rows, filters)
    const universe = cohortUniverse(cohorts)

    // Graduación y primera venta viven en Sales Team, no en el módulo de
    // reclutamiento. El fixture no trae el ID del lookup, así que ahí el mapa
    // queda vacío y las columnas se muestran como "—".
    const memberIds = [...new Set(universe.map(r => r.salesTeamMatchingId).filter((x): x is string => Boolean(x)))]
    let outcomes = new Map<string, MemberOutcome>()
    try {
      outcomes = await getMemberOutcomes(memberIds)
    } catch (err) {
      console.error('[reclutamiento] outcomes de Sales Team no disponibles:', (err as Error).message)
    }

    return NextResponse.json({
      dataSource,
      lastDate,
      total: universe.length,
      universo: rows.length,
      sesionesColapsadas: sessionsCollapse(cohorts.asistieron),
      options,
      window: cohorts.window,
      kpis: buildKpis(cohorts, outcomes),
      funnel: buildFunnel(cohorts),
      sources: buildSourceBreakdown(cohorts),
      breakdown: {
        source:     buildBreakdown(cohorts, 'source'),
        sede:       buildBreakdown(cohorts, 'sede'),
        formulario: buildBreakdown(cohorts, 'formulario'),
      },
      mentores: buildMentorRoster(cohorts, outcomes),
      outcomesDisponibles: outcomes.size > 0,
    })
  } catch (err) {
    console.error('[reclutamiento] summary falló:', err)
    return NextResponse.json({ error: (err as Error).message }, { status: 500 })
  }
}
