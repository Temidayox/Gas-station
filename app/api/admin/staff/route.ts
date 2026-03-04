import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

// GET - List all staff members
export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const staff = await prisma.user.findMany({
    where: { role: { in: ['OUTLET_STAFF', 'ADMIN'] } },
    include: { 
      outlet: { select: { id: true, name: true, location: true } }
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(staff)
}

// POST - Add new staff member
export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { email, name, outletId, role } = await req.json()

  // Validation
  if (!email || !name || !role) {
    return NextResponse.json({ error: 'Email, name, and role are required' }, { status: 400 })
  }

  if (role === 'OUTLET_STAFF' && !outletId) {
    return NextResponse.json({ error: 'Outlet ID required for outlet staff' }, { status: 400 })
  }

  if (!['OUTLET_STAFF', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
  }

  // Check if user already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  })

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 409 })
  }

  // Create staff member (they'll sign in with Google)
  const staff = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      name: name.trim(),
      role,
      outletId: role === 'OUTLET_STAFF' ? parseInt(String(outletId)) : null,
      // No password - uses Google OAuth
    },
  })

  return NextResponse.json({ 
    success: true, 
    staff: {
      id: staff.id,
      email: staff.email,
      name: staff.name,
      role: staff.role,
      outletId: staff.outletId,
    }
  }, { status: 201 })
}

// PUT - Update staff member
export async function PUT(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, email, name, outletId, role } = await req.json()

  if (!id) {
    return NextResponse.json({ error: 'Staff ID required' }, { status: 400 })
  }

  const updateData: any = {}
  if (email) updateData.email = email.toLowerCase().trim()
  if (name) updateData.name = name.trim()
  if (role) {
    if (!['OUTLET_STAFF', 'ADMIN'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    updateData.role = role
    updateData.outletId = role === 'OUTLET_STAFF' ? (outletId ? parseInt(String(outletId)) : null) : null
  }

  const updatedStaff = await prisma.user.update({
    where: { id },
    data: updateData,
  })

  return NextResponse.json({ success: true, staff: updatedStaff })
}

// DELETE - Remove staff member
export async function DELETE(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'Staff ID required' }, { status: 400 })
  }

  // Don't allow deleting self
  if (id === user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  await prisma.user.delete({
    where: { id },
  })

  return NextResponse.json({ success: true })
}
