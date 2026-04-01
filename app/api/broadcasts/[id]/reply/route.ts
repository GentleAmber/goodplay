import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkDemoLimit } from "@/lib/demo-limits"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const broadcastId = parseInt(id, 10)

  const comments = await prisma.broadcastComment.findMany({
    where: { broadcastId },
    orderBy: { createdAt: "desc" },
    include: {
      createByUser: { select: { id: true, name: true, avatar: true } },
    },
  })

  return NextResponse.json(comments)
}

export async function POST(
  req: Request,
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

  const { content } = await req.json()
  if (!content || typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json({ error: "Content required" }, { status: 400 })
  }

  const limitErr = await checkDemoLimit("BroadcastComment")
  if (limitErr) return NextResponse.json(limitErr, { status: 403 })

  const comment = await prisma.broadcastComment.create({
    data: {
      broadcastId,
      userId: user.id,
      content: content.trim(),
    },
  })

  return NextResponse.json(comment, { status: 201 })
}
