import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  // Look up by slug first, then by id
  let game = await prisma.game.findFirst({
    where: { slug: id, requestStatus: "APPROVED" },
    include: {
      reviews: {
        orderBy: { createAt: "desc" },
        include: {
          createByUser: { select: { id: true, name: true, avatar: true } },
        },
      },
    },
  })

  if (!game) {
    game = await prisma.game.findFirst({
      where: { id, requestStatus: "APPROVED" },
      include: {
        reviews: {
          orderBy: { createAt: "desc" },
          include: {
            createByUser: { select: { id: true, name: true, avatar: true } },
          },
        },
      },
    })
  }

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  // Average rating
  const agg = await prisma.gameReview.aggregate({
    where: { gameId: game.id, rating: { not: null } },
    _avg: { rating: true },
    _count: { rating: true },
  })

  return NextResponse.json({
    ...game,
    avgRating: agg._avg.rating,
    ratingCount: agg._count.rating,
  })
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthUser()
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params

  const game = await prisma.game.findUnique({ where: { id }, select: { id: true } })
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  await prisma.$transaction(async (tx) => {
    const broadcastIds = (
      await tx.broadcast.findMany({ where: { gameId: id }, select: { id: true } })
    ).map((b) => b.id)

    if (broadcastIds.length > 0) {
      await tx.broadcastLike.deleteMany({ where: { broadcastId: { in: broadcastIds } } })
      await tx.broadcastComment.deleteMany({ where: { broadcastId: { in: broadcastIds } } })
      await tx.broadcast.deleteMany({ where: { id: { in: broadcastIds } } })
    }

    await tx.gameReview.deleteMany({ where: { gameId: id } })
    await tx.game.delete({ where: { id } })
  })

  return new NextResponse(null, { status: 204 })
}
