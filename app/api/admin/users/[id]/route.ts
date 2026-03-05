import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'

// DELETE - Remove admin user
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession()
    if (!session?.user || (session.user as any).role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      )
    }

    const userId = parseInt(params.id)
    if (isNaN(userId)) {
      return NextResponse.json(
        { error: 'Invalid user ID' },
        { status: 400 }
      )
    }

    // Don't allow removing the main admin
    if ((session.user as any).email === 'dtemidayo825@gmail.com') {
      return NextResponse.json(
        { error: 'Cannot remove main admin account' },
        { status: 403 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Don't allow removing super admins
    if (user.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot remove Super Admin users' },
        { status: 403 }
      )
    }

    // Delete the user
    await prisma.user.delete({
      where: { id: userId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    )
  }
}
