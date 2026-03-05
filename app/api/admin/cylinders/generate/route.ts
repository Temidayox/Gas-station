import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { generateMultipleCylinderCodes, validateCylinderCode } from '@/lib/cylinderGenerator'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    const { count = 10 } = await req.json()
    
    // Generate secure random cylinder codes
    const newCodes = generateMultipleCylinderCodes(count)
    
    // Create cylinders in database
    const cylinders = []
    for (const code of newCodes) {
      const cylinder = await prisma.cylinder.create({
        data: {
          id: code,
          size: 0, // Unassigned size until linked
          isLinked: false
        }
      })
      cylinders.push(cylinder)
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${count} secure cylinder codes`,
      cylinders: cylinders.map(c => ({
        id: c.id,
        code: c.id,
        size: c.size,
        isLinked: c.isLinked,
        createdAt: c.createdAt
      }))
    })

  } catch (error) {
    console.error('Cylinder generation error:', error)
    return NextResponse.json({ 
      error: 'Failed to generate cylinder codes' 
    }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    // Get existing unlinked cylinders
    const unlinkedCylinders = await prisma.cylinder.findMany({
      where: { isLinked: false },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      cylinders: unlinkedCylinders.map(c => ({
        id: c.id,
        code: c.id,
        size: c.size,
        isLinked: c.isLinked,
        createdAt: c.createdAt
      })),
      total: unlinkedCylinders.length
    })

  } catch (error) {
    console.error('Get cylinders error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch cylinders' 
    }, { status: 500 })
  }
}
