import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const userId = parseInt(id, 10)

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { protectFollowList: true },
  })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (user.protectFollowList) {
    return NextResponse.json({ error: "This user's follow list is private" }, { status: 403 })
  }

  const following = await prisma.follow.findMany({
    where: { followingUserId: userId, ifActive: true },
    include: {
      followedUser: { select: { id: true, name: true, avatar: true } },
    },
  })

  return NextResponse.json(
    following.map((f) => f.followedUser),
  )
}
