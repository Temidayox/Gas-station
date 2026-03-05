import { NextAuthOptions } from 'next-auth'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 },
  pages:   { signIn: '/login' },
  secret:  process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
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
        if (!user || !user.password) return null
        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) return null
        return {
          id:       user.id,
          email:    user.email,
          name:     user.name,
          role:     user.role,
          outletId: user.outletId,
        } as any
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      if (account?.provider === 'google') {
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email.toLowerCase() },
        })
        if (!dbUser) {
          const role = user.email.toLowerCase() === 'dtemidayo825@gmail.com' ? 'ADMIN' : 'CUSTOMER'
          try {
            await prisma.user.create({
              data: {
                email:     user.email.toLowerCase(),
                name:      user.name || 'User',
                role,
                googleId:  account.providerAccountId,
                avatarUrl: user.image,
              },
            })
          } catch { return false }
        } else {
          if (!dbUser.googleId) {
            await prisma.user.update({
              where: { id: dbUser.id },
              data: { googleId: account.providerAccountId, avatarUrl: user.image },
            })
          }
        }
      }
      return true
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        const dbUser = await prisma.user.findUnique({
          where: { email: (user.email ?? token.email) as string },
          select: { id: true, role: true, outletId: true, name: true },
        })
        if (dbUser) {
          token.userId   = dbUser.id
          token.role     = dbUser.role
          token.outletId = dbUser.outletId
          token.name     = dbUser.name
        }
        token.email   = user.email
        token.picture = user.image
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as any).id       = token.userId as string
        ;(session.user as any).email    = token.email  as string
        ;(session.user as any).name     = token.name   as string
        ;(session.user as any).image    = token.picture as string
        ;(session.user as any).role     = token.role   as string
        ;(session.user as any).outletId = token.outletId ? Number(token.outletId) : null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      return baseUrl
    },
  },
}

export async function getSessionUser(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET })
  if (!token) return null
  const id = (token.userId ?? token.sub) as string
  if (!id) return null
  return {
    id,
    role:     (token.role     ?? '') as string,
    outletId: token.outletId != null ? Number(token.outletId) : null,
    name:     (token.name     ?? '') as string,
    email:    (token.email    ?? '') as string,
  }
}
