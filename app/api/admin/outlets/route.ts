import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const todayStart = new Date(); todayStart.setHours(0,0,0,0)
  const weekStart  = new Date(Date.now() - 7 * 86400000)

  const outlets = await prisma.outlet.findMany({
    orderBy: { id: 'asc' },
    include: {
      staff: { select: { id: true, name: true, email: true, role: true } },
      tankRefills: { orderBy: { createdAt: 'desc' }, take: 5, include: { staff: { select: { name: true } } } },
      transactions: {
        where: { createdAt: { gte: weekStart } },
        select: { naira: true, kg: true, isAnonymous: true, createdAt: true, paymentMethod: true },
      },
    },
  })

  const result = outlets.map(o => {
    const todayTx = o.transactions.filter(t => new Date(t.createdAt) >= todayStart)
    const rev   = todayTx.reduce((s, t) => s + t.naira, 0)
    const kg    = todayTx.reduce((s, t) => s + t.kg, 0)
    const weekData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(Date.now() - (6-i)*86400000); d.setHours(0,0,0,0)
      const e = new Date(d); e.setHours(23,59,59,999)
      return o.transactions.filter(t => { const td = new Date(t.createdAt); return td >= d && td <= e }).reduce((s,t) => s+t.naira, 0)
    })
    const tankPct = Math.min(100, Math.round((o.tankCurrentKg / Math.max(o.tankCapacityKg,1)) * 100))
    const payTotals = { CASH: 0, TRANSFER: 0, POS_TERMINAL: 0 }
    todayTx.forEach(t => { const k = t.paymentMethod as keyof typeof payTotals; if (k in payTotals) payTotals[k] += t.naira })

    return {
      id: o.id, name: o.name, location: o.location, isActive: o.isActive,
      dailyTarget: o.dailyTarget, rev, kg, count: todayTx.length,
      pct: Math.min(100, Math.round((rev / o.dailyTarget) * 100)),
      linked: todayTx.filter(t => !t.isAnonymous).length,
      tankCurrentKg: o.tankCurrentKg, tankCapacityKg: o.tankCapacityKg, tankPct,
      weekData, payTotals,
      staff: o.staff,
      recentRefills: o.tankRefills,
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, location, dailyTarget, tankCapacityKg } = await req.json()
  if (!name || !location) return NextResponse.json({ error: 'Name and location required' }, { status: 400 })

  const outlet = await prisma.outlet.create({
    data: {
      name: name.trim(),
      location: location.trim(),
      dailyTarget: parseFloat(dailyTarget) || 400000,
      tankCapacityKg: parseFloat(tankCapacityKg) || 2000,
      tankCurrentKg: 0,
    },
  })
  return NextResponse.json(outlet, { status: 201 })
}
