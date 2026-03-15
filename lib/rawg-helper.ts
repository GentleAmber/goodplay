/**
 * Reads the raw RAWG JSON produced by rawg.ts and upserts games into
 * the database, mapping fields to the Game table schema.
 *
 * Usage:  npx tsx lib/rawg-helper.ts
 */

import "dotenv/config";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { PrismaClient } from "../generated/prisma/index.js";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import type { RawgGameFull } from "./rawg.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = resolve(__dirname, "rawg-data.json");
const BATCH_SIZE = 50;

// ── Prisma setup (mirrors lib/prisma.ts but standalone for scripts) ──

const pool = new Pool({ connectionString: process.env.DATABASE_URL! });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Transform ────────────────────────────────────────────────────────

function toGameInput(raw: RawgGameFull) {
  return {
    externalId: String(raw.id),
    gameType: "VIDEO_GAME" as const,
    title: raw.name,
    slug: raw.slug,
    description: raw.description_raw ?? null,
    coverImage: raw.background_image ?? null,
    releaseDate: raw.released ? new Date(raw.released) : null,
    genres: raw.genres,
    platforms: raw.platforms,
    developers: raw.developers,
    publishers: raw.publishers,
    requestStatus: "APPROVED" as const,
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  const raw: RawgGameFull[] = JSON.parse(readFileSync(DATA_PATH, "utf-8"));
  console.log(`Loaded ${raw.length} games from ${DATA_PATH}`);

  // Collect externalIds that already exist so we can skip duplicates
  const existingGames = await prisma.game.findMany({
    where: { externalId: { in: raw.map((g) => String(g.id)) } },
    select: { externalId: true },
  });
  const existingIds = new Set(existingGames.map((g) => g.externalId));
  const toInsert = raw.filter((g) => !existingIds.has(String(g.id)));

  console.log(
    `${existingIds.size} already in DB, ${toInsert.length} to insert`,
  );

  let created = 0;

  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE);

    await prisma.$transaction(
      batch.map((game) => prisma.game.create({ data: toGameInput(game) })),
    );

    created += batch.length;
    console.log(`[insert] ${created}/${toInsert.length}`);
  }

  console.log(
    `\nDone! Inserted ${created} games (${existingIds.size} already existed).`,
  );

  await prisma.$disconnect();
  await pool.end();
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  await pool.end();
  process.exit(1);
});
