import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cylinderId } = await req.json()
  if (!cylinderId) return NextResponse.json({ error: 'Cylinder ID required' }, { status: 400 })

  const cleanCylId = cylinderId.toUpperCase().trim().replace(/-/g, '')
  const cylinder = await prisma.cylinder.findUnique({ where: { id: cleanCylId } })
  if (!cylinder) return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 })
  if (!cylinder.ownerId) return NextResponse.json({ error: 'Cylinder not linked to any user' }, { status: 404 })

  const owner = await prisma.user.findUnique({
    where: { id: cylinder.ownerId },
    select: { id: true, name: true, smokeBalance: true, useSmokeBalance: true }
  })
  if (!owner) return NextResponse.json({ error: 'Owner not found' }, { status: 404 })

  return NextResponse.json({
    success: true,
    cylinder: {
      id: cylinder.id,
      size: cylinder.size,
      owner: {
        id: owner.id,
        name: owner.name,
        smokeBalance: owner.smokeBalance,
        useSmokeBalance: owner.useSmokeBalance
      }
    },
    canUseSmoke: owner.useSmokeBalance && owner.smokeBalance > 0,
    smokeDiscount: owner.useSmokeBalance ? owner.smokeBalance : 0
  })
}
