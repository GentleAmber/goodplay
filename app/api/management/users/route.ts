import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== "ADMIN") return null
  return user
}

export async function GET(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const q = searchParams.get("q")?.trim()

  const where = q
    ? { name: { contains: q, mode: "insensitive" as const } }
    : {}

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      avatar: true,
      role: true,
      banned: true,
      bannedAt: true,
      bannedUntil: true,
      createdAt: true,
    },
  })

  return NextResponse.json(users)
}
