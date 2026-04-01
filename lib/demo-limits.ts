import { prisma } from "@/lib/prisma"

/**
 * Demo table size limits.
 * Any write that would push a table past its limit is rejected.
 */
export const DEMO_LIMITS = {
  User:             10,
  Follow:           90,
  BroadcastLike:    1000,
  BroadcastComment: 1000,
  Broadcast:        1000,
  GameReview:       250,
  Game:             3100,
  InvitationCode:   10,
  Block:            90,
} as const

export type LimitedTable = keyof typeof DEMO_LIMITS

const DEMO_LIMIT_ERROR = "Operation not allowed. Exceeding demo table size."

/**
 * Returns an error response payload if the table is at or over its limit,
 * or null if the write can proceed.
 *
 * Usage:
 *   const limitErr = await checkDemoLimit("GameReview")
 *   if (limitErr) return NextResponse.json(limitErr, { status: 403 })
 */
export async function checkDemoLimit(
  table: LimitedTable,
): Promise<{ error: string } | null> {
  const limit = DEMO_LIMITS[table]

  let count: number

  switch (table) {
    case "User":
      count = await prisma.user.count()
      break
    case "Follow":
      count = await prisma.follow.count()
      break
    case "BroadcastLike":
      count = await prisma.broadcastLike.count()
      break
    case "BroadcastComment":
      count = await prisma.broadcastComment.count()
      break
    case "Broadcast":
      count = await prisma.broadcast.count()
      break
    case "GameReview":
      count = await prisma.gameReview.count()
      break
    case "Game":
      count = await prisma.game.count()
      break
    case "InvitationCode":
      count = await prisma.invitationCode.count()
      break
    case "Block":
      count = await prisma.block.count()
      break
  }

  if (count >= limit) {
    return { error: DEMO_LIMIT_ERROR }
  }
  return null
}
