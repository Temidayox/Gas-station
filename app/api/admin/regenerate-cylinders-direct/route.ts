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
    console.log('🔄 REGENERATING ALL CYLINDERS WITH NEW RANDOM CODES')
    
    // Delete all existing cylinders
    await prisma.cylinder.deleteMany()
    console.log('🗑️ Deleted all existing cylinders')
    
    // Generate 100 new random cylinder codes
    const newCodes = generateMultipleCylinderCodes(100)
    console.log('🎲 Generated 100 new codes:', newCodes.slice(0, 10))
    
    // Create new cylinders with random codes
    const cylinders = newCodes.map((code, index) => ({
      id: code,
      size: [6, 12.5, 25, 37.5, 50][index % 5], // Rotate through sizes
      isLinked: false,
      ownerId: null
    }))
    
    await prisma.cylinder.createMany({
      data: cylinders
    })
    
    console.log('✅ Created 100 new cylinders with random codes')
    
    return NextResponse.json({
      success: true,
      message: 'Successfully regenerated all cylinders with new random codes',
      cylindersCreated: cylinders.length,
      sampleCodes: newCodes.slice(0, 10)
    })
    
  } catch (error: any) {
    console.error('❌ Regeneration failed:', error)
    return NextResponse.json({ 
      error: 'Failed to regenerate cylinders',
      details: error.message
    }, { status: 500 })
  }
}
