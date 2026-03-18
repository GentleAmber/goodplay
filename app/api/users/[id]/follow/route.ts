import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {

  const viewer = await getAuthUser()
  if (!viewer) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id } = await params
  const targetId = parseInt(id, 10)

  if (viewer.id === targetId) {
    return NextResponse.json({ error: "Cannot follow yourself" }, { status: 400 })
  }

  // Toggle: if already following (active), deactivate; otherwise create/reactivate
  const existing = await prisma.follow.findFirst({
    where: { followingUserId: viewer.id, followedUserId: targetId },
  })

  if (existing) {
    await prisma.follow.update({
      where: { id: existing.id },
      data: { ifActive: !existing.ifActive },
    })
    return NextResponse.json({ following: !existing.ifActive })
  }

  await prisma.follow.create({
    data: { followingUserId: viewer.id, followedUserId: targetId },
  })

  return NextResponse.json({ following: true })
}
