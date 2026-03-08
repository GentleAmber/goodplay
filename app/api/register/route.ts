import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { NextRequest, NextResponse } from "next/server"
import { Role } from "@/generated/prisma"


export async function POST(req: NextRequest) {
  const { name, password, invitationCode } = await req.json()

  if (!name || !password || !invitationCode) {
    return NextResponse.json(
      { error: "All fields are required" },
      { status: 400 }
    )
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, hyphens, and underscores" },
      { status: 400 }
    )
  }

  if (name.length > 30) {
    return NextResponse.json(
      { error: "Username must be 30 characters or less" },
      { status: 400 }
    )
  }

  const code = await prisma.invitationCode.findUnique({
    where: { code: invitationCode },
  })

  if (!code || !code.isValid) {
    return NextResponse.json(
      { error: "Invalid invitation code" },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { name },
  })

  if (existingUser) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 400 }
    )
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  await prisma.user.create({
    data: {
      name,
      password: hashedPassword,
      invitationCodeId: code.id,
      role: code.registerAsAdmin ? Role.ADMIN : Role.USER,
    },
  })

  return NextResponse.json({ success: true }, { status: 201 })
}
