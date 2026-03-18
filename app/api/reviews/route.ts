import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Status } from "@/generated/prisma/client"

export async function GET(req: Request) {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || ""

  const where: { userId: number; status?: Status } = { userId: user.id }
  const validStatuses = ["PLAYING", "PLAYED", "COMPLETED", "WANT_TO_PLAY"]
  if (status && validStatuses.includes(status)) {
    where.status = status as Status
  }

  const reviews = await prisma.gameReview.findMany({
    where,
    orderBy: { lastUpdateAt: "desc" },
    include: {
      game: {
        select: {
          id: true,
          title: true,
          slug: true,
          coverImage: true,
          releaseDate: true,
          genres: true,
        },
      },
    },
  })

  return NextResponse.json(reviews)
}
