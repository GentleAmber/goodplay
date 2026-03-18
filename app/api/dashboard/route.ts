import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const reviews = await prisma.gameReview.groupBy({
    by: ["status"],
    where: { userId: user.id },
    _count: { status: true },
  })

  const counts: Record<string, number> = {
    PLAYING: 0,
    PLAYED: 0,
    COMPLETED: 0,
    WANT_TO_PLAY: 0,
  }
  for (const r of reviews) {
    counts[r.status] = r._count.status
  }

  return NextResponse.json(counts)
}
