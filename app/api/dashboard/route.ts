import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const weekStart  = new Date(Date.now() - 7 * 86400000)

  const outletWhere = user.role === 'OUTLET_STAFF' ? { id: parseInt(String(user.outletId)) } : {}

  const [outlets, rate] = await Promise.all([
    prisma.outlet.findMany({
      where: outletWhere,
      include: {
        transactions: {
          where: { createdAt: { gte: weekStart } },
          select: { naira: true, kg: true, isAnonymous: true, createdAt: true },
        },
      },
    }),
    prisma.priceRate.findFirst({ orderBy: { createdAt: 'desc' } }),
  ])

  const outletStats = outlets.map(o => {
    const todayTx = o.transactions.filter(t => new Date(t.createdAt) >= todayStart)
    const rev     = todayTx.reduce((s, t) => s + t.naira, 0)
    const kg      = todayTx.reduce((s, t) => s + t.kg, 0)
    const pct     = Math.min(100, Math.round((rev / o.dailyTarget) * 100))
    const weekData = Array.from({ length: 7 }, (_, i) => {
      const dayStart = new Date(Date.now() - (6 - i) * 86400000); dayStart.setHours(0,0,0,0)
      const dayEnd   = new Date(dayStart); dayEnd.setHours(23,59,59,999)
      return o.transactions.filter(t => { const d = new Date(t.createdAt); return d >= dayStart && d <= dayEnd }).reduce((s, t) => s + t.naira, 0)
    })
    const tankPct = Math.min(100, Math.round((o.tankCurrentKg / Math.max(o.tankCapacityKg, 1)) * 100))
    return {
      id: o.id, name: o.name, location: o.location, dailyTarget: o.dailyTarget,
      rev, kg, count: todayTx.length, pct, weekData,
      linked: todayTx.filter(t => !t.isAnonymous).length,
      tankCurrentKg: o.tankCurrentKg, tankCapacityKg: o.tankCapacityKg, tankPct,
    }
  })

  const totalRev    = outletStats.reduce((s, o) => s + o.rev, 0)
  const totalKg     = outletStats.reduce((s, o) => s + o.kg, 0)
  const totalCount  = outletStats.reduce((s, o) => s + o.count, 0)
  const totalLinked = outletStats.reduce((s, o) => s + o.linked, 0)

  return NextResponse.json({
    totalRev, totalKg, totalCount,
    anonPct: totalCount ? Math.round(((totalCount - totalLinked) / totalCount) * 100) : 0,
    outlets: outletStats,
    pricePerKg: rate?.pricePerKg ?? 1150,
  })
}
