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

  const user = await prisma.user.findFirst({
    where: { name: session.user.name },
    select: { id: true, banned: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (user.banned) {
    return NextResponse.json({ error: "You are banned" }, { status: 403 })
  }

  const { id } = await params
  const broadcastId = parseInt(id, 10)

  // Check if blocked by broadcast owner
  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    select: { userId: true },
  })
  if (!broadcast) {
    return NextResponse.json({ error: "Broadcast not found" }, { status: 404 })
  }
  if (broadcast.userId !== user.id) {
    const block = await prisma.block.findFirst({
      where: { initiatorId: broadcast.userId, blockedUserId: user.id, ifActive: true },
    })
    if (block) {
      return NextResponse.json({ error: "You cannot interact with this user" }, { status: 403 })
    }
  }

  // Toggle: if already liked, remove; otherwise create
  const existing = await prisma.broadcastLike.findFirst({
    where: { broadcastId, userId: user.id },
  })

  if (existing) {
    await prisma.broadcastLike.delete({ where: { id: existing.id } })
    return NextResponse.json({ liked: false })
  }

  await prisma.broadcastLike.create({
    data: { broadcastId, userId: user.id, like: 1 },
  })

  return NextResponse.json({ liked: true })
}
