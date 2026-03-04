import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { cylinderId } = await req.json()

  if (!cylinderId) return NextResponse.json({ error: 'Cylinder ID required' }, { status: 400 })

  const id = cylinderId.toUpperCase().trim().replace(/-/g, '')

  const cyl = await prisma.cylinder.findUnique({ where: { id } })
  if (!cyl) return NextResponse.json({ error: 'Cylinder ID not found — check the sticker' }, { status: 404 })
  if (cyl.isLinked && cyl.ownerId !== user.id)
    return NextResponse.json({ error: 'This cylinder is already linked to another account' }, { status: 409 })
  if (cyl.ownerId === user.id)
    return NextResponse.json({ error: 'This cylinder is already linked to your account' }, { status: 409 })

  // Use transaction to prevent race conditions
  await prisma.$transaction(async (tx) => {
    // Re-check cylinder status within transaction
    const currentCyl = await tx.cylinder.findUnique({ where: { id } })
    if (!currentCyl) {
      throw new Error('Cylinder ID not found — check sticker')
    }
    if (currentCyl.isLinked && currentCyl.ownerId !== user.id) {
      throw new Error('This cylinder is already linked to another account')
    }
    if (currentCyl.ownerId === user.id) {
      throw new Error('This cylinder is already linked to your account')
    }

    // Update cylinder ownership atomically
    await tx.cylinder.update({
      where: { id },
      data: { ownerId: user.id, isLinked: true },
    })
  })

  return NextResponse.json({ success: true, cylinderId: id, size: cyl.size })
}
