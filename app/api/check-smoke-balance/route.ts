import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cylinderId, useSmokeBalance } = await req.json()

  if (!cylinderId) {
    return NextResponse.json({ error: 'Cylinder ID required' }, { status: 400 })
  }

  try {
    // Clean cylinder ID
    const cleanCylId = cylinderId.toUpperCase().trim().replace(/-/g, '')

    // Get cylinder with owner
    const cylinder = await prisma.cylinder.findUnique({
      where: { id: cleanCylId }
    })

    if (!cylinder) {
      return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 })
    }

    if (!cylinder.ownerId) {
      return NextResponse.json({ error: 'Cylinder not linked to any user' }, { status: 404 })
    }

    // Get owner with smoke balance and preference
    const owner = await prisma.user.findUnique({
      where: { id: cylinder.ownerId },
      select: {
        id: true,
        name: true,
        smokeBalance: true,
        useSmokeBalance: true
      }
    })

    if (!owner) {
      return NextResponse.json({ error: 'Cylinder owner not found' }, { status: 404 })
    }

    // Check if user wants to use Smoke balance AND has Smoke available
    const canUseSmoke = owner.useSmokeBalance && (owner.smokeBalance || 0) > 0
    const smokeDiscount = canUseSmoke ? Math.min(owner.smokeBalance || 0, 1000) : 0 // Cap at 1000 for safety

    // Return cylinder info and user's smoke balance
    return NextResponse.json({
      success: true,
      cylinder: {
        id: cylinder.id,
        size: cylinder.size,
        owner: {
          id: owner.id,
          name: owner.name,
          smokeBalance: owner.smokeBalance || 0,
          useSmokeBalance: owner.useSmokeBalance || false
        }
      },
      canUseSmoke,
      smokeDiscount,
      message: owner.useSmokeBalance 
        ? (owner.smokeBalance || 0) > 0 
          ? `User has opted to use Smoke balance: ${owner.smokeBalance || 0} Smoke available (up to ${smokeDiscount} Naira discount)`
          : 'User has opted to use Smoke balance but has no Smoke available'
        : 'User has NOT opted to use Smoke balance for this purchase'
    })

  } catch (error: any) {
    console.error('❌ Smoke balance check failed:', error)
    return NextResponse.json({ 
      error: 'Failed to check smoke balance',
      details: error.message
    }, { status: 500 })
  }
}
