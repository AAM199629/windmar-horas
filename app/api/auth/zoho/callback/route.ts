import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code')
  if (!code) {
    return new NextResponse('No code received from Zoho', { status: 400 })
  }

  const clientId     = process.env.ZOHO_CLIENT_ID!
  const clientSecret = process.env.ZOHO_CLIENT_SECRET!
  const redirectUri  = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/zoho/callback`

  const res = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      client_secret: clientSecret,
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  const data = await res.json()

  if (!data.refresh_token) {
    return new NextResponse(
      `Error: ${JSON.stringify(data, null, 2)}`,
      { status: 400, headers: { 'Content-Type': 'text/plain' } }
    )
  }

  return new NextResponse(
    `✅ OAuth completado\n\nCopia este valor en tu .env.local y en Vercel:\n\nZOHO_REFRESH_TOKEN=${data.refresh_token}`,
    { headers: { 'Content-Type': 'text/plain' } }
  )
}
