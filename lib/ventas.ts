// ── Roles that qualify as salaried (empleado) employees ─────────────────────
export const EMPLEADO_ROLES = ['Empleado - Consultor', 'Empleado - Lider', 'Empleado - Gerente']

// Active supervisor regional names — anyone with a different supervisor
// is treated as non-salaried ("Sin Región")
export const SUPERVISORES_ACTIVOS = [
  'Manuel Antonio Gonzalez Figueroa',
  'Pedro Iturregui',
  'Ariel Figueroa Velez',
  'Ramon Rodriguez Sanchez',
  'Angel Manuel Maldonado Castello',
  'Eric Emanuel Rodriguez Roman',
]

export function isEmpleadoRole(role: string): boolean {
  return EMPLEADO_ROLES.some(r => r.toLowerCase() === (role ?? '').toLowerCase())
}

export function isActiveSupervisor(supervisor: string | null | undefined): boolean {
  if (!supervisor) return false
  return SUPERVISORES_ACTIVOS.some(s => s.toLowerCase() === supervisor.toLowerCase())
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface VentaRow {
  salesTeamName: string
  salesRole: string
  closingDate: string                  // raw string from CSV
  cancellationDate: string
  onHoldStatus: string
  financeCompany: string               // "CDBG" | "Cash" | "Oriental" | "Sunnova"
  installationCompletionDate: string
  pipeline: string                     // "Commercial Solar" | "Residential Solar" | "Roofing"
  productSold: string                  // free text — may contain "PPS" or "Water"
  salesRepAssistTrainee: string
  recruitedBy: string
  traineeSales: string                 // "1st Sale" | "2nd Sale" | … | ""
}

export interface MonthMetrics {
  year: number
  month: number
  solar: number      // active Solar/Roofing own sales  (×1)
  cdbg: number       // CDBG installs by completion date (×1)
  water: number      // Water products  (×0.5 each)
  anker: number      // Anker / PPS     (×0.5 each)
  asistidas: number  // assisted trainee sales          (×0.5 each)
  total: number      // computed weighted total
  meta: number       // 5 (Apr–Sep) | 3 (Oct–Mar)
  met: boolean
}

export interface ComunicadoPending {
  status: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  consecutive: number
}

// ── Date helpers ─────────────────────────────────────────────────────────────

export function parseDate(s: string): Date | null {
  if (!s || !s.trim()) return null
  const t = s.trim()
  // MM/DD/YY or MM/DD/YYYY
  const m1 = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/)
  if (m1) {
    let y = parseInt(m1[3])
    if (y < 100) y += 2000
    return new Date(y, parseInt(m1[1]) - 1, parseInt(m1[2]))
  }
  // YYYY-MM-DD
  const m2 = t.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (m2) return new Date(parseInt(m2[1]), parseInt(m2[2]) - 1, parseInt(m2[3]))
  return null
}

// ── Monthly quota ─────────────────────────────────────────────────────────────

export function getMetaForMonth(month: number): number {
  return month >= 4 && month <= 9 ? 5 : 3
}

// ── CSV parsing ───────────────────────────────────────────────────────────────

function parseCSVLine(line: string): string[] {
  const result: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
      else inQ = !inQ
    } else if (c === ',' && !inQ) {
      result.push(cur); cur = ''
    } else {
      cur += c
    }
  }
  result.push(cur)
  return result
}

export function parseVentasCSV(text: string): VentaRow[] {
  const lines = text.split('\n').filter(l => l.trim())
  if (lines.length < 2) return []

  const headers = parseCSVLine(lines[0]).map(h => h.trim().replace(/^"|"$/g, ''))
  const idx = (name: string) =>
    headers.findIndex(h => h.toLowerCase() === name.toLowerCase())

  const c = {
    name:        idx('Sales Team Name (1)'),
    role:        idx('Sales Role'),
    closing:     idx('Closing Date'),
    cancelled:   idx('Cancellation Date'),
    onHold:      idx('On Hold Status'),
    finance:     idx('Finance Company'),
    install:     idx('Installation Completion Date'),
    pipeline:    idx('Pipeline'),
    productSold: idx('Product Sold'),
    assist:      idx('Sales Rep Assist Trainee'),
    recruiter:   idx('Recruited By'),
    trainee:     idx('Trainee Sales'),
  }

  const rows: VentaRow[] = []
  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVLine(lines[i])
    const g = (col: number) => col >= 0 ? (f[col] ?? '').trim().replace(/^"|"$/g, '') : ''
    const name = g(c.name)
    if (!name) continue
    rows.push({
      salesTeamName:              name,
      salesRole:                  g(c.role),
      closingDate:                g(c.closing),
      cancellationDate:           g(c.cancelled),
      onHoldStatus:               g(c.onHold),
      financeCompany:             g(c.finance),
      installationCompletionDate: g(c.install),
      pipeline:                   g(c.pipeline),
      productSold:                g(c.productSold),
      salesRepAssistTrainee:      g(c.assist),
      recruitedBy:                g(c.recruiter),
      traineeSales:               g(c.trainee),
    })
  }
  return rows
}

// ── Sale classification helpers ───────────────────────────────────────────────

function isActive(row: VentaRow): boolean {
  return !row.cancellationDate && !row.onHoldStatus
}

function isCDBG(row: VentaRow): boolean {
  return row.financeCompany.toLowerCase() === 'cdbg'
}

function isWater(row: VentaRow): boolean {
  const p = (row.productSold + ' ' + row.pipeline).toLowerCase()
  return p.includes('water')
}

function isAnker(row: VentaRow): boolean {
  const p = (row.productSold + ' ' + row.pipeline).toLowerCase()
  return p.includes('pps') || p.includes('anker')
}

function isSolarRoofing(row: VentaRow): boolean {
  if (isWater(row) || isAnker(row)) return false
  const p = row.pipeline.toLowerCase()
  return p.includes('solar') || p.includes('roofing')
}

// ── Core metric calculation ───────────────────────────────────────────────────

export function calcMonthMetrics(
  rows: VentaRow[],
  nombre: string,
  year: number,
  month: number,
): MonthMetrics {
  const nameLower = nombre.toLowerCase()
  let solar = 0, cdbg = 0, water = 0, anker = 0, asistidas = 0

  for (const row of rows) {
    if (!isActive(row)) continue

    const isOwn      = row.salesTeamName.toLowerCase() === nameLower
    const isAssist   = row.salesRepAssistTrainee.toLowerCase() === nameLower
    const isRecruiter = row.recruitedBy.toLowerCase() === nameLower

    if (!isOwn && !isAssist && !isRecruiter) continue

    if (isCDBG(row)) {
      // CDBG: counted when installation completes
      if (isOwn) {
        const d = parseDate(row.installationCompletionDate)
        if (d && d.getFullYear() === year && d.getMonth() + 1 === month) cdbg++
      }
      continue
    }

    const d = parseDate(row.closingDate)
    if (!d || d.getFullYear() !== year || d.getMonth() + 1 !== month) continue

    if (isOwn) {
      if (isWater(row))       water++
      else if (isAnker(row))  anker++
      else if (isSolarRoofing(row)) solar++
    } else {
      // Employee assisted a trainee sale (as recruiter or sales assistant)
      // Only count if this is clearly a trainee-assisted sale
      const hasTraineeSales = !!row.traineeSales
      if (isAssist && hasTraineeSales) asistidas++
      if (isRecruiter && !row.salesRepAssistTrainee) asistidas++ // recruiter gets credit if no explicit assistant
    }
  }

  const total = solar + cdbg + water * 0.5 + anker * 0.5 + asistidas * 0.5
  const meta  = getMetaForMonth(month)
  return { year, month, solar, cdbg, water, anker, asistidas, total, meta, met: total >= meta }
}

// Build the last N months relative to today
export function getRecentMonths(n = 6): Array<{ year: number; month: number }> {
  const result = []
  const now = new Date()
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return result
}

// ── Comunicado logic ──────────────────────────────────────────────────────────

export function calcConsecutiveMisses(months: MonthMetrics[]): number {
  let count = 0
  for (let i = months.length - 1; i >= 0; i--) {
    if (!months[i].met) count++
    else break
  }
  return count
}

export function pendingComunicado(consecutive: number): ComunicadoPending {
  const status =
    consecutive >= 3 ? 'terminacion' :
    consecutive === 2 ? 'comunicado2' :
    consecutive === 1 ? 'comunicado1' : 'none'
  return { status, consecutive }
}
