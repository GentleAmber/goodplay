import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== "ADMIN") return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const games = await prisma.game.findMany({
    where: { requestStatus: "PENDING" },
    orderBy: { releaseDate: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      coverImage: true,
      gameType: true,
      releaseDate: true,
      genres: true,
      platforms: true,
      developers: true,
      publishers: true,
      requestStatus: true,
    },
  })

  return NextResponse.json(games)
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { gameId, action } = body as { gameId: string; action: string }

  if (!gameId || !["APPROVED", "REJECTED"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const game = await prisma.game.findUnique({ where: { id: gameId } })
  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 })
  }

  const updated = await prisma.game.update({
    where: { id: gameId },
    data: { requestStatus: action as "APPROVED" | "REJECTED" },
  })

  return NextResponse.json(updated)
}
