import getAuthUser from "@/lib/auth-helper"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma"
import crypto from "crypto"

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = url.searchParams.get("q")?.trim() || ""
  const genre = url.searchParams.get("genre")?.trim() || ""
  const developer = url.searchParams.get("developer")?.trim() || ""
  const publisher = url.searchParams.get("publisher")?.trim() || ""
  const releaseFrom = url.searchParams.get("releaseFrom") || ""
  const releaseTo = url.searchParams.get("releaseTo") || ""
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10))
  const limit = Math.min(60, Math.max(1, parseInt(url.searchParams.get("limit") || "24", 10)))
  const skip = (page - 1) * limit

  const where: Prisma.GameWhereInput = {
    requestStatus: "APPROVED",
  }

  if (q) {
    where.title = { contains: q, mode: "insensitive" }
  }

  if (genre) {
    where.genres = { has: genre }
  }

  if (developer) {
    where.developers = { has: developer }
  }

  if (publisher) {
    where.publishers = { has: publisher }
  }

  if (releaseFrom || releaseTo) {
    where.releaseDate = {}
    if (releaseFrom) where.releaseDate.gte = new Date(releaseFrom)
    if (releaseTo) where.releaseDate.lte = new Date(releaseTo)
  }

  const [games, total] = await Promise.all([
    prisma.game.findMany({
      where,
      skip,
      take: limit,
      orderBy: { title: "asc" },
      select: {
        id: true,
        title: true,
        slug: true,
        coverImage: true,
        releaseDate: true,
        genres: true,
        developers: true,
        _count: { select: { reviews: true } },
      },
    }),
    prisma.game.count({ where }),
  ])

  // Compute average rating per game
  const gameIds = games.map((g) => g.id)
  const avgRatings = await prisma.gameReview.groupBy({
    by: ["gameId"],
    where: { gameId: { in: gameIds }, rating: { not: null } },
    _avg: { rating: true },
  })
  const avgMap = new Map(avgRatings.map((r) => [r.gameId, r._avg.rating]))

  const results = games.map((g) => ({
    ...g,
    avgRating: avgMap.get(g.id) ?? null,
  }))

  return NextResponse.json({
    games: results,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}

export async function POST(req: Request) {
  
  const user = await getAuthUser()
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  if (user.banned) {
    return NextResponse.json({ error: "You are banned" }, { status: 403 })
  }

  const body = await req.json()
  const {
    title,
    gameType,
    coverImage,
    releaseDate,
    description,
    genres,
    platforms,
    developers,
    publishers,
  } = body

  // Validate required fields
  if (!title || typeof title !== "string" || !title.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  }
  if (!gameType || !["VIDEO_GAME", "BOARD_GAME"].includes(gameType)) {
    return NextResponse.json({ error: "Game type must be VIDEO_GAME or BOARD_GAME" }, { status: 400 })
  }
  if (!coverImage || typeof coverImage !== "string" || !coverImage.trim()) {
    return NextResponse.json({ error: "Cover image URL is required" }, { status: 400 })
  }
  try {
    const url = new URL(coverImage.trim())
    if (!["http:", "https:"].includes(url.protocol)) throw new Error()
  } catch {
    return NextResponse.json({ error: "Cover image must be a valid HTTP(S) URL" }, { status: 400 })
  }
  if (!releaseDate) {
    return NextResponse.json({ error: "Release date is required" }, { status: 400 })
  }
  const parsedDate = new Date(releaseDate)
  if (isNaN(parsedDate.getTime())) {
    return NextResponse.json({ error: "Invalid release date" }, { status: 400 })
  }

  // Validate optional array fields
  const toStringArray = (val: unknown): string[] => {
    if (!val) return []
    if (Array.isArray(val)) return val.filter((s) => typeof s === "string" && s.trim()).map((s) => s.trim())
    return []
  }

  // Generate unique slug
  const baseSlug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  let slug = baseSlug
  let existing = await prisma.game.findFirst({ where: { slug } })
  while (existing) {
    slug = `${baseSlug}-${crypto.randomBytes(3).toString("hex")}`
    existing = await prisma.game.findFirst({ where: { slug } })
  }

  // Generate externalId
  const externalId = `user-${user.id}-${Date.now()}`

  const isAdmin = user.role === "ADMIN"

  const game = await prisma.game.create({
    data: {
      externalId,
      gameType,
      title: title.trim(),
      slug,
      description: description?.trim() || null,
      coverImage: coverImage.trim(),
      releaseDate: parsedDate,
      genres: toStringArray(genres),
      platforms: toStringArray(platforms),
      developers: toStringArray(developers),
      publishers: toStringArray(publishers),
      requestStatus: isAdmin ? "APPROVED" : "PENDING",
    },
  })

  return NextResponse.json(game, { status: 201 })
}
