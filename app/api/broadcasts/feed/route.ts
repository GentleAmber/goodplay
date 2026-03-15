import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
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
    take: 30,
    orderBy: { createAt: "desc" },
    include: {
      createByUser: { select: { id: true, name: true, avatar: true } },
      game: { select: { id: true, title: true, coverImage: true, slug: true } },
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
