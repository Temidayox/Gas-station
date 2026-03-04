import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST — log a tank refill
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'OUTLET_STAFF' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const outletId = parseInt(String(user.outletId))
  if (!outletId || isNaN(outletId))
    return NextResponse.json({ error: 'No outlet assigned' }, { status: 400 })

  const { addedKg, note } = await req.json()
  const kg = parseFloat(addedKg)
  if (!kg || kg <= 0) return NextResponse.json({ error: 'Invalid kg amount' }, { status: 400 })

  const outlet = await prisma.outlet.findUnique({ where: { id: outletId } })
  if (!outlet) return NextResponse.json({ error: 'Outlet not found' }, { status: 404 })

  const beforeKg = outlet.tankCurrentKg
  const afterKg  = Math.min(beforeKg + kg, outlet.tankCapacityKg)

  const [refill] = await prisma.$transaction([
    prisma.tankRefill.create({
      data: { outletId, addedKg: kg, beforeKg, afterKg, staffId: user.id, note: note || null },
    }),
    prisma.outlet.update({
      where: { id: outletId },
      data:  { tankCurrentKg: afterKg },
    }),
  ])

  return NextResponse.json({ success: true, beforeKg, afterKg, addedKg: kg, capacityKg: outlet.tankCapacityKg })
}

// GET — tank level for current outlet or all (admin)
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (user.role === 'ADMIN') {
    const outlets = await prisma.outlet.findMany({
      select: { id: true, name: true, location: true, tankCapacityKg: true, tankCurrentKg: true },
      orderBy: { id: 'asc' },
    })
    return NextResponse.json(outlets)
  }

  const outletId = parseInt(String(user.outletId))
  const outlet = await prisma.outlet.findUnique({
    where: { id: outletId },
    select: { id: true, name: true, tankCapacityKg: true, tankCurrentKg: true },
  })
  return NextResponse.json(outlet)
}
