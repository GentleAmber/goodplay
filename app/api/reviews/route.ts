import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const session = await getServerSession()
  if (!session?.user?.name) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const user = await prisma.user.findFirst({
    where: { name: session.user.name },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const url = new URL(req.url)
  const status = url.searchParams.get("status") || ""

  const where: { userId: number; status?: string } = { userId: user.id }
  const validStatuses = ["PLAYING", "PLAYED", "COMPLETED", "WANT_TO_PLAY"]
  if (status && validStatuses.includes(status)) {
    where.status = status
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
