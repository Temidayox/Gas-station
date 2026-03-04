import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const { name, phone, email, password, cylinderId } = await req.json()

  if (!name || !phone || !password)
    return NextResponse.json({ error: 'Name, phone and password are required' }, { status: 400 })

  const existing = email ? await prisma.user.findUnique({ where: { email } }) : null
  if (existing) return NextResponse.json({ error: 'Email already registered' }, { status: 409 })

  const hashed = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      phone,
      email: email || `${phone}@gasstation.ng`,
      password: hashed,
      role: 'CUSTOMER',
    },
  })

  // Link cylinder if provided - use transaction to prevent race conditions
  if (cylinderId) {
    const normalisedId = cylinderId.toUpperCase().replace(/-/g, '')
    
    await prisma.$transaction(async (tx) => {
      const cyl = await tx.cylinder.findUnique({ where: { id: normalisedId } })
      if (cyl && !cyl.isLinked && !cyl.ownerId) {
        // Only link if cylinder is truly unlinked
        await tx.cylinder.update({
          where: { id: normalisedId },
          data: { ownerId: user.id, isLinked: true },
        })
      }
    })
  }

  return NextResponse.json({ success: true, email: user.email }, { status: 201 })
}
