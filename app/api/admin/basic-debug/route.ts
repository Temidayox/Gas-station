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
    // Only test database connection - no operations
    await prisma.$connect()
    console.log('✅ Database connection test successful')
    
    // Only count cylinders - no complex queries
    const cylinderCount = await prisma.cylinder.count()
    console.log('📊 Total cylinders:', cylinderCount)
    
    return NextResponse.json({
      success: true,
      cylinderCount,
      message: 'Database connection test completed'
    })
    
  } catch (error: any) {
    console.error('❌ Database error:', error.message)
    return NextResponse.json({ 
      error: 'Database connection failed',
      details: error.message
    }, { status: 500 })
  }
}
