import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const fullUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true, smokeBalance: true, useSmokeBalance: true,
      cylinders: {
        include: {
          transactions: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { outlet: { select: { name: true } } },
          },
        },
      },
    },
  })

  if (!fullUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const cylIds = fullUser.cylinders.map(c => c.id)

  const transactions = await prisma.transaction.findMany({
    where: { cylinderId: { in: cylIds } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    include: { outlet: { select: { name: true } } },
  })

  const totalSpend = transactions.reduce((s, t) => s + t.naira, 0)
  const totalKg    = transactions.reduce((s, t) => s + t.kg, 0)

  const outletFreq: Record<string, number> = {}
  transactions.forEach(t => {
    const name = t.outlet?.name
    if (name) outletFreq[name] = (outletFreq[name] ?? 0) + 1
  })
  const favOutlet = Object.entries(outletFreq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—'

  const monthlySpend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return {
      label: d.toLocaleDateString('en-NG', { month: 'short' }),
      value: transactions.filter(t => {
        const td = new Date(t.createdAt)
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth()
      }).reduce((s, t) => s + t.naira, 0),
    }
  })

  return NextResponse.json({
    user: {
      id:    fullUser.id,
      name:  fullUser.name  ?? '',
      email: fullUser.email ?? '',
      phone: fullUser.phone ?? null,
      smokeBalance: fullUser.smokeBalance,
      useSmokeBalance: fullUser.useSmokeBalance,
    },
    cylinders: fullUser.cylinders.map(c => ({
      id:         c.id,
      size:       c.size,
      lastFill:   c.transactions[0]?.createdAt ?? null,
      outletName: c.transactions[0]?.outlet?.name ?? null,
    })),
    transactions: transactions.map(t => ({
      ...t,
      outlet: { name: t.outlet?.name ?? '—' },
    })),
    stats: { totalSpend, totalKg, refillCount: transactions.length, favOutlet },
    monthlySpend,
  })
}

