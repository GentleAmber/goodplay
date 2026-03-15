import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getServerSession()
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const viewer = await prisma.user.findFirst({
    where: { name: session.user.name },
    select: { id: true },
  })
  if (!viewer) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
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
