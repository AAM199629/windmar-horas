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

    // Probe CustomModule33 (Sales Team module identified from Zoho URL)
    const [recRes, fieldsRes] = await Promise.all([
      fetch(`${base}/CustomModule33?per_page=2`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }),
      fetch(`${base}/settings/fields?module=CustomModule33`, {
        headers: { Authorization: `Zoho-oauthtoken ${token}` },
      }),
    ])

    const recData    = await recRes.json()
    const fieldsData = await fieldsRes.json()

    const fieldList = (fieldsData.fields ?? []).map((f: any) => ({
      label:    f.field_label,
      api_name: f.api_name,
      type:     f.data_type,
    }))

    // Also list all keys present in the first sample record
    const sampleKeys = (recData.data ?? []).map((r: any) => Object.keys(r))

    return NextResponse.json({
      module:          'CustomModule33',
      records_status:  recRes.status,
      fields_status:   fieldsRes.status,
      field_list:      fieldList,
      sample_keys:     sampleKeys,
      sample_records:  recData.data ?? [],
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
