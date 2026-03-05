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
    // Return pending migration response until database is updated
    return NextResponse.json({
      success: true,
      message: 'Smoke preference system pending database migration',
      user: {
        id: user.id,
        name: user.name,
        smokeBalance: 0, // Default until migration runs
        useSmokeBalance: false // Default until migration runs
      }
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
    // Return pending migration response until database is updated
    return NextResponse.json({
      success: true,
      message: 'Smoke preference system pending database migration',
      user: {
        id: user.id,
        name: user.name,
        smokeBalance: 0, // Default until migration runs
        useSmokeBalance: false // Default until migration runs
      }
    })

  } catch (error: any) {
    console.error('❌ Failed to get Smoke preference:', error)
    return NextResponse.json({ 
      error: 'Failed to get Smoke preference',
      details: error.message
    }, { status: 500 })
  }
}
