import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getActivePromotores } from '@/lib/redshift'
import { getFollowUpFromRedshift } from '@/lib/redshift'
import { getRedshiftPool } from '@/lib/redshift'

export const dynamic = 'force-dynamic'

async function getZohoAccessToken(): Promise<string> {
  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: process.env.ZOHO_REFRESH_TOKEN!,
      client_id:     process.env.ZOHO_CLIENT_ID!,
      client_secret: process.env.ZOHO_CLIENT_SECRET!,
      grant_type:    'refresh_token',
    }),
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result: Record<string, any> = {}

  // 1. What sales roles exist in Redshift?
  try {
    const pool = getRedshiftPool()
    const { rows } = await pool.query(`
      SELECT sales_role, COUNT(*) as cnt
      FROM dw_zoho.dim_sales_team_member
      WHERE email IS NOT NULL
      GROUP BY sales_role
      ORDER BY cnt DESC
      LIMIT 30
    `)
    result.allRoles = rows
  } catch (e: any) {
    result.allRolesError = e.message
  }

  // 2. Active promotores from our query
  try {
    const promotores = await getActivePromotores()
    result.promotores = promotores.slice(0, 10)
    result.promotoresCount = promotores.length
  } catch (e: any) {
    result.promotoresError = e.message
  }

  // 3. Sample of followUpFromRedshift
  try {
    const fu = await getFollowUpFromRedshift()
    const entries = [...fu.entries()].slice(0, 10).map(([k, v]) => ({ key: k, ...v }))
    result.followUpSample = entries
    result.followUpSize = fu.size
  } catch (e: any) {
    result.followUpError = e.message
  }

  // 4. Check if promotores appear in fact_sales_performance
  try {
    const promotores = await getActivePromotores()
    const emails = promotores.map(p => p.email)
    const pool2 = getRedshiftPool()
    const { rows: spRows } = await pool2.query(`
      SELECT LOWER(stm.email) AS email, stm.full_name,
             sp.num_leads_creados AS leads, sp.num_citas AS citas,
             sp.modified_time
      FROM dw_zoho.fact_sales_performance sp
      JOIN dw_zoho.dim_sales_team_member stm ON stm.member_id = sp.member_id
      WHERE LOWER(stm.email) = ANY($1)
      ORDER BY sp.modified_time DESC
      LIMIT 20
    `, [emails])
    result.promotoresInSalesPerf = spRows
    result.promotoresInSalesPerfCount = spRows.length
  } catch (e: any) {
    result.promotoresInSalesPerfError = e.message
  }

  // 5. Zoho Leads test
  try {
    const token = await getZohoAccessToken()
    result.zohoTokenOk = true
    const dc   = process.env.ZOHO_DATA_CENTER ?? 'zohoapis.com'
    const base = `https://www.${dc}/crm/v7`

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)

    const res = await fetch(`${base}/Leads?fields=Owner,Converted,Created_Time,Sales_Rep,Sales_Rep_Email&per_page=5`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const json = await res.json()
    result.zohoLeadsStatus = res.status
    result.zohoLeadsRaw = json   // full raw response to catch errors
    result.zohoLeadsSample = (json.data ?? []).map((r: any) => ({
      ownerEmail:    r.Owner?.email,
      ownerName:     r.Owner?.name,
      salesRepEmail: r.Sales_Rep_Email,
      salesRep:      r.Sales_Rep,
      converted:     r.Converted,
      created:       r.Created_Time,
    }))
    result.zohoLeadsInfo = json.info
    result.monthStart = monthStart
  } catch (e: any) {
    result.zohoError = e.message
  }

  return NextResponse.json(result, { status: 200 })
}
