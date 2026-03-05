import { NextRequest, NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { useSmokeBalance } = await req.json()
  if (typeof useSmokeBalance !== 'boolean') return NextResponse.json({ error: 'useSmokeBalance must be a boolean' }, { status: 400 })

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { useSmokeBalance },
    select: { id: true, name: true, smokeBalance: true, useSmokeBalance: true }
  })

  return NextResponse.json({ success: true, user: updated })
}

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true, name: true, smokeBalance: true, useSmokeBalance: true }
  })
  if (!dbUser) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ success: true, user: dbUser })
}
