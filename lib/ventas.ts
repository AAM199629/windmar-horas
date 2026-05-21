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
  solar: number      // Residential / Commercial Solar own sales (×1)
  roofing: number    // Roofing own sales                        (×1)
  cdbg: number       // CDBG installs by completion date         (×1)
  water: number      // Water products  (×0.5 each)
  anker: number      // Anker / PPS     (×0.5 each)
  asistidas: number  // assisted trainee sales                   (×0.5 each)
  total: number      // computed weighted total
  meta: number       // 5 (Apr–Sep) | 3 (Oct–Mar)
  met: boolean
  isGrace: boolean   // hire month + any month before hire → not counted toward comunicados
}

export interface ComunicadoPending {
  status: 'none' | 'comunicado1' | 'comunicado2' | 'terminacion'
  consecutive: number
}

// ── Date helpers ─────────────────────────────────────────────────────────────

const MONTH_NAMES: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

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
  // "Mon D, YYYY" (Smartsheet export format, e.g. "Mar 1, 2026")
  const m3 = t.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/)
  if (m3) {
    const mo = MONTH_NAMES[m3[1].toLowerCase()]
    if (mo) return new Date(parseInt(m3[3]), mo - 1, parseInt(m3[2]))
  }
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
    name:        idx('Sales Team Name'),
    role:        idx('Sales Role'),
    closing:     idx('Closing Date'),
    cancelled:   idx('Cancellation Date'),
    onHold:      idx('On Hold Status'),
    finance:     idx('Finance Company'),
    install:     idx('Installation Completion Date'),
    pipeline:    idx('Pipeline'),
    productSold: idx('Products Sold'),
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

function isSolar(row: VentaRow): boolean {
  if (isWater(row) || isAnker(row)) return false
  return row.pipeline.toLowerCase().includes('solar')
}

function isRoofing(row: VentaRow): boolean {
  if (isWater(row) || isAnker(row)) return false
  return row.pipeline.toLowerCase().includes('roofing')
}

// ── Core metric calculation ───────────────────────────────────────────────────

export function calcMonthMetrics(
  rows: VentaRow[],
  nombre: string,
  year: number,
  month: number,
  hireDate?: string | null,
): MonthMetrics {
  const meta = getMetaForMonth(month)

  // Grace: hire month, all months before, AND the first full month after hire
  let isGrace = false
  if (hireDate) {
    const hire = parseDate(hireDate)
    if (hire) {
      const hy = hire.getFullYear()
      const hm = hire.getMonth() + 1
      const graceEndYear  = hm === 12 ? hy + 1 : hy
      const graceEndMonth = hm === 12 ? 1      : hm + 1
      if (year < graceEndYear || (year === graceEndYear && month <= graceEndMonth)) {
        isGrace = true
      }
    }
  }

  const nameLower  = nombre.toLowerCase()
  const hireParsed = hireDate ? parseDate(hireDate) : null
  let solar = 0, roofing = 0, cdbg = 0, water = 0, anker = 0, asistidas = 0

  for (const row of rows) {
    if (!isActive(row)) continue

    const isOwn    = row.salesTeamName.toLowerCase() === nameLower
    const isAssist = row.salesRepAssistTrainee.toLowerCase() === nameLower

    if (!isOwn && !isAssist) continue

    if (isCDBG(row)) {
      if (isOwn) {
        const d = parseDate(row.installationCompletionDate)
        if (d && d.getFullYear() === year && d.getMonth() + 1 === month) {
          if (!hireParsed || d >= hireParsed) cdbg++
        }
      }
      continue
    }

    const d = parseDate(row.closingDate)
    if (!d || d.getFullYear() !== year || d.getMonth() + 1 !== month) continue
    if (hireParsed && d < hireParsed) continue

    if (isOwn) {
      if (isWater(row))        water++
      else if (isAnker(row))   anker++
      else if (isSolar(row))   solar++
      else if (isRoofing(row)) roofing++
    } else if (isAssist) {
      const TRAINEE_RANKS = new Set(['1st sale', '2nd sale', '3rd sale', '4th sale'])
      if (TRAINEE_RANKS.has((row.traineeSales ?? '').toLowerCase())) asistidas++
    }
  }

  const total = solar + roofing + cdbg + water * 0.5 + anker * 0.5 + asistidas * 0.5
  return { year, month, solar, roofing, cdbg, water, anker, asistidas, total, meta, met: isGrace || total >= meta, isGrace }
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
    if (months[i].isGrace) break  // reached grace/pre-hire period — stop counting
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

export function monthsAsAsalariado(hireDate: string | null): number | null {
  if (!hireDate) return null
  const hire = parseDate(hireDate)
  if (!hire) return null
  const now = new Date()
  const months = (now.getFullYear() - hire.getFullYear()) * 12 + (now.getMonth() - hire.getMonth())
  return Math.max(0, months)
}
