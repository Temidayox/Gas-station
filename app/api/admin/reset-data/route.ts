import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Reset all data except customer information
    const operations = [
      // Reset transactions
      prisma.transaction.deleteMany({}),
      
      // Reset tank refills
      prisma.tankRefill.deleteMany({}),
      
      // Reset cylinder links
      prisma.cylinder.deleteMany({}),
      
      // Reset outlet data (keep outlets but reset their data)
      prisma.outlet.updateMany({
        where: {},
        data: {
          dailyTarget: 400000,
          tankCapacityKg: 2000,
          tankCurrentKg: 1000
        }
      }),
      
      // Reset price to default
      prisma.priceRate.deleteMany({}),
      prisma.priceRate.create({
        data: {
          pricePerKg: 1150,
          setBy: user.id
        }
      })
    ]

    await prisma.$transaction(operations)

    return NextResponse.json({ 
      success: true,
      message: 'All system data has been reset successfully. Customer data has been preserved.'
    })

  } catch (error) {
    console.error('Reset data error:', error)
    return NextResponse.json({ 
      error: 'Failed to reset data. Please try again.' 
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  return NextResponse.json({ 
    message: 'POST endpoint available for resetting data. Use POST to perform reset.'
  })
}
