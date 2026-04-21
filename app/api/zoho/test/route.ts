import { NextResponse } from 'next/server'
import { auth } from '@/auth'

async function getZohoAccessToken(): Promise<string> {
  const res = await fetch(`https://accounts.zoho.com/oauth/v2/token`, {
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

// GET /api/zoho/test — lists modules and first 5 records of Deals
export async function GET() {
  const session = await auth()
  const role = (session?.user as any)?.role
  if (!session || role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Check env vars are present
  const envCheck = {
    ZOHO_CLIENT_ID:     !!process.env.ZOHO_CLIENT_ID,
    ZOHO_CLIENT_SECRET: !!process.env.ZOHO_CLIENT_SECRET,
    ZOHO_REFRESH_TOKEN: !!process.env.ZOHO_REFRESH_TOKEN,
    ZOHO_DATA_CENTER:   process.env.ZOHO_DATA_CENTER ?? '(not set, using zohoapis.com)',
  }

  try {
    const token = await getZohoAccessToken()
    const dc    = process.env.ZOHO_DATA_CENTER ?? 'zohoapis.com'
    const base  = `https://www.${dc}/crm/v7`

    // Try fetching 3 Deals records to verify access
    const dealsRes  = await fetch(`${base}/Deals?per_page=3`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const dealsRaw  = await dealsRes.json()
    const dealSample = (dealsRaw.data ?? []).map((d: any) => Object.keys(d))

    // Also try a custom module search
    const searchRes  = await fetch(`${base}/Deals/search?criteria=(Stage:equals:Closed Won)&per_page=3`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const searchRaw = await searchRes.json()

    return NextResponse.json({
      envCheck,
      deals_status: dealsRes.status,
      deals_raw:    dealsRaw,
      deal_fields_sample: dealSample[0] ?? [],
      search_status: searchRes.status,
      search_raw:   searchRaw,
    })
  } catch (err: any) {
    return NextResponse.json({ envCheck, error: err.message }, { status: 500 })
  }
}
