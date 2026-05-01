export interface PromoterLeadStats {
  leadsThisMonth: number
  leadsThisWeek: number
  ventasFromLeads: number
}

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
  if (!data.access_token) throw new Error(`Zoho token error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function fetchAllLeadsForMonth(token: string, monthStart: string): Promise<any[]> {
  const dc   = process.env.ZOHO_DATA_CENTER ?? 'zohoapis.com'
  const base = `https://www.${dc}/crm/v7`

  const all: any[] = []
  let page = 1

  while (true) {
    const res = await fetch(
      `${base}/Leads?fields=Owner,Converted,Created_Time,Sales_Rep,Sales_Rep_Email&per_page=200&page=${page}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    )
    if (!res.ok) break
    const json = await res.json()
    const records: any[] = json.data ?? []

    for (const r of records) {
      if (r.Created_Time && r.Created_Time >= monthStart) all.push(r)
    }

    if (!records.length || (records[records.length - 1].Created_Time ?? '') < monthStart) break
    if (!json.info?.more_records) break
    page++
  }

  return all
}

export async function getPromoterLeadStats(
  promoters: Array<{ email: string; name: string }>
): Promise<Map<string, PromoterLeadStats>> {
  const map = new Map<string, PromoterLeadStats>()
  if (!promoters.length) return map

  // Build lookup by email AND by normalized name → canonical email key
  const emailMap = new Map<string, string>() // normalized owner email → promotor email
  const nameMap  = new Map<string, string>() // normalized owner name  → promotor email

  for (const p of promoters) {
    const key = p.email.toLowerCase()
    map.set(key, { leadsThisMonth: 0, leadsThisWeek: 0, ventasFromLeads: 0 })
    emailMap.set(key, key)
    nameMap.set(p.name.toLowerCase(), key)
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString().slice(0, 10)
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  let leads: any[] = []
  try {
    const token = await getZohoAccessToken()
    leads = await fetchAllLeadsForMonth(token, monthStart)
  } catch {
    return new Map() // empty = UI shows "—" instead of 0 when Zoho is unavailable
  }

  for (const lead of leads) {
    // Match by Sales_Rep_Email first (promotor is the Sales Rep, not the Owner)
    const salesRepEmail = (lead.Sales_Rep_Email ?? '').toLowerCase()
    const salesRepName  = (lead.Sales_Rep?.name ?? lead.Sales_Rep ?? '').toLowerCase()
    const ownerEmail    = (lead.Owner?.email ?? '').toLowerCase()
    const ownerName     = (lead.Owner?.name  ?? '').toLowerCase()

    const key = emailMap.get(salesRepEmail)
             ?? nameMap.get(salesRepName)
             ?? emailMap.get(ownerEmail)
             ?? nameMap.get(ownerName)
    if (!key) continue

    const stat = map.get(key)!
    stat.leadsThisMonth++

    const created = (lead.Created_Time ?? '').slice(0, 10)
    if (created >= weekAgo) stat.leadsThisWeek++
    if (lead.Converted === true) stat.ventasFromLeads++
  }

  return map
}
