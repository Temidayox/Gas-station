import { NextAuthOptions } from 'next-auth'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages:   { signIn: '/login' },
  secret:  process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        const user = await prisma.user.findUnique({
          where: { email: credentials.email.toLowerCase().trim() },
        })
        if (!user) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          outletId: user.outletId,   // keep as number or null — no coercion here
        } as any
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Store everything explicitly on first sign-in
        token.userId   = (user as any).id        // use userId to avoid collision with token.sub
        token.role     = (user as any).role
        token.outletId = (user as any).outletId  // number | null
        token.name     = user.name
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id       = token.userId  as string
        ;(session.user as any).role    = token.role    as string
        ;(session.user as any).outletId = token.outletId != null ? Number(token.outletId) : null
        session.user.name              = token.name    as string
      }
      return session
    },
  },
}

// ── getSessionUser — reads JWT directly, always has all custom fields ──────────
export async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return null
  
  const id = (token.userId ?? token.sub) as string   // fallback to sub if userId missing
  if (!id) return null

  return {
    id,
    role:     (token.role     ?? '') as string,
    outletId: token.outletId != null ? Number(token.outletId) : null,
    name:     (token.name     ?? '') as string,
    email:    (token.email    ?? '') as string,
  }
}
