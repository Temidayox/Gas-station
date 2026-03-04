import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results: any = {
    env: {
      NODE_ENV: process.env.NODE_ENV,
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET (' + process.env.NEXTAUTH_SECRET.length + ' chars)' : 'MISSING',
      DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
      DIRECT_URL: process.env.DIRECT_URL ? 'SET' : 'MISSING',
    },
    db: null,
    error: null,
  }
  try {
    const count = await prisma.user.count()
    const users = await prisma.user.findMany({ select: { email: true, role: true } })
    results.db = { connected: true, userCount: count, users }
  } catch (e: any) {
    results.error = e.message
    results.db = { connected: false }
  }
  return NextResponse.json(results)
}
