import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
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

  // Find highest existing ID number
  const all = await prisma.cylinder.findMany({ select: { id: true } })
  const maxNum = all.reduce((max, c) => {
    const n = parseInt(c.id.replace('GS', ''))
    return isNaN(n) ? max : Math.max(max, n)
  }, 0)

  const created = []
  for (let i = 0; i < qty; i++) {
    const id = `GS${String(maxNum + i + 1).padStart(5, '0')}`
    // size=0 means unassigned — actual cylinder size recorded at first fill
    created.push(await prisma.cylinder.create({ data: { id, size: 0, isLinked: false } }))
  }

  return NextResponse.json({ created, count: created.length })
}
