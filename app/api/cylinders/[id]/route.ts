import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await context.params
  // Normalise: strip dashes, uppercase — accepts GS00001 or GS-00001
  const normalised = id.toUpperCase().replace(/-/g, '')

  const cyl = await prisma.cylinder.findUnique({
    where: { id: normalised },
    include: { owner: { select: { name: true, phone: true } } },
  })

  if (!cyl) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({
    id:        cyl.id,
    size:      cyl.size,
    isLinked:  cyl.isLinked,
    ownerName: cyl.owner?.name ?? null,
  })
}
