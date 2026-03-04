import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const outletId = user.outletId ? Number(user.outletId) : null
  if (!outletId) return NextResponse.json({ error: 'No outlet assigned' }, { status: 400 })

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0)

  // Single targeted query - only this outlet, only today
  const [outlet, todayTxs, rate] = await Promise.all([
    prisma.outlet.findUnique({ where: { id: outletId } }),
    prisma.transaction.findMany({
      where: { outletId, createdAt: { gte: todayStart } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
    prisma.priceRate.findFirst({ orderBy: { createdAt: 'desc' } }),
  ])

  if (!outlet) return NextResponse.json({ error: 'Outlet not found' }, { status: 404 })

  const rev   = todayTxs.reduce((s, t) => s + t.naira, 0)
  const kg    = todayTxs.reduce((s, t) => s + t.kg, 0)
  const linked = todayTxs.filter(t => !t.isAnonymous).length
  const pct   = Math.min(100, Math.round((rev / outlet.dailyTarget) * 100))

  return NextResponse.json({
    outletId,
    outletName: outlet.name,
    dailyTarget: outlet.dailyTarget,
    rev, kg,
    count: todayTxs.length,
    linked, pct,
    pricePerKg: rate?.pricePerKg ?? 1150,
    transactions: todayTxs,
  })
}
