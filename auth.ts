import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { Redis } from '@upstash/redis'
import { compare } from 'bcryptjs'

const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
})

export interface AppUser {
  id: string
  email: string
  name: string
  passwordHash: string
  role: 'admin' | 'viewer'
}

async function getUser(email: string): Promise<AppUser | null> {
  const raw = await redis.get<string>(`horas:user:${email.toLowerCase()}`)
  if (!raw) return null
  return typeof raw === 'string' ? JSON.parse(raw) : raw as AppUser
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email:    { label: 'Email',      type: 'email' },
        password: { label: 'Contraseña', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await getUser(credentials.email as string)
        if (!user) return null
        const valid = await compare(credentials.password as string, user.passwordHash)
        if (!valid) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role } as any
      },
    }),
  ],
  pages: {
    signIn: '/login',
  },
  session: { strategy: 'jwt' },
  secret: process.env.AUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) (token as any).role = (user as any).role
      return token
    },
    async session({ session, token }) {
      if (session.user) (session.user as any).role = (token as any).role
      return session
    },
  },
})
