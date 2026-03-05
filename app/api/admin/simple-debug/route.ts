import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  if (user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
  }

  try {
    console.log('🔍 SIMPLE CYLINDER DEBUG')
    
    // Simple database connection test
    const cylinderCount = await prisma.cylinder.count()
    console.log('📊 Cylinder count:', cylinderCount)
    
    // Get first 3 cylinders
    const firstCylinders = await prisma.cylinder.findMany({
      take: 3,
      select: {
        id: true,
        size: true,
        isLinked: true,
        ownerId: true
      }
    })
    console.log('📊 First 3 cylinders:', firstCylinders)
    
    const debugResult = {
      cylinderCount,
      firstCylinders
    }

    return NextResponse.json({
      success: true,
      debug: debugResult,
      message: 'Simple cylinder debug completed'
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error.message
    }, { status: 500 })
  }
}
