import { NextResponse } from 'next/server'

export async function GET() {
  const clientId    = process.env.ZOHO_CLIENT_ID!
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/zoho/callback`

  const url = `https://accounts.zoho.com/oauth/v2/auth?` +
    `scope=ZohoCRM.modules.ALL&` +
    `client_id=${clientId}&` +
    `response_type=code&` +
    `access_type=offline&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}`

  return NextResponse.redirect(url)
}
