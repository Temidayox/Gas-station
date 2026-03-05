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
    // Count total cylinders
    const totalCount = await prisma.cylinder.count()
    
    // Get first 10 cylinders for debugging
    const sampleCylinders = await prisma.cylinder.findMany({
      take: 10,
      select: {
        id: true,
        size: true,
        isLinked: true,
        ownerId: true
      }
    })
    
    // Count linked vs unlinked
    const linkedCount = await prisma.cylinder.count({
      where: { isLinked: true }
    })
    
    const unlinkedCount = await prisma.cylinder.count({
      where: { isLinked: false }
    })

    return NextResponse.json({
      totalCount,
      linkedCount,
      unlinkedCount,
      sampleCylinders,
      message: `Database has ${totalCount} cylinders (${linkedCount} linked, ${unlinkedCount} available)`
    })
    
  } catch (error) {
    console.error('Debug cylinder error:', error)
    return NextResponse.json({ 
      error: 'Failed to debug cylinders',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
