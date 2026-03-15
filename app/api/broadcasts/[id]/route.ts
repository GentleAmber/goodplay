import { getServerSession } from "next-auth"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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

  const { id } = await params
  const broadcastId = parseInt(id, 10)

  const broadcast = await prisma.broadcast.findUnique({
    where: { id: broadcastId },
    select: { userId: true },
  })
  if (!broadcast || broadcast.userId !== user.id) {
    return NextResponse.json({ error: "Not found or not yours" }, { status: 404 })
  }

  // Delete comments and likes first, then the broadcast
  await prisma.$transaction([
    prisma.broadcastComment.deleteMany({ where: { broadcastId } }),
    prisma.broadcastLike.deleteMany({ where: { broadcastId } }),
    prisma.broadcast.delete({ where: { id: broadcastId } }),
  ])

  return NextResponse.json({ deleted: true })
}
