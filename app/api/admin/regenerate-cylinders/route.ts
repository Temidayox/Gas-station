import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMultipleCylinderCodes } from '@/lib/cylinderGenerator'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    // Delete all existing cylinders
    await prisma.cylinder.deleteMany()
    
    // Generate 100 new random cylinder codes
    const cylinderCodes = generateMultipleCylinderCodes(100)
    
    // Create new cylinders with random codes
    const cylinders = cylinderCodes.map((code, index) => ({
      id: code,
      size: [6, 12.5, 25, 37.5, 50][index % 5], // Rotate through sizes
      isLinked: false,
      ownerId: null
    }))
    
    // Insert all new cylinders
    await prisma.cylinder.createMany({
      data: cylinders
    })
    
    return NextResponse.json({ 
      success: true, 
      message: 'Successfully created 100 new cylinders with random codes',
      sampleCodes: cylinderCodes.slice(0, 10)
    })
    
  } catch (error) {
    console.error('Error regenerating cylinders:', error)
    return NextResponse.json({ 
      error: 'Failed to regenerate cylinders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
