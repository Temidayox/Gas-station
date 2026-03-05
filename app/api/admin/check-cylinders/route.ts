import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateMultipleCylinderCodes } from '@/lib/cylinderGenerator'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    const cylinderCount = await prisma.cylinder.count()
    
    if (cylinderCount === 0) {
      console.log('🔄 No cylinders found, creating initial cylinders...')
      
      // Generate 50 cylinders
      const codes = generateMultipleCylinderCodes(50)
      const cylinders = codes.map((code, index) => ({
        id: code,
        size: [6, 12.5, 25, 37.5, 50][index % 5],
        isLinked: false,
        ownerId: null
      }))
      
      await prisma.cylinder.createMany({ data: cylinders })
      
      return NextResponse.json({
        success: true,
        message: 'Created initial cylinders',
        cylindersCreated: cylinders.length,
        sampleCodes: codes.slice(0, 10)
      })
    }
    
    // Get sample cylinders
    const sampleCylinders = await prisma.cylinder.findMany({
      take: 5,
      select: {
        id: true,
        size: true,
        isLinked: true,
        ownerId: true
      }
    })
    
    return NextResponse.json({
      success: true,
      cylinderCount,
      sampleCylinders,
      message: 'Cylinders already exist'
    })
    
  } catch (error: any) {
    console.error('❌ Cylinder check failed:', error)
    return NextResponse.json({ 
      error: 'Failed to check cylinders',
      details: error.message
    }, { status: 500 })
  }
}
