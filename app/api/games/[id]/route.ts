import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

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
