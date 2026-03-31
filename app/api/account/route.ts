import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"

export async function GET() {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      id: true,
      name: true,
      intro: true,
      avatar: true,
      protectFollowList: true,
    },
  })

  return NextResponse.json(profile)
}

export async function PATCH(req: Request) {
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = await req.json()

  const data: Record<string, unknown> = {}

  if (typeof body.avatar === "string") {
    const avatar = body.avatar.trim()
    if (avatar.length > 0) {
      try {
        new URL(avatar)
      } catch {
        return NextResponse.json({ error: "Invalid avatar URL" }, { status: 400 })
      }
    }
    data.avatar = avatar.length > 0 ? avatar : null
  }

  if (typeof body.intro === "string") {
    const intro = body.intro.trim()
    if (intro.length > 500) {
      return NextResponse.json({ error: "Intro must be 500 characters or fewer" }, { status: 400 })
    }
    data.intro = intro.length > 0 ? intro : null
  }

  if (typeof body.protectFollowList === "boolean") {
    data.protectFollowList = body.protectFollowList
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data,
    select: {
      id: true,
      name: true,
      intro: true,
      avatar: true,
      protectFollowList: true,
    },
  })

  return NextResponse.json(updated)
}
