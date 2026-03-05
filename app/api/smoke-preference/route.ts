import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { useSmokeBalance } = await req.json()

  if (typeof useSmokeBalance !== 'boolean') {
    return NextResponse.json({ error: 'useSmokeBalance must be a boolean' }, { status: 400 })
  }

  try {
    // Update user's Smoke balance preference
    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: { useSmokeBalance },
      select: {
        id: true,
        name: true,
        smokeBalance: true,
        useSmokeBalance: true
      }
    })

    return NextResponse.json({
      success: true,
      message: useSmokeBalance 
        ? 'Smoke balance will be used in next purchase'
        : 'Smoke balance will NOT be used in next purchase',
      user: updatedUser
    })

  } catch (error: any) {
    console.error('❌ Failed to update Smoke preference:', error)
    return NextResponse.json({ 
      error: 'Failed to update Smoke preference',
      details: error.message
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const userData = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        smokeBalance: true,
        useSmokeBalance: true
      }
    })

    if (!userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: userData
    })

  } catch (error: any) {
    console.error('❌ Failed to get Smoke preference:', error)
    return NextResponse.json({ 
      error: 'Failed to get Smoke preference',
      details: error.message
    }, { status: 500 })
  }
}
