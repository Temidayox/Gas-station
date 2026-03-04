import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const rate = await prisma.priceRate.findFirst({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(
    { pricePerKg: rate?.pricePerKg ?? 1150 },
    { headers: { 'Cache-Control': 'public, s-maxage=10, stale-while-revalidate=30' } }
  )
}
