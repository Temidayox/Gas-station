import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getPusherServer } from '@/lib/pusher-server'
import { CHANNELS, EVENTS } from '@/lib/pusher'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { pricePerKg } = await req.json()
  if (!pricePerKg || pricePerKg <= 0)
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 })

  const rate = await prisma.priceRate.create({ data: { pricePerKg, setBy: user.id } })
  try {
    const pusher = getPusherServer()
    if (pusher) await pusher.trigger(CHANNELS.PUBLIC, EVENTS.PRICE_UPDATE, { pricePerKg })
  } catch (e) {
    console.error('Pusher trigger failed:', e)
  }
  return NextResponse.json(rate)
}
