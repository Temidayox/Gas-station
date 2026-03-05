import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const cleanId = id.toUpperCase().trim().replace(/-/g, '')

  const cyl = await prisma.cylinder.findUnique({
    where: { id: cleanId },
    include: {
      owner: {
        select: {
          id: true,
          name: true,
          smokeBalance: true,
          useSmokeBalance: true,
        },
      },
    },
  })

  if (!cyl) return NextResponse.json({ error: 'Cylinder not found' }, { status: 404 })

  return NextResponse.json({
    id: cyl.id,
    size: cyl.size,
    isLinked: cyl.isLinked,
    ownerId: cyl.ownerId,
    ownerName: cyl.owner?.name ?? null,
    smokeBalance: cyl.owner?.smokeBalance ?? 0,
    useSmokeBalance: cyl.owner?.useSmokeBalance ?? false,
  })
}
