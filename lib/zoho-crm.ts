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
      `${base}/Leads?fields=Owner,Converted,Created_Time&per_page=200&page=${page}`,
      { headers: { Authorization: `Zoho-oauthtoken ${token}` } }
    )
    if (!res.ok) break
    const json = await res.json()
    const records: any[] = json.data ?? []

    for (const r of records) {
      if (r.Created_Time && r.Created_Time >= monthStart) all.push(r)
    }

    // If the oldest record in this page is already before monthStart, we're done paginating
    if (!records.length || (records[records.length - 1].Created_Time ?? '') < monthStart) break
    if (!json.info?.more_records) break
    page++
  }

  return all
}

export async function getPromoterLeadStats(
  promoterEmails: string[]
): Promise<Map<string, PromoterLeadStats>> {
  const map = new Map<string, PromoterLeadStats>()
  if (!promoterEmails.length) return map

  const emailSet = new Set(promoterEmails.map(e => e.toLowerCase()))

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
    return map
  }

  for (const email of promoterEmails) {
    map.set(email.toLowerCase(), { leadsThisMonth: 0, leadsThisWeek: 0, ventasFromLeads: 0 })
  }

  for (const lead of leads) {
    const ownerEmail = (lead.Owner?.email ?? '').toLowerCase()
    if (!emailSet.has(ownerEmail)) continue

    const stat = map.get(ownerEmail)!
    stat.leadsThisMonth++

    const created = (lead.Created_Time ?? '').slice(0, 10)
    if (created >= weekAgo) stat.leadsThisWeek++
    if (lead.Converted === true) stat.ventasFromLeads++
  }

  return map
}
