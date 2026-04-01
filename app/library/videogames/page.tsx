"use client"
import { useEffect, useState, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Star,
  SlidersHorizontal,
  X,
  Trash2,
} from "lucide-react"
import { proxiedImageUrl } from "@/lib/image-proxy"
import { useSession } from "next-auth/react"
import { Role } from "@/generated/prisma"

// ── Types ────────────────────────────────────────────────────────────

interface GameCard {
  id: string
  title: string
  slug: string
  coverImage: string | null
  releaseDate: string | null
  genres: string[]
  developers: string[]
  avgRating: number | null
  _count: { reviews: number }
}

interface SearchResult {
  games: GameCard[]
  total: number
  page: number
  totalPages: number
}

// ── Component ────────────────────────────────────────────────────────

export default function VideogamesLibrary() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session } = useSession()

  const isAdmin = session?.user?.role === Role.ADMIN

  // Read initial values from URL
  const [q, setQ] = useState(searchParams.get("q") || "")
  const [genre, setGenre] = useState(searchParams.get("genre") || "")
  const [developer, setDeveloper] = useState(searchParams.get("developer") || "")
  const [publisher, setPublisher] = useState(searchParams.get("publisher") || "")
  const [releaseFrom, setReleaseFrom] = useState(searchParams.get("releaseFrom") || "")
  const [releaseTo, setReleaseTo] = useState(searchParams.get("releaseTo") || "")
  const [page, setPage] = useState(parseInt(searchParams.get("page") || "1", 10))
  const [showFilters, setShowFilters] = useState(false)

  const [data, setData] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(true)

  // Admin batch-delete state
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [deleting, setDeleting] = useState(false)

  const fetchGames = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set("q", q)
    if (genre) params.set("genre", genre)
    if (developer) params.set("developer", developer)
    if (publisher) params.set("publisher", publisher)
    if (releaseFrom) params.set("releaseFrom", releaseFrom)
    if (releaseTo) params.set("releaseTo", releaseTo)
    params.set("page", String(page))

    // Sync URL
    router.replace(`/library/videogames?${params.toString()}`, { scroll: false })

    fetch(`/api/games?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false))
  }, [q, genre, developer, publisher, releaseFrom, releaseTo, page, router])

  useEffect(() => {
    fetchGames()
  }, [fetchGames])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
  }

  async function handleBatchDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} game(s)? This will remove all their reviews and broadcasts and cannot be undone.`)) return
    setDeleting(true)
    await fetch("/api/games", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: Array.from(selected) }),
    })
    setSelected(new Set())
    setDeleting(false)
    fetchGames()
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function clearFilters() {
    setQ("")
    setGenre("")
    setDeveloper("")
    setPublisher("")
    setReleaseFrom("")
    setReleaseTo("")
    setPage(1)
  }

  const hasFilters = genre || developer || publisher || releaseFrom || releaseTo

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Game Library</h1>
        <p className="mt-1 text-gray-400">
          Browse and discover games{data ? ` \u2014 ${data.total.toLocaleString()} games` : ""}
        </p>
        <p className="mt-1 text-gray-400">Data sourced from <a href="https://rawg.io" target="_blank" className="hyperlink">rawg.io/</a> as well as contributed by our users</p>
      </div>

      {/* Search bar + filter toggle */}
      <form onSubmit={handleSearch} className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title..."
            className="w-full rounded border border-gray-600 bg-gray-800 py-2.5 pl-10 pr-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded border px-4 py-2.5 text-sm font-medium ${
            showFilters || hasFilters
              ? "border-blue-500 text-blue-400"
              : "border-gray-600 text-gray-300 hover:bg-gray-800"
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasFilters && (
            <span className="ml-1 rounded-full bg-blue-600 px-1.5 py-0.5 text-xs text-white">
              !
            </span>
          )}
        </button>
      </form>

      {/* Filters panel */}
      {showFilters && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Filters</h3>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white"
              >
                <X className="h-3 w-3" /> Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Genre</label>
              <input
                value={genre}
                onChange={(e) => { setGenre(e.target.value); setPage(1) }}
                placeholder="e.g. Action"
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Developer</label>
              <input
                value={developer}
                onChange={(e) => { setDeveloper(e.target.value); setPage(1) }}
                placeholder="e.g. Nintendo"
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Publisher</label>
              <input
                value={publisher}
                onChange={(e) => { setPublisher(e.target.value); setPage(1) }}
                placeholder="e.g. Sony"
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="mb-1 block text-xs text-gray-400">Release Date</label>
              <div className="flex gap-2">
                <input
                  type="date"
                  value={releaseFrom}
                  onChange={(e) => { setReleaseFrom(e.target.value); setPage(1) }}
                  className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
                <input
                  type="date"
                  value={releaseTo}
                  onChange={(e) => { setReleaseTo(e.target.value); setPage(1) }}
                  className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results grid */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading...</div>
      ) : !data || data.games.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="text-lg">No games found</p>
          <p className="mt-1 text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <>
          {/* Admin batch-delete toolbar */}
          {isAdmin && selected.size > 0 && (
            <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5">
              <span className="text-sm text-red-300">{selected.size} selected</span>
              <button
                onClick={handleBatchDelete}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {deleting ? "Deleting…" : "Delete selected"}
              </button>
              <button
                onClick={() => setSelected(new Set())}
                className="text-sm text-gray-400 hover:text-white"
              >
                Clear
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5">
            {data.games.map((game) => (
              <div key={game.id} className="group relative space-y-2">
                {/* Admin checkbox */}
                {isAdmin && (
                  <input
                    type="checkbox"
                    checked={selected.has(game.id)}
                    onChange={() => toggleSelect(game.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-2 z-10 h-4 w-4 cursor-pointer rounded border-gray-500 accent-red-500"
                  />
                )}

                <Link href={`/library/videogames/${game.slug}`} className="block">
                  {/* Cover */}
                  <div className={`aspect-[3/4] overflow-hidden rounded-lg border bg-gray-800 transition-colors ${selected.has(game.id) ? "border-red-500" : "border-gray-700"}`}>
                    {game.coverImage ? (
                      <img
                        src={proxiedImageUrl(game.coverImage)!}
                        alt={game.title}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-gray-600 text-xs">
                        No image
                      </div>
                    )}
                  </div>
                </Link>

                {/* Info */}
                <div>
                  <h3 className="text-sm font-semibold leading-tight group-hover:text-blue-400 line-clamp-2">
                    {game.title}
                  </h3>
                  <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                    {game.avgRating !== null && (
                      <span className="flex items-center gap-0.5 text-yellow-400">
                        <Star className="h-3 w-3 fill-current" />
                        {game.avgRating.toFixed(1)}
                      </span>
                    )}
                    {game.releaseDate && (
                      <span>{new Date(game.releaseDate).getFullYear()}</span>
                    )}
                  </div>
                  {game.genres.length > 0 && (
                    <p className="mt-0.5 text-xs text-gray-500 line-clamp-1">
                      {game.genres.slice(0, 3).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 pt-4">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="inline-flex items-center gap-1 rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" /> Prev
              </button>
              <span className="text-sm text-gray-400">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                disabled={page >= data.totalPages}
                className="inline-flex items-center gap-1 rounded border border-gray-600 px-3 py-2 text-sm text-gray-300 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
