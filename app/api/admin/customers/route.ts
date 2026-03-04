import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const customers = await prisma.user.findMany({
    where: { role: 'CUSTOMER' },
    include: { cylinders: { select: { id: true, size: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Get aggregate spend per customer
  const result = await Promise.all(customers.map(async c => {
    const cylIds = c.cylinders.map(x => x.id)
    const agg = await prisma.transaction.aggregate({
      where: { cylinderId: { in: cylIds } },
      _sum: { naira: true, kg: true },
      _count: { id: true },
    })
    return {
      id: c.id, name: c.name, email: c.email, phone: c.phone,
      cylinders: c.cylinders,
      totalSpend: agg._sum.naira ?? 0,
      totalKg:    agg._sum.kg ?? 0,
      refillCount: agg._count.id,
    }
  }))

  return NextResponse.json(result)
}
