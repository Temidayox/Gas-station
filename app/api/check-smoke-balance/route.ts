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

    // Get owner info (without smoke fields until migration)
    const owner = await prisma.user.findUnique({
      where: { id: cylinder.ownerId },
      select: {
        id: true,
        name: true
      }
    })

    if (!owner) {
      return NextResponse.json({ error: 'Cylinder owner not found' }, { status: 404 })
    }

    // Return cylinder info with default smoke values until migration
    return NextResponse.json({
      success: true,
      cylinder: {
        id: cylinder.id,
        size: cylinder.size,
        owner: {
          id: owner.id,
          name: owner.name,
          smokeBalance: 0, // Default until migration runs
          useSmokeBalance: false // Default until migration runs
        }
      },
      canUseSmoke: false, // Disabled until migration runs
      smokeDiscount: 0,
      message: 'Smoke balance system pending database migration'
    })

  } catch (error: any) {
    console.error('❌ Smoke balance check failed:', error)
    return NextResponse.json({ 
      error: 'Failed to check smoke balance',
      details: error.message
    }, { status: 500 })
  }
}
