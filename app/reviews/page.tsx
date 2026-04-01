"use client"
import { useEffect, useState, Suspense } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import {
  Star,
  Play,
  Bookmark,
  Trophy,
  Clock,
  Pencil,
  ArrowLeft,
  X,
  Trash2,
} from "lucide-react"
import { fetchWithLimit } from "@/lib/fetch-with-limit"

// ── Types ────────────────────────────────────────────────────────────

interface ReviewWithGame {
  gameId: string
  userId: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  lastUpdateAt: string
  game: {
    id: string
    title: string
    slug: string
    coverImage: string | null
    releaseDate: string | null
    genres: string[]
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

const STATUS_TABS = [
  { key: "", label: "All", icon: Star, color: "text-white" },
  { key: "PLAYING", label: "Playing", icon: Play, color: "text-green-400" },
  { key: "WANT_TO_PLAY", label: "Want to Play", icon: Bookmark, color: "text-blue-400" },
  { key: "COMPLETED", label: "Completed", icon: Trophy, color: "text-yellow-400" },
  { key: "PLAYED", label: "Played", icon: Clock, color: "text-gray-400" },
]

function statusLabel(s: string) {
  return STATUS_TABS.find((t) => t.key === s)?.label ?? s
}

// ── Component ────────────────────────────────────────────────────────

export default function ReviewsPageWrapper() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-gray-500">Loading...</div>}>
      <ReviewsPage />
    </Suspense>
  )
}

function ReviewsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentStatus = searchParams.get("status") || ""

  const [reviews, setReviews] = useState<ReviewWithGame[]>([])
  const [loading, setLoading] = useState(true)

  // Edit modal state
  const [editing, setEditing] = useState<ReviewWithGame | null>(null)
  const [formRating, setFormRating] = useState<number | "">("")
  const [formStatus, setFormStatus] = useState("PLAYING")
  const [formContent, setFormContent] = useState("")
  const [formBroadcast, setFormBroadcast] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!session) return
    setLoading(true)
    const params = currentStatus ? `?status=${currentStatus}` : ""
    fetch(`/api/reviews${params}`)
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setReviews(data) })
      .finally(() => setLoading(false))
  }, [session, currentStatus])

  if (authStatus === "loading") return null

  if (!session) {
    router.push("/login")
    return null
  }

  function switchTab(status: string) {
    const url = status ? `/reviews?status=${status}` : "/reviews"
    router.replace(url, { scroll: false })
  }

  function openEdit(review: ReviewWithGame) {
    setEditing(review)
    setFormRating(review.rating ?? "")
    setFormStatus(review.status)
    setFormContent(review.content ?? "")
    setFormBroadcast(false)
  }

  async function handleSave() {
    if (!editing) return
    setSubmitting(true)

    const res = await fetchWithLimit(`/api/games/${editing.gameId}/review`, {
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
      setEditing(null)
      // Refresh reviews
      const params = currentStatus ? `?status=${currentStatus}` : ""
      const data = await fetch(`/api/reviews${params}`).then((r) => r.json())
      if (Array.isArray(data)) setReviews(data)
    }
    setSubmitting(false)
  }

  async function handleDelete(gameId: string) {
    if (!confirm("Delete this review? This cannot be undone.")) return
    const res = await fetchWithLimit(`/api/games/${gameId}/review`, { method: "DELETE" })
    if (res.ok) {
      setEditing(null)
      const params = currentStatus ? `?status=${currentStatus}` : ""
      const data = await fetch(`/api/reviews${params}`).then((r) => r.json())
      if (Array.isArray(data)) setReviews(data)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="text-3xl font-bold">Your Reviews</h1>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_TABS.map(({ key, label, icon: Icon, color }) => (
          <button
            key={key}
            onClick={() => switchTab(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === key
                ? "border-blue-500 bg-blue-600/10 text-blue-400"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            <Icon className={`h-3.5 w-3.5 ${currentStatus === key ? "text-blue-400" : color}`} />
            {label}
          </button>
        ))}
      </div>

      {/* Reviews list */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading...</div>
      ) : reviews.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="text-lg">No reviews in this category</p>
          <p className="mt-1 text-sm">
            <Link href="/library/videogames" className="text-blue-400 hover:underline">
              Browse the library
            </Link>{" "}
            to find games to review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <div
              key={review.gameId}
              className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-900 p-4"
            >
              {/* Cover thumbnail */}
              <Link
                href={`/library/videogames/${review.game.slug}`}
                className="shrink-0"
              >
                <div className="h-20 w-14 overflow-hidden rounded border border-gray-700 bg-gray-800">
                  {review.game.coverImage ? (
                    <img
                      src={review.game.coverImage}
                      alt={review.game.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-[10px] text-gray-600">
                      N/A
                    </div>
                  )}
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link
                  href={`/library/videogames/${review.game.slug}`}
                  className="font-semibold hover:text-blue-400 line-clamp-1"
                >
                  {review.game.title}
                </Link>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <span className="rounded-full border border-gray-600 px-2 py-0.5">
                    {statusLabel(review.status)}
                  </span>
                  {review.rating !== null && (
                    <span className="flex items-center gap-0.5 text-yellow-400">
                      <Star className="h-3 w-3 fill-current" />
                      {review.rating}/10
                    </span>
                  )}
                  <span>{new Date(review.lastUpdateAt).toLocaleDateString("en-UK", { year: "numeric", month: "short", day: "numeric" })}</span>
                </div>
                {review.content && (
                  <p className="mt-1 text-sm text-gray-400 line-clamp-1">
                    {review.content}
                  </p>
                )}
              </div>

              {/* Edit / Delete buttons */}
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => openEdit(review)}
                  className="rounded border border-gray-600 p-2 text-gray-400 hover:border-gray-400 hover:text-white"
                  title="Edit review"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDelete(review.gameId)}
                  className="rounded border border-red-500/40 p-2 text-red-400 hover:bg-red-500/10"
                  title="Delete review"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200">
                Edit: {editing.game.title}
              </h3>
              <button
                onClick={() => setEditing(null)}
                className="text-gray-500 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-gray-400">Status</label>
                <select
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value)}
                  className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
                >
                  {STATUS_TABS.filter((t) => t.key).map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-gray-400">Rating (1-10)</label>
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
              <label className="mb-1 block text-xs text-gray-400">Review</label>
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
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => editing && handleDelete(editing.gameId)}
                className="rounded border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 mr-auto"
              >
                Delete
              </button>
              <button
                onClick={() => setEditing(null)}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={submitting}
                className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
