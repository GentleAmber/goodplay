import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { checkDemoLimit } from "@/lib/demo-limits"

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.banned) {
    return NextResponse.json({ error: "Action not allowed. You're currently banned." }, { status: 403 })
  }

  const { id: gameId } = await params
  const body = await req.json()
  const { rating, status, content, broadcast } = body

  if (!status) {
    return NextResponse.json({ error: "Status is required" }, { status: 400 })
  }

  const validStatuses = ["PLAYING", "PLAYED", "COMPLETED", "WANT_TO_PLAY"]
  if (!validStatuses.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  }

  if (rating !== undefined && rating !== null) {
    if (typeof rating !== "number" || rating < 1 || rating > 10) {
      return NextResponse.json({ error: "Rating must be 1-10" }, { status: 400 })
    }
  }

  // Check GameReview limit only when creating (not updating an existing review)
  const existingReview = await prisma.gameReview.findUnique({
    where: { gameId_userId: { gameId, userId: user.id } },
    select: { gameId: true },
  })
  if (!existingReview) {
    const limitErr = await checkDemoLimit("GameReview")
    if (limitErr) return NextResponse.json(limitErr, { status: 403 })
  }

  // Upsert: create if not exists, update if exists
  const review = await prisma.gameReview.upsert({
    where: {
      gameId_userId: { gameId, userId: user.id },
    },
    update: {
      rating: rating ?? null,
      status,
      content: content?.trim() || null,
    },
    create: {
      gameId,
      userId: user.id,
      rating: rating ?? null,
      status,
      content: content?.trim() || null,
    },
  })

  // Optionally create a broadcast
  if (broadcast) {
    const broadcastLimitErr = await checkDemoLimit("Broadcast")
    if (!broadcastLimitErr) {
      await prisma.broadcast.create({
        data: {
          gameId,
          userId: user.id,
          rating: rating ?? null,
          status,
          content: content?.trim() || null,
        },
      })
    }
  }

  return NextResponse.json(review)
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const { id: gameId } = await params

  await prisma.gameReview.delete({
    where: { gameId_userId: { gameId, userId: user.id } },
  })

  return NextResponse.json({ deleted: true })
}
