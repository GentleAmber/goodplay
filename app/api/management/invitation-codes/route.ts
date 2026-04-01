import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import getAuthUser from "@/lib/auth-helper"
import crypto from "crypto"
import { checkDemoLimit } from "@/lib/demo-limits"

async function requireAdmin() {
  const user = await getAuthUser()
  if (!user || user.role !== "ADMIN") return null
  return user
}

export async function GET() {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const codes = await prisma.invitationCode.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(codes)
}

export async function POST(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json().catch(() => ({}))
  const code = (body.code as string)?.trim() || crypto.randomBytes(8).toString("hex")

  if (code.length > 30) {
    return NextResponse.json({ error: "Code must be 30 characters or fewer" }, { status: 400 })
  }

  const existing = await prisma.invitationCode.findUnique({ where: { code } })
  if (existing) {
    return NextResponse.json({ error: "Code already exists" }, { status: 409 })
  }

  const limitErr = await checkDemoLimit("InvitationCode")
  if (limitErr) return NextResponse.json(limitErr, { status: 403 })

  const registerAsAdmin = body.registerAsAdmin === true

  const created = await prisma.invitationCode.create({
    data: {
      code,
      createdBy: admin.name,
      registerAsAdmin,
    },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(created, { status: 201 })
}

export async function PATCH(req: Request) {
  const admin = await requireAdmin()
  if (!admin) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { codeId } = body as { codeId: number }

  if (!codeId) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }

  const code = await prisma.invitationCode.findUnique({ where: { id: codeId } })
  if (!code) {
    return NextResponse.json({ error: "Code not found" }, { status: 404 })
  }
  if (!code.createdBy) {
    return NextResponse.json({ error: "Cannot modify system-created codes" }, { status: 400 })
  }

  const updated = await prisma.invitationCode.update({
    where: { id: codeId },
    data: { isValid: !code.isValid },
    include: { _count: { select: { users: true } } },
  })

  return NextResponse.json(updated)
}
