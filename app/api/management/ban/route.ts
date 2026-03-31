import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== "ADMIN") return null
  return user
}

const BAN_DURATIONS: Record<string, number | null> = {
  "1d": 1,
  "3d": 3,
  "7d": 7,
  "15d": 15,
  "30d": 30,
  "60d": 60,
  "90d": 90,
  "180d": 180,
  "270d": 270,
  "1y": 365,
  "3y": 1095,
  "forever": null,
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { userId, duration } = body as { userId: number; duration: string }

  if (!userId || !duration || !(duration in BAN_DURATIONS)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const target = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }
  if (target.role === "ADMIN") {
    return NextResponse.json({ error: "Cannot ban an admin" }, { status: 400 })
  }

  const days = BAN_DURATIONS[duration]
  const bannedUntil = days !== null ? new Date(Date.now() + days * 86400000) : null

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      banned: true,
      bannedAt: new Date(),
      bannedUntil,
    },
    select: { id: true, name: true, banned: true, bannedAt: true, bannedUntil: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const userId = parseInt(searchParams.get("userId") ?? "", 10)
  if (isNaN(userId)) {
    return NextResponse.json({ error: "Invalid userId" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      banned: false,
      bannedAt: null,
      bannedUntil: null,
    },
    select: { id: true, name: true, banned: true },
  })

  return NextResponse.json(updated)
}
