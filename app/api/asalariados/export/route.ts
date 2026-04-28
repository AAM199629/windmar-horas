import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getAllComunicados } from '@/lib/asalariados-kv'
import { getVendedores } from '@/lib/smartsheet'
import { getActiveAsalariados, getVentasFromRedshift, getFollowUpFromRedshift } from '@/lib/redshift'
import {
  isActiveSupervisor,
  calcMonthMetrics,
  getRecentMonths,
  calcConsecutiveMisses,
  pendingComunicado,
} from '@/lib/ventas'
import ExcelJS from 'exceljs'

export const dynamic = 'force-dynamic'

const MONTHS_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
]

function memoLevelToStatus(level: number | null): string {
  if (!level || level <= 0) return 'none'
  if (level >= 3) return 'terminacion'
  if (level >= 2) return 'comunicado2'
  return 'comunicado1'
}

const NAVY   = 'FF0D1654'
const GREEN  = 'FF00A651'
const YELLOW = 'FFFFFF00'
const GRAY   = 'FFD9D9D9'
const AMBER  = 'FFFFA500'
const RED    = 'FFFF4444'
const WHITE  = 'FFFFFFFF'

function border(): Partial<ExcelJS.Borders> {
  const s = { style: 'thin' as const }
  return { top: s, left: s, bottom: s, right: s }
}

function applyRow(row: ExcelJS.Row, cols: number, align: 'center' | 'left' = 'left') {
  for (let i = 1; i <= cols; i++) {
    const cell = row.getCell(i)
    cell.border    = border()
    cell.alignment = { horizontal: i <= 4 ? 'left' : 'center', vertical: 'middle' }
  }
}

const STATUS_LABEL: Record<string, string> = {
  none:        'Al día',
  comunicado1: 'Comunicado 1',
  comunicado2: 'Comunicado 2',
  terminacion: 'Terminación',
}

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recentMonths = getRecentMonths(6)

  const [ventasRows, comunicados, vendedores, activeAsalariados, followUpMap] = await Promise.all([
    getVentasFromRedshift().catch(() => []),
    getAllComunicados(),
    getVendedores(),
    getActiveAsalariados().catch(() => []),
    getFollowUpFromRedshift().catch(() => new Map()),
  ])

  const comunicadoMap = new Map(comunicados.map(c => [c.nombre.toLowerCase(), c]))
  const vendedorByEmail = new Map(vendedores.filter(v => v.email).map(v => [v.email!.toLowerCase(), v]))

  // Build rows
  const rows = activeAsalariados.map(emp => {
    const vend = vendedorByEmail.get(emp.email)
    const supervisor = vend?.supervisorRegional ?? null
    const region = isActiveSupervisor(supervisor) ? supervisor : 'Sin Región'

    const months = recentMonths.map(({ year, month }) =>
      calcMonthMetrics(ventasRows, emp.fullName, year, month, emp.hireDate)
    )

    const consecutive = calcConsecutiveMisses(months)
    const { status } = pendingComunicado(consecutive)
    const approved = comunicadoMap.get(emp.fullName.toLowerCase()) ?? null
    const redshiftStatus = memoLevelToStatus(emp.memoLevel)
    const displayStatus =
      redshiftStatus !== 'none' ? redshiftStatus :
      (approved?.status && approved.status !== 'none' ? approved.status : status)

    const fu = followUpMap.get(emp.email) ?? followUpMap.get(emp.fullName.toLowerCase()) ?? null

    // Aggregate metrics across non-grace months
    const active = months.filter(m => !m.isGrace)
    const grace  = months.filter(m => m.isGrace)

    const totalSolar     = active.reduce((s, m) => s + m.solar, 0)
    const totalCdbg      = active.reduce((s, m) => s + m.cdbg, 0)
    const totalAnker     = active.reduce((s, m) => s + m.anker, 0)
    const totalWater     = active.reduce((s, m) => s + m.water, 0)
    const totalAsistidas = active.reduce((s, m) => s + m.asistidas, 0)
    const totalWeighted  = active.reduce((s, m) => s + m.total, 0)
    const graceTotal     = grace.reduce((s, m) => s + m.total, 0)
    const ventasGross    = totalSolar + totalCdbg + totalAnker + totalWater + totalAsistidas
    const promedio       = active.length > 0 ? totalWeighted / active.length : 0

    return {
      nombre:       emp.fullName,
      region:       region ?? '',
      salesRole:    emp.salesRole,
      leads:        fu?.leads ?? null,
      citas:        fu?.citas ?? null,
      orientaciones: fu?.citasRealizadas ?? null,
      asistidas:    totalAsistidas,
      cdbg:         totalCdbg,
      cdbgInstall:  totalCdbg,
      anker:        totalAnker,
      water:        totalWater,
      ventasGracia: graceTotal,
      ventasActivas: ventasGross,
      ventasNetas:  totalWeighted,
      totalVentas:  totalWeighted,
      mesesSinMeta: consecutive,
      promedio,
      status:       displayStatus,
      memo1:        emp.memo1Date || approved?.memo1 || '',
      memo2:        emp.memo2Date || approved?.memo2 || '',
      memo3:        emp.terminacionDate || approved?.memo3 || '',
    }
  }).sort((a, b) => a.region.localeCompare(b.region) || a.nombre.localeCompare(b.nombre))

  // Build workbook
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Asalariados')

  const today = new Date()
  const monthLabel = MONTHS_ES[today.getMonth()]
  const yearLabel  = today.getFullYear()

  ws.columns = [
    { width: 30 }, // A Nombre
    { width: 34 }, // B Regional
    { width: 22 }, // C Sales Role
    { width: 10 }, // D Leads
    { width: 10 }, // E Citas
    { width: 14 }, // F Orientaciones
    { width: 12 }, // G Asistidas
    { width: 10 }, // H CDBG
    { width: 12 }, // I CDBG Install
    { width: 10 }, // J Anker
    { width: 10 }, // K Water
    { width: 14 }, // L Ventas Gracia
    { width: 14 }, // M Ventas Activas
    { width: 14 }, // N Ventas Netas
    { width: 14 }, // O Total de Ventas
    { width: 14 }, // P Meses sin Meta
    { width: 14 }, // Q Promedio
    { width: 16 }, // R Estado
    { width: 16 }, // S Fecha Memo 1
    { width: 16 }, // T Fecha Memo 2
    { width: 16 }, // U Fecha Terminación
  ]

  const NCOLS = 21

  // Title
  const titleRow = ws.addRow([`REPORTE ASALARIADOS — ${monthLabel} ${yearLabel}`, ...Array(NCOLS - 1).fill('')])
  ws.mergeCells(`A${titleRow.number}:U${titleRow.number}`)
  titleRow.height = 28
  const tc = titleRow.getCell(1)
  tc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  tc.font      = { bold: true, size: 12, color: { argb: WHITE } }
  tc.alignment = { horizontal: 'center', vertical: 'middle' }

  // Headers
  const hdrs = [
    'NOMBRE', 'REGIONAL', 'SALES ROLE',
    'LEADS', 'CITAS CREADAS', 'CITAS REALIZADAS',
    'ASISTIDAS', 'CDBG', 'CDBG INSTALL',
    'ANKER', 'WATER',
    'VENTAS GRACIA', 'VENTAS ACTIVAS', 'VENTAS NETAS', 'TOTAL DE VENTAS',
    'MESES SIN META', 'PROMEDIO',
    'ESTADO', 'FECHA MEMO 1', 'FECHA MEMO 2', 'FECHA TERMINACIÓN',
  ]

  const hdrRow = ws.addRow(hdrs)
  hdrRow.height = 36
  hdrRow.eachCell((cell, col) => {
    cell.font      = { bold: true, color: { argb: WHITE } }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
    cell.alignment = { horizontal: col <= 3 ? 'left' : 'center', vertical: 'middle', wrapText: true }
    cell.border    = border()
  })

  // Group rows by region
  let lastRegion = ''

  for (const r of rows) {
    if (r.region !== lastRegion) {
      // Region separator
      const sepRow = ws.addRow([r.region, ...Array(NCOLS - 1).fill('')])
      ws.mergeCells(`A${sepRow.number}:U${sepRow.number}`)
      sepRow.height = 20
      const sc = sepRow.getCell(1)
      sc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8ECF5' } }
      sc.font      = { bold: true, size: 10, color: { argb: NAVY } }
      sc.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 }
      lastRegion = r.region
    }

    const statusColor =
      r.status === 'terminacion'  ? RED :
      r.status === 'comunicado2'  ? 'FFFFA500' :
      r.status === 'comunicado1'  ? 'FFFFC107' :
      GREEN

    const empRow = ws.addRow([
      r.nombre,
      r.region,
      r.salesRole,
      r.leads   ?? '',
      r.citas   ?? '',
      r.orientaciones ?? '',
      r.asistidas || '',
      r.cdbg    || '',
      r.cdbgInstall || '',
      r.anker   || '',
      r.water   || '',
      r.ventasGracia   > 0 ? r.ventasGracia   : '',
      r.ventasActivas  > 0 ? r.ventasActivas  : '',
      r.ventasNetas    > 0 ? +r.ventasNetas.toFixed(1)   : '',
      r.totalVentas    > 0 ? +r.totalVentas.toFixed(1)   : '',
      r.mesesSinMeta   > 0 ? r.mesesSinMeta   : '',
      r.promedio       > 0 ? +r.promedio.toFixed(2)       : '',
      STATUS_LABEL[r.status] ?? r.status,
      r.memo1 || '',
      r.memo2 || '',
      r.memo3 || '',
    ])
    empRow.height = 18
    applyRow(empRow, NCOLS)

    // Colour the status cell
    const statusCell = empRow.getCell(18)
    statusCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } }
    statusCell.font = { bold: r.status !== 'none', color: { argb: r.status === 'none' ? '00000000' : WHITE } }

    // Orange tint for consecutive misses
    if (r.mesesSinMeta > 0) {
      empRow.getCell(16).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF3CD' } }
      empRow.getCell(16).font = { bold: true, color: { argb: 'FF856404' } }
    }
  }

  // Totals row
  ws.addRow([])
  const totalRow = ws.addRow([
    `Total: ${rows.length} empleados`,
    '', '',
    rows.reduce((s, r) => s + (r.leads ?? 0), 0),
    rows.reduce((s, r) => s + (r.citas ?? 0), 0),
    rows.reduce((s, r) => s + (r.orientaciones ?? 0), 0),
    rows.reduce((s, r) => s + r.asistidas, 0),
    rows.reduce((s, r) => s + r.cdbg, 0),
    rows.reduce((s, r) => s + r.cdbgInstall, 0),
    rows.reduce((s, r) => s + r.anker, 0),
    rows.reduce((s, r) => s + r.water, 0),
    +rows.reduce((s, r) => s + r.ventasGracia, 0).toFixed(1),
    +rows.reduce((s, r) => s + r.ventasActivas, 0).toFixed(1),
    +rows.reduce((s, r) => s + r.ventasNetas, 0).toFixed(1),
    +rows.reduce((s, r) => s + r.totalVentas, 0).toFixed(1),
    rows.filter(r => r.mesesSinMeta > 0).length,
    '',
    `${rows.filter(r => r.status !== 'none').length} con comunicado`,
    '', '', '',
  ])
  totalRow.height = 20
  totalRow.eachCell((cell, col) => {
    cell.font      = { bold: true }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
    cell.alignment = { horizontal: col <= 3 ? 'left' : 'center', vertical: 'middle' }
    cell.border    = border()
  })

  const buf = await wb.xlsx.writeBuffer()
  const filename = `Asalariados-${today.toISOString().slice(0, 10)}.xlsx`

  return new Response(buf as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
