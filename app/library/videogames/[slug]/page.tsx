"use client"
import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Star,
  Calendar,
  Cpu,
  Building2,
  Megaphone,
  ArrowLeft,
  Pencil,
  Trash2,
  ShieldAlert,
} from "lucide-react"
import { proxiedImageUrl } from "@/lib/image-proxy"
import BanBanner from "@/app/_components/BanBanner"
import { Role } from "@/generated/prisma"

// ── Types ────────────────────────────────────────────────────────────

interface ReviewItem {
  gameId: string
  userId: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  lastUpdateAt: string
  createByUser: { id: number; name: string; avatar: string | null }
}

interface GameDetail {
  id: string
  title: string
  slug: string
  description: string | null
  coverImage: string | null
  releaseDate: string | null
  genres: string[]
  platforms: string[]
  developers: string[]
  publishers: string[]
  avgRating: number | null
  ratingCount: number
  reviews: ReviewItem[]
}

// ── Helpers ──────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "PLAYING", label: "Playing" },
  { value: "WANT_TO_PLAY", label: "Want to Play" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PLAYED", label: "Played" },
]

function statusLabel(s: string) {
  return STATUS_OPTIONS.find((o) => o.value === s)?.label ?? s
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// ── Component ────────────────────────────────────────────────────────

export default function GameDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { data: session } = useSession()

  const [game, setGame] = useState<GameDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  // Review form state
  const [showForm, setShowForm] = useState(false)
  const [formRating, setFormRating] = useState<number | "">("")
  const [formStatus, setFormStatus] = useState("PLAYING")
  const [formContent, setFormContent] = useState("")
  const [formBroadcast, setFormBroadcast] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const router = useRouter()

  const myUserId = session?.user?.id ? parseInt(session.user.id, 10) : null
  const myReview = game?.reviews.find((r) => r.userId === myUserId) ?? null
  const isBanned = session?.user?.banned === true
  const isAdmin = session?.user?.role === Role.ADMIN

  useEffect(() => {
    setLoading(true)
    fetch(`/api/games/${slug}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then(setGame)
      .catch(() => setError("Game not found"))
      .finally(() => setLoading(false))
  }, [slug])

  function openReviewForm() {
    if (isBanned) {
      alert("Action not allowed. You're currently banned.")
      return
    }
    if (myReview) {
      setFormRating(myReview.rating ?? "")
      setFormStatus(myReview.status)
      setFormContent(myReview.content ?? "")
    } else {
      setFormRating("")
      setFormStatus("PLAYING")
      setFormContent("")
    }
    setFormBroadcast(false)
    setShowForm(true)
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!game) return
    if (isBanned) {
      alert("Action not allowed. You're currently banned.")
      return
    }
    setSubmitting(true)

    const res = await fetch(`/api/games/${game.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rating: formRating === "" ? null : Number(formRating),
        status: formStatus,
        content: formContent,
        broadcast: formBroadcast,
      }),
    })

    if (res.ok) {
      setShowForm(false)
      // Refresh game data
      const updated = await fetch(`/api/games/${slug}`).then((r) => r.json())
      setGame(updated)
    }
    setSubmitting(false)
  }

  async function handleDeleteReview() {
    if (!game || !myReview) return
    if (isBanned) {
      alert("Action not allowed. You're currently banned.")
      return
    }
    if (!confirm("Delete your review? This cannot be undone.")) return

    const res = await fetch(`/api/games/${game.id}/review`, { method: "DELETE" })
    if (res.ok) {
      setShowForm(false)
      const updated = await fetch(`/api/games/${slug}`).then((r) => r.json())
      setGame(updated)
    }
  }

  async function handleDeleteGame() {
    if (!game) return
    if (!confirm(`Delete "${game.title}"? This will remove all reviews and broadcasts and cannot be undone.`)) return
    const res = await fetch(`/api/games/${game.id}`, { method: "DELETE" })
    if (res.ok) router.push("/library/videogames")
  }

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (error || !game) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        <p className="text-lg">{error || "Game not found"}</p>
        <Link
          href="/library/videogames"
          className="mt-4 inline-flex items-center gap-1 text-blue-400 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" /> Back to library
        </Link>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      {/* Back link */}
      <Link
        href="/library/videogames"
        className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" /> Back to library
      </Link>

      <BanBanner />

      {/* Hero section */}
      <div className="flex flex-col md:flex-row gap-8">
        {/* Cover */}
        <div className="w-full md:w-64 shrink-0">
          <div className="aspect-[3/4] overflow-hidden rounded-lg border border-gray-700 bg-gray-800">
            {game.coverImage ? (
              <img
                src={proxiedImageUrl(game.coverImage)!}
                alt={game.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-gray-600">
                No image
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold">{game.title}</h1>

          {/* Rating summary */}
          <div className="flex items-center gap-3">
            {game.avgRating !== null && (
              <span className="flex items-center gap-1 text-lg text-yellow-400">
                <Star className="h-5 w-5 fill-current" />
                {game.avgRating.toFixed(1)}
              </span>
            )}
            <span className="text-sm text-gray-500">
              {game.ratingCount} {game.ratingCount === 1 ? "rating" : "ratings"}
            </span>
          </div>

          {/* Metadata */}
          <div className="space-y-2 text-sm text-gray-400">
            {game.releaseDate && (
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-500" />
                {formatDate(game.releaseDate)}
              </div>
            )}
            {game.genres.length > 0 && (
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-gray-500" />
                {game.genres.join(", ")}
              </div>
            )}
            {game.platforms.length > 0 && (
              <div className="flex items-center gap-2">
                <Cpu className="h-4 w-4 text-gray-500" />
                {game.platforms.join(", ")}
              </div>
            )}
            {game.developers.length > 0 && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-500" />
                {game.developers.join(", ")}
              </div>
            )}
            {game.publishers.length > 0 && (
              <div className="flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-gray-500" />
                {game.publishers.join(", ")}
              </div>
            )}
          </div>

          {/* Description */}
          {game.description && (
            <p className="text-sm text-gray-300 leading-relaxed max-w-2xl line-clamp-6">
              {game.description}
            </p>
          )}

          {/* Admin delete */}
          {isAdmin && (
            <div>
              <button
                onClick={handleDeleteGame}
                className="inline-flex items-center gap-2 rounded border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                <ShieldAlert className="h-4 w-4" />
                Delete Game
              </button>
            </div>
          )}

          {/* Review actions */}
          {session && (
            <div className="flex items-center gap-3">
              <button
                onClick={openReviewForm}
                className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Pencil className="h-4 w-4" />
                {myReview ? "Edit your review" : "Write a review"}
              </button>
              {myReview && (
                <button
                  onClick={handleDeleteReview}
                  className="inline-flex items-center gap-2 rounded border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                  Delete Your Review
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Review form */}
      {showForm && session && (
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4 max-w-2xl">
          <h3 className="font-semibold text-gray-200">
            {myReview ? "Edit Review" : "New Review"}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Status *
                </label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Rating (1-10, optional)
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={formRating}
                  onChange={(e) =>
                    setFormRating(e.target.value === "" ? "" : Number(e.target.value))
                  }
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">
                Review (optional)
              </label>
              <textarea
                value={formContent}
                onChange={(e) => setFormContent(e.target.value)}
                rows={4}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none resize-none"
                placeholder="What did you think?"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={formBroadcast}
                onChange={(e) => setFormBroadcast(e.target.checked)}
                className="rounded border-gray-600 bg-gray-800"
              />
              Broadcast this review
            </label>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : myReview ? "Update" : "Submit"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Reviews list */}
      <section>
        <h2 className="mb-4 text-lg font-semibold text-gray-300">
          Reviews ({game.reviews.length})
        </h2>
        {game.reviews.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center text-gray-500 space-y-3">
            <p>No reviews yet. Be the first!</p>
            {!session && (
              <div className="flex items-center justify-center gap-3">
                <Link
                  href="/login"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Sign in
                </Link>
                <span className="text-sm text-gray-500">
                  or{" "}
                  <Link href="/register" className="text-blue-400 hover:underline">
                    register
                  </Link>
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {game.reviews.map((review) => (
              <div
                key={`${review.gameId}-${review.userId}`}
                className="rounded-lg border border-gray-700 bg-gray-900 p-5 space-y-2"
              >
                {/* Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link href={`/user/${review.createByUser.id}`} className="shrink-0">
                      <div className="h-8 w-8 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 overflow-hidden">
                        {review.createByUser.avatar ? (
                          <img src={proxiedImageUrl(review.createByUser.avatar)!} alt={review.createByUser.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          review.createByUser.name[0].toUpperCase()
                        )}
                      </div>
                    </Link>
                    <Link href={`/user/${review.createByUser.id}`} className="font-semibold hover:text-blue-400">
                      {review.createByUser.name}
                    </Link>
                    <span className="rounded-full border border-gray-600 px-2 py-0.5 text-xs text-gray-400">
                      {statusLabel(review.status)}
                    </span>
                    {review.userId === myUserId && (
                      <span className="text-xs text-blue-400">You</span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {review.rating !== null && (
                      <span className="flex items-center gap-1 text-sm text-yellow-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {review.rating}/10
                      </span>
                    )}
                  </div>
                </div>

                {/* Content */}
                {review.content && (
                  <p className="text-sm text-gray-300">{review.content}</p>
                )}

                {/* Date */}
                <p className="text-xs text-gray-600">
                  {formatDate(review.createAt)}
                  {review.lastUpdateAt !== review.createAt && (
                    <> &middot; edited {formatDate(review.lastUpdateAt)}</>
                  )}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
