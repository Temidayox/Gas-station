import { NextAuthOptions } from 'next-auth'
import { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from '@/lib/prisma'

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 2 * 60 * 60 }, // Reduced to 2 hours for security
  pages:   { signIn: '/login' },
  secret:  process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (!user.email) return false
      
      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { email: user.email.toLowerCase() },
      })
      
      if (!dbUser) {
        // Auto-register new users with role based on email
        let userRole = 'CUSTOMER'
        
        // Hardcode admin for specific email
        if (user.email.toLowerCase() === 'dtemidayo825@gmail.com') {
          userRole = 'ADMIN'
        }
        
        await prisma.user.create({
          data: {
            email: user.email.toLowerCase(),
            name: user.name || 'User',
            role: userRole,
            googleId: account?.providerAccountId,
            avatarUrl: user.image,
            // No password needed for OAuth
          },
        })
        return true
      }
      
      // Check if user is blocked or suspended
      if (dbUser.role === 'SUSPENDED') return false
      
      // Update Google ID and avatar if missing
      if (account?.providerAccountId && !dbUser.googleId) {
        await prisma.user.update({
          where: { id: dbUser.id },
          data: { 
            googleId: account.providerAccountId,
            avatarUrl: user.image,
          },
        })
      }
      
      return true
    },
    async jwt({ token, user, account }) {
      if (user && account) {
        // First time sign in
        token.userId = user.id
        token.email = user.email
        token.name = user.name
        token.picture = user.image
        
        // Get user role from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true, role: true, outletId: true },
        })
        
        if (dbUser) {
          token.role = dbUser.role
          token.outletId = dbUser.outletId
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        ;(session.user as any).id = token.userId as string
        ;(session.user as any).email = token.email as string
        ;(session.user as any).name = token.name as string
        ;(session.user as any).image = token.picture as string
        ;(session.user as any).role = token.role as string
        ;(session.user as any).outletId = token.outletId ? Number(token.outletId) : null
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // If user is admin, redirect to dashboard
      // This will be checked after successful sign-in
      return baseUrl
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
