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
      // Get fields for the specified module
      const fieldsRes  = await fetch(`${base}/settings/fields?module=${moduleName}`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      })
      const fieldsData = await fieldsRes.json()

      // Also fetch first record to see sample data
      const recRes  = await fetch(`${base}/${moduleName}?per_page=3`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      })
      const recData = await recRes.json()

      return NextResponse.json({
        module:       moduleName,
        fields_status: fieldsRes.status,
        fields:       fieldsData,
        records_status: recRes.status,
        sample_records: recData,
      })
    }

    // No module specified — list all modules to find Sales Team
    const modulesRes  = await fetch(`${base}/settings/modules`, {
      headers: { Authorization: `Zoho-oauthtoken ${token}` },
    })
    const modulesData = await modulesRes.json()

    const modules = (modulesData.modules ?? []).map((m: any) => ({
      api_name:    m.api_name,
      module_name: m.module_name,
      plural_label: m.plural_label,
    }))

    // Filter to likely candidates
    const salesRelated = modules.filter((m: any) =>
      m.api_name?.toLowerCase().includes('sales') ||
      m.plural_label?.toLowerCase().includes('sales') ||
      m.module_name?.toLowerCase().includes('sales') ||
      m.api_name?.toLowerCase().includes('team') ||
      m.plural_label?.toLowerCase().includes('team')
    )

    return NextResponse.json({
      total_modules: modules.length,
      sales_related_modules: salesRelated,
      all_modules: modules,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
