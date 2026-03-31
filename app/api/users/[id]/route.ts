import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = parseInt(id, 10)
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid user id" }, { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      intro: true,
      avatar: true,
      createdAt: true,
      protectFollowList: true,
      banned: true,
      role: true,
    },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  // Counts
  const [followerCount, followingCount] = await Promise.all([
    prisma.follow.count({ where: { followedUserId: userId, ifActive: true } }),
    prisma.follow.count({ where: { followingUserId: userId, ifActive: true } }),
  ])

  // Reviews
  const reviews = await prisma.gameReview.findMany({
    where: { userId },
    orderBy: { lastUpdateAt: "desc" },
    include: {
      game: {
        select: { id: true, title: true, slug: true, coverImage: true },
      },
    },
  })

  // Check if current viewer is blocked by this user
  let isBlocked = false
  let isFollowing = false
  let viewerId: number | null = null
  const session = await getServerSession()
  if (session?.user?.name) {
    const viewer = await prisma.user.findFirst({
      where: { name: session.user.name },
      select: { id: true },
    })
    viewerId = viewer?.id ?? null
    if (viewer && viewer.id !== userId) {
      const block = await prisma.block.findFirst({
        where: { initiatorId: userId, blockedUserId: viewer.id, ifActive: true },
      })
      isBlocked = !!block

      const follow = await prisma.follow.findFirst({
        where: { followingUserId: viewer.id, followedUserId: userId, ifActive: true },
      })
      isFollowing = !!follow
    }
  }

  // Broadcasts (after viewer resolution so we can include likedByMe)
  const rawBroadcasts = await prisma.broadcast.findMany({
    where: { userId },
    orderBy: { createAt: "desc" },
    include: {
      game: { select: { id: true, title: true, slug: true } },
      likes: viewerId ? { where: { userId: viewerId }, select: { id: true } } : false,
      _count: { select: { comments: true, likes: true } },
    },
  })
  const broadcasts = rawBroadcasts.map(({ likes, ...b }) => ({
    ...b,
    likedByMe: Array.isArray(likes) && likes.length > 0,
  }))

  return NextResponse.json({
    ...user,
    followerCount,
    followingCount,
    reviews,
    broadcasts,
    isBlocked,
    isFollowing,
  })
}
