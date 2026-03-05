import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateMultipleCylinderCodes } from '@/lib/cylinderGenerator'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const cylinders = await prisma.cylinder.findMany({
    include: { owner: { select: { name: true, email: true, phone: true } } },
    orderBy: { id: 'asc' },
  })
  return NextResponse.json(cylinders)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { count } = await req.json()
  const qty = Math.min(Math.max(parseInt(count) || 1, 1), 50)

  // Generate secure random alphanumeric codes
  const newCodes = generateMultipleCylinderCodes(qty)

  const created = []
  for (const code of newCodes) {
    // size=0 means unassigned — actual cylinder size recorded at first fill
    created.push(await prisma.cylinder.create({ 
      data: { id: code, size: 0, isLinked: false } 
    }))
  }

  return NextResponse.json({ created, count: created.length })
}
