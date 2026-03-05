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
    console.log('🔄 DATABASE RESET AND RESEED')
    
    // Step 1: Delete all existing cylinders
    await prisma.cylinder.deleteMany()
    console.log('🗑️ Deleted all existing cylinders')
    
    // Step 2: Generate 100 new random cylinder codes
    const cylinderCodes = generateMultipleCylinderCodes(100)
    console.log('🎲 Generated 100 new random codes:', cylinderCodes.slice(0, 10))
    
    // Step 3: Create cylinders with proper sizes
    const cylinders = cylinderCodes.map((code, index) => ({
      id: code,
      size: [6, 12.5, 25, 37.5, 50][index % 5], // Rotate through all sizes
      isLinked: false,
      ownerId: null
    }))
    
    await prisma.cylinder.createMany({ data: cylinders })
    console.log('✅ Created 100 new cylinders with proper sizes')
    
    // Step 4: Link first 4 cylinders to demo users
    const demoUsers = await prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      take: 4
    })
    
    if (demoUsers.length >= 4) {
      for (let i = 0; i < 4; i++) {
        await prisma.cylinder.update({
          where: { id: cylinderCodes[i] },
          data: { 
            ownerId: demoUsers[i].id,
            isLinked: true,
            size: [12.5, 25, 12.5, 6][i] // Different sizes for demo users
          }
        })
      }
      console.log('✅ Linked first 4 cylinders to demo users')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Database reset and reseed completed successfully',
      cylindersCreated: cylinders.length,
      sampleCodes: cylinderCodes.slice(0, 10),
      demoUsersLinked: Math.min(demoUsers.length, 4)
    })
    
  } catch (error: any) {
    console.error('❌ Reset failed:', error)
    return NextResponse.json({ 
      error: 'Database reset failed',
      details: error.message
    }, { status: 500 })
  }
}
