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
    console.log('🔍 COMPREHENSIVE CYLINDER DEBUG')
    
    // Test database connection
    const dbConnection = await prisma.$connect()
    console.log('📊 Database connection:', dbConnection ? 'SUCCESS' : 'FAILED')
    
    // Count all cylinders
    const totalCount = await prisma.cylinder.count()
    console.log('📊 Total cylinders in database:', totalCount)
    
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
    console.log('📊 Sample cylinders:', sampleCylinders.map(c => ({
      id: c.id,
      size: c.size,
      isLinked: c.isLinked,
      ownerId: c.ownerId
    })))
    
    // Test cylinder creation
    const testCode = 'TEST123'
    console.log('🧪 Testing cylinder creation with code:', testCode)
    
    try {
      const newCylinder = await prisma.cylinder.create({
        data: {
          id: testCode,
          size: 12.5,
          isLinked: false,
          ownerId: null
        }
      })
      console.log('✅ Test cylinder created:', newCylinder)
      
      // Test linking the test cylinder
      const linkTest = await fetch(`${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/link-cylinder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cylinderId: testCode })
      })
      
      const linkResult = await linkTest.json()
      console.log('🔗 Link test result:', linkResult)
      
      // Clean up test cylinder
      await prisma.cylinder.delete({
        where: { id: testCode }
      })
      console.log('🗑️ Test cylinder deleted')
      
    } catch (error) {
      console.error('❌ Test failed:', error)
    }

    // Test user session
    console.log('👤 Current user session:', {
      id: user.id,
      email: user.email,
      role: user.role
    })

    const debugResult = {
      databaseConnection: !!dbConnection,
      totalCylinders: totalCount,
      sampleCylinders: sampleCylinders,
      testLinking: {
        testCode,
        result: linkResult
      },
      userSession: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Comprehensive cylinder debug completed',
      debug: debugResult
    })
    
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
