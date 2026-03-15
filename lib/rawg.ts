/**
 * Fetches ~3000 games from the RAWG API and saves raw JSON to disk.
 *
 * Usage:  npx tsx lib/rawg.ts
 *
 * Two phases:
 *   1. List fetch  – 75 pages × 40 results (fast, ~75 requests)
 *   2. Detail fetch – one request per game for developers/publishers
 *      (slower, uses concurrency pool + delay to stay under rate limits)
 *
 * Output: lib/rawg-data.json
 */

import "dotenv/config";
import { writeFileSync, existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_PATH = resolve(__dirname, "rawg-data.json");

const API_KEY = process.env.RAWG_API_KEY;
if (!API_KEY) {
  console.error("Missing RAWG_API_KEY in environment");
  process.exit(1);
}

const BASE = "https://api.rawg.io/api";
const PAGE_SIZE = 40;
const TOTAL_GAMES = 3000;
const TOTAL_PAGES = Math.ceil(TOTAL_GAMES / PAGE_SIZE); // 75
const CONCURRENCY = 5;
const DELAY_MS = 200; // ms between batches to respect rate limits

// ── Types (only the fields we care about) ────────────────────────────

interface RawgListGame {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  genres: { id: number; name: string }[];
  platforms: { platform: { id: number; name: string } }[] | null;
}

interface RawgDetailGame extends RawgListGame {
  description_raw: string | null;
  developers: { id: number; name: string }[];
  publishers: { id: number; name: string }[];
}

export interface RawgGameFull {
  id: number;
  slug: string;
  name: string;
  released: string | null;
  background_image: string | null;
  description_raw: string | null;
  genres: string[];
  platforms: string[];
  developers: string[];
  publishers: string[];
}

// ── Helpers ──────────────────────────────────────────────────────────

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} – ${url}`);
  return res.json() as Promise<T>;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Run async tasks with a concurrency limit + delay between batches. */
async function pooled<T, R>(
  items: T[],
  concurrency: number,
  delayMs: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) await sleep(delayMs);
  }
  return results;
}

// ── Phase 1: List fetch ──────────────────────────────────────────────

async function fetchList(): Promise<RawgListGame[]> {
  const games: RawgListGame[] = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const url = `${BASE}/games?key=${API_KEY}&page=${page}&page_size=${PAGE_SIZE}&ordering=-rating`;
    console.log(`[list] page ${page}/${TOTAL_PAGES}…`);
    const data = await fetchJson<{ results: RawgListGame[] }>(url);
    games.push(...data.results);
    if (page < TOTAL_PAGES) await sleep(100);
  }

  return games.slice(0, TOTAL_GAMES);
}

// ── Phase 2: Detail fetch ────────────────────────────────────────────

async function fetchDetail(gameId: number): Promise<RawgDetailGame | null> {
  try {
    return await fetchJson<RawgDetailGame>(
      `${BASE}/games/${gameId}?key=${API_KEY}`,
    );
  } catch (err) {
    console.warn(`[detail] failed for game ${gameId}: ${err}`);
    return null;
  }
}

function mergeGameData(
  list: RawgListGame,
  detail: RawgDetailGame | null,
): RawgGameFull {
  return {
    id: list.id,
    slug: list.slug,
    name: list.name,
    released: list.released,
    background_image: list.background_image,
    description_raw: detail?.description_raw ?? null,
    genres: list.genres.map((g) => g.name),
    platforms: list.platforms?.map((p) => p.platform.name) ?? [],
    developers: detail?.developers?.map((d) => d.name) ?? [],
    publishers: detail?.publishers?.map((p) => p.name) ?? [],
  };
}

// ── Main ─────────────────────────────────────────────────────────────

async function main() {
  // If we already have list data cached, skip phase 1
  let listGames: RawgListGame[];
  const listCachePath = resolve(__dirname, "rawg-list-cache.json");

  if (existsSync(listCachePath)) {
    console.log("[list] Using cached list data…");
    listGames = JSON.parse(readFileSync(listCachePath, "utf-8"));
  } else {
    console.log("[list] Fetching game list from RAWG…");
    listGames = await fetchList();
    writeFileSync(listCachePath, JSON.stringify(listGames, null, 2));
    console.log(`[list] Cached ${listGames.length} games to ${listCachePath}`);
  }

  // Phase 2: fetch details
  console.log(
    `[detail] Fetching details for ${listGames.length} games (concurrency=${CONCURRENCY})…`,
  );

  let completed = 0;
  const fullGames = await pooled(
    listGames,
    CONCURRENCY,
    DELAY_MS,
    async (game) => {
      const detail = await fetchDetail(game.id);
      completed++;
      if (completed % 100 === 0)
        console.log(`[detail] ${completed}/${listGames.length}`);
      return mergeGameData(game, detail);
    },
  );

  writeFileSync(OUTPUT_PATH, JSON.stringify(fullGames, null, 2));
  console.log(`\nDone! Wrote ${fullGames.length} games to ${OUTPUT_PATH}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
