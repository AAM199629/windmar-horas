import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getNomina } from '@/lib/nomina-kv'
import ExcelJS from 'exceljs'

async function requireAdmin() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') return null
  return session
}

const MONTHS_ES = [
  'ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO',
  'JULIO','AGOSTO','SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE',
]

function formatDateTitle(iso: string) {
  const [, m, d] = iso.split('-')
  return { day: parseInt(d, 10), month: MONTHS_ES[parseInt(m, 10) - 1], year: iso.split('-')[0] }
}

const JOB_ORDER = ['Consultor Energético', 'Gerente de Ventas - Asalariado', 'Líder Energético']

const YELLOW  = 'FFFFFF00'
const ORANGE  = 'FFFFA500'
const RED_HDR = 'FFFF6600'
const GRAY    = 'FFD9D9D9'

function applyBorder(row: ExcelJS.Row, cols = 8) {
  for (let i = 1; i <= cols; i++) {
    row.getCell(i).border = {
      top:    { style: 'thin' },
      left:   { style: 'thin' },
      bottom: { style: 'thin' },
      right:  { style: 'thin' },
    }
  }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ week: string }> }) {
  if (!await requireAdmin()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { week } = await params
  const record = await getNomina(week)
  if (!record) return NextResponse.json({ error: 'No nomina data for this week' }, { status: 404 })

  const { weekStart, weekEnd, entries } = record as any
  const active     = (entries ?? []).filter((e: any) => !e.terminationDate)
  const terminados = (entries ?? []).filter((e: any) => !!e.terminationDate)

  const s1 = formatDateTitle(weekStart ?? week)
  const s2 = formatDateTitle(weekEnd ?? week)
  const titleText = `CONSULTORES ASALARIADOS NOMINA SEMANA DEL ${s1.day} AL ${s2.day} DE ${s2.month} DE ${s2.year}`

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Nómina')

  ws.columns = [
    { width: 14 }, // A HIRE DATE
    { width: 28 }, // B Job Title
    { width: 32 }, // C NOMBRE COMPLETO
    { width: 24 }, // D CUMPLIÓ LAS HORAS
    { width: 13 }, // E SICK HOURS
    { width: 16 }, // F VACATION HOURS
    { width: 26 }, // G NO CUMPLIÓ CON LAS HORAS
    { width: 18 }, // H PAID
  ]

  // ── Title row ──────────────────────────────────────────────────────────────
  const titleRow = ws.addRow([titleText, '', '', '', '', '', '', ''])
  ws.mergeCells(`A${titleRow.number}:H${titleRow.number}`)
  titleRow.height = 28
  const tc = ws.getCell(`A${titleRow.number}`)
  tc.fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: YELLOW } }
  tc.font   = { bold: true, size: 12 }
  tc.alignment = { horizontal: 'center', vertical: 'middle' }

  // ── Header row ─────────────────────────────────────────────────────────────
  const headers = [
    'HIRE DATE', 'Job Title', 'NOMBRE COMPLETO',
    'CUMPLIÓ LAS HORAS\n(marca con una X)',
    'SICK HOURS', 'VACATION HOURS',
    'NO CUMPLIÓ CON LAS HORAS\n(marca con una X)',
    'PAID\n(marca con una X)',
  ]
  const hdrRow = ws.addRow(headers)
  hdrRow.height = 42
  hdrRow.eachCell(cell => {
    cell.font      = { bold: true }
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
  })

  // ── Employee rows by job title group ───────────────────────────────────────
  for (const jobTitle of JOB_ORDER) {
    const group = active.filter((e: any) => e.jobTitle === jobTitle)
    for (const emp of group) {
      const met = emp.metHoursOverride !== null ? emp.metHoursOverride : emp.metHoursAuto ?? true
      const empRow = ws.addRow([
        emp.hireDate || '',
        emp.jobTitle,
        emp.name,
        met ? 'X' : '',
        emp.sickHours || '',
        emp.vacationHours || '',
        !met ? 'X' : '',
        emp.paid ? 'X' : '',
      ])
      empRow.height = 18
      for (let i = 1; i <= 8; i++) {
        const cell = empRow.getCell(i)
        cell.alignment = { horizontal: i >= 4 ? 'center' : 'left', vertical: 'middle' }
        cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }
    }
  }

  // ── Anotaciones section ────────────────────────────────────────────────────
  const withComments = [...active, ...terminados].filter((e: any) => e.comments?.trim())
  if (withComments.length > 0) {
    ws.addRow([])

    const anotHdr = ws.addRow(['Anotaciones de Alverio', '', '', '', '', '', '', ''])
    ws.mergeCells(`A${anotHdr.number}:H${anotHdr.number}`)
    anotHdr.height = 22
    const ac = ws.getCell(`A${anotHdr.number}`)
    ac.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: ORANGE } }
    ac.font      = { bold: true }
    ac.alignment = { horizontal: 'center', vertical: 'middle' }

    for (const emp of withComments) {
      const r = ws.addRow(['', emp.jobTitle, emp.name, emp.comments, '', '', '', emp.paid ? '' : 'Cancelado'])
      ws.mergeCells(`D${r.number}:G${r.number}`)
      r.height = 40
      r.getCell(4).alignment = { wrapText: true, vertical: 'middle' }
      r.getCell(3).alignment = { vertical: 'middle' }
      r.getCell(2).alignment = { vertical: 'middle' }
      applyBorder(r)
    }
  }

  // ── Terminados section ─────────────────────────────────────────────────────
  if ((terminados ?? []).length > 0) {
    ws.addRow([])

    const termHdr = ws.addRow(['Fuera del Programa - Terminados', '', '', '', '', '', '', ''])
    ws.mergeCells(`A${termHdr.number}:H${termHdr.number}`)
    termHdr.height = 22
    const tHc = ws.getCell(`A${termHdr.number}`)
    tHc.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: RED_HDR } }
    tHc.font      = { bold: true, color: { argb: 'FFFFFFFF' } }
    tHc.alignment = { horizontal: 'center', vertical: 'middle' }

    const termHeaders = [
      'TERMINATION DATE', 'Job Title', 'NOMBRE COMPLETO',
      'CUMPLIÓ LAS HORAS\n(marca con una X)',
      'SICK HOURS', 'VACATION HOURS',
      'NO CUMPLIÓ CON LAS HORAS\n(marca con una X)',
      'PAID\n(marca con una X)',
    ]
    const tHdrRow = ws.addRow(termHeaders)
    tHdrRow.height = 42
    tHdrRow.eachCell(cell => {
      cell.font      = { bold: true }
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: GRAY } }
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
      cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
    })

    for (const t of terminados) {
      const tMet = t.metHoursOverride !== null ? t.metHoursOverride : t.metHoursAuto ?? true
      const r = ws.addRow([
        t.terminationDate || '',
        t.jobTitle,
        t.name,
        tMet ? 'X' : '',
        t.sickHours || '',
        t.vacationHours || '',
        !tMet ? 'X' : '',
        t.paid ? 'X' : '',
      ])
      r.height = 18
      for (let i = 1; i <= 8; i++) {
        const cell = r.getCell(i)
        cell.alignment = { horizontal: i >= 4 ? 'center' : 'left', vertical: 'middle' }
        cell.border    = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } }
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const filename = `Nomina-${week}.xlsx`

  return new Response(buffer as unknown as BodyInit, {
    headers: {
      'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
