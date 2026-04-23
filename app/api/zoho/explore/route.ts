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

// GET /api/zoho/explore?module=Sales_Team_Members
// Discovers available modules and fields for a given module name
export async function GET(req: Request) {
  const session = await auth()
  if ((session?.user as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const moduleName = searchParams.get('module')

  try {
    const token = await getZohoAccessToken()
    const dc    = process.env.ZOHO_DATA_CENTER ?? 'zohoapis.com'
    const base  = `https://www.${dc}/crm/v7`

    if (moduleName) {
      // Get fields via settings endpoint
      const fieldsRes  = await fetch(`${base}/settings/fields?module=${moduleName}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      })
      const fieldsData = await fieldsRes.json()

      // Also fetch first record to see sample data
      const recRes  = await fetch(`${base}/${moduleName}?per_page=2`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      })
      const recData = await recRes.json()

      // Extract field names + api_names from the response
      const fieldList = (fieldsData.fields ?? []).map((f: any) => ({
        label:    f.field_label,
        api_name: f.api_name,
        type:     f.data_type,
      }))

      return NextResponse.json({
        module:         moduleName,
        fields_status:  fieldsRes.status,
        field_list:     fieldList,
        fields_raw:     fieldsData,
        records_status: recRes.status,
        sample_records: recData,
      })
    }

    // No module specified — probe likely Sales Team module names directly
    const candidates = [
      'Sales_Team_Members',
      'Sales_Team',
      'Team_Members',
      'SalesTeam',
      'Vendedores',
      'Equipo_de_Ventas',
    ]

    const results: Record<string, any> = {}
    await Promise.all(candidates.map(async (name) => {
      const r = await fetch(`${base}/${name}?per_page=1`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      })
      const d = await r.json()
      results[name] = { status: r.status, code: d.code ?? null, data_count: (d.data ?? []).length }
    }))

    // Also try the settings/modules endpoint (may fail if scope is limited)
    const modulesRes  = await fetch(`${base}/settings/modules`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const modulesRaw = await modulesRes.json()

    return NextResponse.json({
      probe_results:   results,
      settings_modules_status: modulesRes.status,
      settings_modules_raw:    modulesRaw,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
