import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Get IDs of users this person follows
  const follows = await prisma.follow.findMany({
    where: { followingUserId: user.id, ifActive: true },
    select: { followedUserId: true },
  })
  const followedIds = follows.map((f) => f.followedUserId)

  if (followedIds.length === 0) {
    return NextResponse.json([])
  }

  const broadcasts = await prisma.broadcast.findMany({
    where: { userId: { in: followedIds } },
    orderBy: { createAt: "desc" },
    include: {
      createByUser: { select: { id: true, name: true, avatar: true } },
      game: { select: { id: true, title: true, coverImage: true, slug: true } },
      // used to determine if "I" have liked a broadcast
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
