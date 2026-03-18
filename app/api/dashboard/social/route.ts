import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
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
