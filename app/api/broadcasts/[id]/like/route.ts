import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkDemoLimit } from "@/lib/demo-limits"

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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

  const limitErr = await checkDemoLimit("BroadcastLike")
  if (limitErr) return NextResponse.json(limitErr, { status: 403 })

  await prisma.broadcastLike.create({
    data: { broadcastId, userId: user.id, like: 1 },
  })

  return NextResponse.json({ liked: true })
}
