import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const broadcasts = await prisma.broadcast.findMany({
    where: { userId: user.id },
    orderBy: { createAt: "desc" },
    include: {
      game: { select: { id: true, title: true, slug: true } },
      likes: { where: { userId: user.id }, select: { id: true } },
      _count: { select: { comments: true, likes: true } },
    },
  })

  const result = broadcasts.map(({ likes, ...b }) => ({
    ...b,
    likedByMe: likes.length > 0,
  }))

  return NextResponse.json(result)
}
