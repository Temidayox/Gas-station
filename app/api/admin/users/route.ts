import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

// GET - Fetch all admin users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'OUTLET_STAFF']
        }
      },
      select: {
        id: true,
        email: true,
        role: true,
        outletId: true,
        createdAt: true,
        name: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}

// POST - Add new admin user
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const { email, role, outletId } = await request.json()

    if (!email || !role) {
      return NextResponse.json(
        { error: 'Email and role are required' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      )
    }

    // Create new admin user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name: email.split('@')[0], // Use email prefix as name
        role: role,
        outletId: outletId,
        password: 'OAUTH_USER_NO_PASSWORD', // Placeholder for OAuth users
      }
    })

    return NextResponse.json(user)
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { error: 'Failed to create user' },
      { status: 500 }
    )
  }
}
