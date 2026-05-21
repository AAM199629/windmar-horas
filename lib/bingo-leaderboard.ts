import { getRedshiftPool } from './redshift'
import { listWeekKeys, getWeeklyReport } from './kv'
import type { DayShiftSummary } from './types'

const ALLOWED_ROLES = [
  'Consultor',
  'Empleado - Consultor',
  'Lider',
  'Empleado - Lider',
  'Gerente',
  'Empleado - Gerente',
  'Trainee',
]

async function getAllowedEmails(): Promise<Set<string>> {
  const pool = getRedshiftPool()
  const placeholders = ALLOWED_ROLES.map((_, i) => `$${i + 1}`).join(', ')
  const { rows } = await pool.query<{ email: string }>(
    `SELECT LOWER(email) as email FROM dw_zoho.dim_sales_team_member
     WHERE email IS NOT NULL AND email <> '' AND sales_role IN (${placeholders})`,
    ALLOWED_ROLES,
  )
  return new Set(rows.map(r => r.email))
}

export interface BingoLBRow {
  email: string
  name: string
  board: boolean[]   // 25 elements — board[12] = FREE center
  lines: number
  completed: number  // 0-24, excludes FREE
  earned: number
}

// 5 rows + 5 cols + 2 diagonals
const BINGO_LINES: number[][] = [
  [0,1,2,3,4], [5,6,7,8,9], [10,11,12,13,14], [15,16,17,18,19], [20,21,22,23,24],
  [0,5,10,15,20], [1,6,11,16,21], [2,7,12,17,22], [3,8,13,18,23], [4,9,14,19,24],
  [0,6,12,18,24], [4,8,12,16,20],
]

const LINE_PRIZE = 175
const FULL_PRIZE = 700

// Challenge index → board index (board[12] is FREE, so challenges ≥12 shift by 1)
const bi = (challengeIdx: number) => challengeIdx < 12 ? challengeIdx : challengeIdx + 1

interface DealRow {
  email: string
  fullName: string
  leadSource: string | null
  closingDate: string // YYYY-MM-DD
}

async function getDealsForMonth(firstDay: string, lastDay: string): Promise<DealRow[]> {
  const pool = getRedshiftPool()
  const { rows } = await pool.query(`
    SELECT
      LOWER(ds.sale_rep_email)                       AS email,
      COALESCE(stm.full_name, ds.sale_rep_email)      AS full_name,
      LOWER(dms.lead_source)                          AS lead_source,
      TO_CHAR(fd.closing_date, 'YYYY-MM-DD')          AS closing_date
    FROM dwh.fact_deals fd
    JOIN dwh.dim_staff ds
      ON ds.id_staff = fd.id_staff AND ds.is_current = true
    JOIN dwh.dim_status_reason dsr
      ON dsr.id_status_reason = fd.id_status_reason AND dsr.is_current = true
    LEFT JOIN dwh.dim_marketing_source dms
      ON dms.id_marketing_source = fd.id_marketing_source
    LEFT JOIN dw_zoho.dim_sales_team_member stm
      ON LOWER(stm.email) = LOWER(ds.sale_rep_email)
    WHERE fd.closing_date >= $1
      AND fd.closing_date <= $2
      AND dsr.stage <> 'Cancelled'
      AND ds.sale_rep_email IS NOT NULL
      AND ds.sale_rep_email <> ''
  `, [firstDay, lastDay])

  return rows.map((r: any) => ({
    email:       r.email as string,
    fullName:    r.full_name as string,
    leadSource:  r.lead_source ?? null,
    closingDate: r.closing_date as string,
  }))
}

type TaggedShift = { shift: DayShiftSummary; weekKey: string }

async function getShiftsForMonth(
  firstDay: string,
  lastDay: string
): Promise<Map<string, TaggedShift[]>> {
  const weekKeys = await listWeekKeys()
  const reports  = await Promise.all(weekKeys.map(k => getWeeklyReport(k)))
  const map      = new Map<string, TaggedShift[]>()

  for (let i = 0; i < weekKeys.length; i++) {
    const report = reports[i]
    if (!report) continue
    if (report.weekEnd < firstDay || report.weekStart > lastDay) continue

    const weekKey = weekKeys[i]
    for (const emp of report.employees) {
      const email = emp.email.toLowerCase()
      if (!map.has(email)) map.set(email, [])
      for (const shift of emp.shifts) {
        if (shift.date >= firstDay && shift.date <= lastDay) {
          map.get(email)!.push({ shift, weekKey })
        }
      }
    }
  }
  return map
}

function isoWeekKey(dateStr: string): string {
  const d   = new Date(dateStr + 'T12:00:00')
  const day = d.getDay() || 7
  const thu = new Date(d)
  thu.setDate(d.getDate() - day + 4)
  const yearStart = new Date(thu.getFullYear(), 0, 1)
  const wn = Math.ceil(((thu.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  return `${thu.getFullYear()}-W${String(wn).padStart(2, '0')}`
}

function applyDealChallenges(board: boolean[], deals: DealRow[]): void {
  if (!deals.length) return

  const byDay  = new Map<string, number>()
  const byWeek = new Map<string, number>()
  let canvassing = 0, boothEvento = 0, boothHD = 0, lightReach = false

  for (const d of deals) {
    byDay.set(d.closingDate, (byDay.get(d.closingDate) ?? 0) + 1)
    const wk = isoWeekKey(d.closingDate)
    byWeek.set(wk, (byWeek.get(wk) ?? 0) + 1)

    const ls = d.leadSource ?? ''
    if (ls === 'canvassing')                                   canvassing++
    if (ls === 'booths (malls)' || ls === 'booth peq & evento') boothEvento++
    if (ls === 'booths (malls)' || ls === 'home depot')         boothHD++
    if (ls.includes('light'))                                  lightReach = true
  }

  if ([...byWeek.values()].some(n => n >= 5))  board[bi(0)]  = true // 🏠 5 ventas/semana
  if ([...byDay.values()].some(n => n >= 3))   board[bi(3)]  = true // 🔥 3 ventas/día
  if (lightReach)                              board[bi(5)]  = true // 💡 LightReach
  if (canvassing  >= 3)                        board[bi(11)] = true // 🚶 3 canvassing
  if (boothEvento >= 3)                        board[bi(18)] = true // 🛒 3 booth/evento
  if (boothHD     >= 3)                        board[bi(22)] = true // 🏅 3 booth/HD
}

function isHD(shift: DayShiftSummary): boolean {
  const loc  = (shift.location  ?? '').toLowerCase()
  const type = (shift.shiftType ?? '').toLowerCase()
  const name = (shift.shiftName ?? '').toLowerCase()
  return loc.includes('home depot') || type.includes('home depot') || name.includes('home depot')
}

function applyShiftChallenges(board: boolean[], tagged: TaggedShift[]): void {
  if (!tagged.length) return

  const byWeek = new Map<string, DayShiftSummary[]>()
  for (const { shift, weekKey } of tagged) {
    if (!byWeek.has(weekKey)) byWeek.set(weekKey, [])
    byWeek.get(weekKey)!.push(shift)
  }

  // 🏬 [6] 2 fines de semana corridos en Booth Malls
  const mallWeekendWeeks = [...byWeek.entries()]
    .filter(([, ss]) => ss.some(s =>
      s.canal === 'mall' && (s.dayOfWeek === 0 || s.dayOfWeek === 6) && s.shiftStatus === 'Completed'
    ))
    .map(([wk]) => wk)
    .sort()

  for (let i = 0; i < mallWeekendWeeks.length - 1; i++) {
    const [y1, w1] = mallWeekendWeeks[i].split('-W').map(Number)
    const [y2, w2] = mallWeekendWeeks[i + 1].split('-W').map(Number)
    if ((y1 === y2 && w2 === w1 + 1) || (y2 === y1 + 1 && w1 >= 52 && w2 === 1)) {
      board[bi(6)] = true
      break
    }
  }

  // 🏪 [7] 1 domingo en HD
  if (tagged.some(({ shift: s }) =>
    s.shiftStatus === 'Completed' && s.dayOfWeek === 0 && isHD(s)
  )) board[bi(7)] = true

  for (const [, ss] of byWeek) {
    const done = ss.filter(s => s.shiftStatus === 'Completed')

    // 🚶 [10] 3 cambaceos en semana
    if (!board[bi(10)] && done.filter(s => s.canal === 'cambaceo').length >= 3)
      board[bi(10)] = true

    // ✅ [12] Ponches perfectos (no Missed en ningún turno de la semana)
    if (!board[bi(12)]) {
      const relevant = ss.filter(s => s.shiftStatus === 'Completed' || s.shiftStatus === 'Missed')
      if (relevant.length > 0 && relevant.every(s => s.shiftStatus === 'Completed'))
        board[bi(12)] = true
    }

    // 🎯 [13] 3 canales en semana
    if (!board[bi(13)]) {
      const canals = new Set(done.filter(s => s.canal).map(s => s.canal))
      if (canals.size >= 3) board[bi(13)] = true
    }

    // 🌙 [14] 2 turnos 4-9pm en semana
    if (!board[bi(14)] && done.filter(s => s.startTime >= '16:00' && s.startTime < '21:00').length >= 2)
      board[bi(14)] = true
  }
}

function computeLines(board: boolean[]): number {
  return BINGO_LINES.filter(line => line.every(i => board[i])).length
}

function initialBoard(): boolean[] {
  const b = new Array<boolean>(25).fill(false)
  b[12] = true // FREE
  return b
}

export async function computeBingoLeaderboard(month: string): Promise<BingoLBRow[]> {
  const [year, mm] = month.split('-')
  const lastDayNum = new Date(Number(year), Number(mm), 0).getDate()
  const firstDay   = `${year}-${mm}-01`
  const lastDay    = `${year}-${mm}-${String(lastDayNum).padStart(2, '0')}`

  const [deals, shiftsMap, allowedEmails] = await Promise.all([
    getDealsForMonth(firstDay, lastDay).catch(() => [] as DealRow[]),
    getShiftsForMonth(firstDay, lastDay).catch(() => new Map<string, TaggedShift[]>()),
    getAllowedEmails().catch(() => new Set<string>()),
  ])

  // Build rep registry from deals filtered by allowed sales roles
  const repNames = new Map<string, string>()
  for (const d of deals) {
    if (allowedEmails.size === 0 || allowedEmails.has(d.email)) repNames.set(d.email, d.fullName)
  }

  const dealsByRep = new Map<string, DealRow[]>()
  for (const d of deals) {
    if (!dealsByRep.has(d.email)) dealsByRep.set(d.email, [])
    dealsByRep.get(d.email)!.push(d)
  }

  const rows: BingoLBRow[] = []

  for (const [email, name] of repNames) {
    const board = initialBoard()
    applyDealChallenges(board, dealsByRep.get(email) ?? [])
    applyShiftChallenges(board, shiftsMap.get(email) ?? [])

    const lines     = computeLines(board)
    const completed = board.filter((v, i) => v && i !== 12).length
    const earned    = lines * LINE_PRIZE + (completed === 24 ? FULL_PRIZE : 0)

    rows.push({ email, name, board, lines, completed, earned })
  }

  return rows.sort((a, b) => b.completed - a.completed || b.lines - a.lines)
}
