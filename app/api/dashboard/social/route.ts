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

  const [followerCount, followingCount, followers, following] = await Promise.all([
    prisma.follow.count({ where: { followedUserId: user.id, ifActive: true } }),
    prisma.follow.count({ where: { followingUserId: user.id, ifActive: true } }),
    prisma.follow.findMany({
      where: { followedUserId: user.id, ifActive: true },
      include: { followingUser: { select: { id: true, name: true, avatar: true } } },
    }),
    prisma.follow.findMany({
      where: { followingUserId: user.id, ifActive: true },
      include: { followedUser: { select: { id: true, name: true, avatar: true } } },
    }),
  ])

  return NextResponse.json({
    followerCount,
    followingCount,
    followers: followers.map((f) => f.followingUser),
    following: following.map((f) => f.followedUser),
  })
}
