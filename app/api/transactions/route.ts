import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPusherServer } from '@/lib/pusher-server'
import { CHANNELS, EVENTS } from '@/lib/pusher'

export const dynamic = 'force-dynamic'

// GET /api/transactions
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const outletId = searchParams.get('outletId')
  const days     = parseInt(searchParams.get('days') ?? '30')
  const limit    = parseInt(searchParams.get('limit') ?? '100')

  const since = new Date(Date.now() - days * 86400000)

  const where: any = { createdAt: { gte: since } }
  if (user.role === 'OUTLET_STAFF') where.outletId = parseInt(String(user.outletId))
  else if (outletId && outletId !== 'all') where.outletId = parseInt(outletId)

  const transactions = await prisma.transaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: {
      outlet: { select: { name: true } },
      cylinder: { select: { owner: { select: { name: true } } } },
    },
  })

  return NextResponse.json(transactions)
}

// POST /api/transactions — record a new sale
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Accept ADMIN or OUTLET_STAFF
  if (user.role !== 'OUTLET_STAFF' && user.role !== 'ADMIN')
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // outletId may come as string from JWT — always parse it
  const outletId = user.outletId ? parseInt(String(user.outletId)) : null
  if (!outletId || isNaN(outletId))
    return NextResponse.json({ error: 'No outlet assigned to your account' }, { status: 400 })

  const body = await req.json()
  const { naira, cylinderSize, paymentMethod, cylinderId } = body

  if (!naira || !cylinderSize || !paymentMethod)
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  if (isNaN(parseFloat(naira)) || parseFloat(naira) <= 0)
    return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const rate = await prisma.priceRate.findFirst({ orderBy: { createdAt: 'desc' } })
  const pricePerKg = rate?.pricePerKg ?? 1150
  const kg = parseFloat((parseFloat(naira) / pricePerKg).toFixed(3))

  // Validate cylinder if provided
  const cleanCylId = cylinderId?.trim().toUpperCase().replace(/-/g, '') || null
  if (cleanCylId) {
    const cyl = await prisma.cylinder.findUnique({ where: { id: cleanCylId } })
    if (!cyl) return NextResponse.json({ error: 'Cylinder ID not found' }, { status: 404 })
    // First fill — record cylinder size from the sale
    if (cyl.size === 0 && cylinderSize) {
      await prisma.cylinder.update({ where: { id: cleanCylId }, data: { size: parseFloat(String(cylinderSize)) } })
    }
  }

  // Create transaction and update tank atomically to prevent race conditions
  const [tx] = await prisma.$transaction([
    prisma.transaction.create({
      data: {
        outletId,
        naira: parseFloat(naira),
        kg,
        cylinderSize: parseFloat(String(cylinderSize)),
        paymentMethod,
        cylinderId: cleanCylId,
        staffId: user.id,
        isAnonymous: !cleanCylId,
      },
      include: {
        outlet: { select: { name: true } },
        cylinder: { 
          select: { 
            owner: { select: { id: true, name: true } },
            ownerId: true
          } 
        },
      },
    }),
    // Update tank level atomically
    prisma.outlet.update({
      where: { 
        id: outletId,
        // Ensure tank has enough gas
        tankCurrentKg: { gte: kg }
      },
      data: { tankCurrentKg: { decrement: kg } },
    }),
  ])

  // Allocate Smoke to cylinder owner (20 Smoke per 1000 naira)
  if (tx.cylinder?.ownerId) {
    const smokeEarned = Math.floor((parseFloat(naira) / 1000) * 20)
    if (smokeEarned > 0) {
      try {
        await prisma.user.update({
          where: { id: tx.cylinder.ownerId },
          data: { smokeBalance: { increment: smokeEarned } }
        })
        console.log(`✅ Allocated ${smokeEarned} Smoke to user ${tx.cylinder.ownerId}`)
      } catch (error: any) {
        // If smokeBalance field doesn't exist yet, log but don't fail
        if (error.message?.includes('smokeBalance') || error.message?.includes('column')) {
          console.log(`⏳ Smoke allocation pending migration: ${smokeEarned} Smoke for user ${tx.cylinder.ownerId}`)
        } else {
          throw error
        }
      }
    }
  }

  try {
    const pusher = getPusherServer()
    if (pusher) await pusher.trigger(CHANNELS.PUBLIC, EVENTS.NEW_TRANSACTION, { ...tx, outletId })
  } catch (e) {
    console.error('Pusher trigger failed:', e)
  }

  return NextResponse.json(tx, { status: 201 })
}