"use client"
import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Star,
  Heart,
  MessageCircle,
  Trash2,
  ArrowLeft,
  Megaphone,
} from "lucide-react"
import STATUS_CONFIG from "@/app/_types/GameStatus"
import { fetchWithLimit } from "@/lib/fetch-with-limit"

// ── Types ────────────────────────────────────────────────────────────

interface MyBroadcastItem {
  id: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  likedByMe: boolean
  game: { id: string; title: string; slug: string }
  _count: { comments: number; likes: number }
}

interface BroadcastComment {
  id: number
  content: string
  createdAt: string
  createByUser: { id: number; name: string; avatar: string | null }
}

// ── Helpers ──────────────────────────────────────────────────────────

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

function statusLabel(s: string) {
  return STATUS_CONFIG.find((c) => c.key === s)?.label ?? s
}

// ── Component ────────────────────────────────────────────────────────

export default function BroadcastsPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [broadcasts, setBroadcasts] = useState<MyBroadcastItem[]>([])
  const [loading, setLoading] = useState(true)
  const [openComments, setOpenComments] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, BroadcastComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")

  const loadBroadcasts = useCallback(() => {
    setLoading(true)
    fetch("/api/broadcasts/mine")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setBroadcasts(data) })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!session) return
    loadBroadcasts()
  }, [session, loadBroadcasts])

  if (authStatus === "loading") return null

  if (!session) {
    router.push("/login")
    return null
  }

  async function handleLike(broadcastId: number) {
    await fetchWithLimit(`/api/broadcasts/${broadcastId}/like`, { method: "POST" })
    loadBroadcasts()
  }

  async function handleDelete(broadcastId: number) {
    if (!confirm("Delete this broadcast? This cannot be undone.")) return
    const res = await fetchWithLimit(`/api/broadcasts/${broadcastId}`, { method: "DELETE" })
    if (res.ok) loadBroadcasts()
  }

  async function loadBroadcastComments(broadcastId: number) {
    const res = await fetch(`/api/broadcasts/${broadcastId}/reply`)
    if (res.ok) {
      const data = await res.json()
      setComments((prev) => ({ ...prev, [broadcastId]: data }))
    }
  }

  function toggleComments(broadcastId: number) {
    if (openComments === broadcastId) {
      setOpenComments(null)
    } else {
      setOpenComments(broadcastId)
      loadBroadcastComments(broadcastId)
    }
    setReplyingTo(null)
    setReplyText("")
  }

  async function handleReply(broadcastId: number) {
    if (!replyText.trim()) return
    await fetchWithLimit(`/api/broadcasts/${broadcastId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText.trim() }),
    })
    setReplyText("")
    setReplyingTo(null)
    loadBroadcastComments(broadcastId)
    loadBroadcasts()
  }

  return (
    <div className="container mx-auto px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <Megaphone className="h-7 w-7" />
          My Broadcasts
        </h1>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-20 text-center text-gray-500">Loading...</div>
      ) : broadcasts.length === 0 ? (
        <div className="py-20 text-center text-gray-500">
          <p className="text-lg">No broadcasts yet</p>
          <p className="mt-1 text-sm">
            Tick &quot;Broadcast&quot; when writing a review to share it with the world.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {broadcasts.map((b) => (
            <div
              key={b.id}
              className="rounded-lg border border-gray-700 bg-gray-900 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>{statusLabel(b.status)}</span>
                    {b.rating !== null && (
                      <span className="flex items-center gap-0.5 text-yellow-400">
                        <Star className="h-3 w-3 fill-current" />
                        {b.rating}/10
                      </span>
                    )}
                    <span>&middot; {timeAgo(b.createAt)}</span>
                  </div>
                  <Link
                    href={`/library/videogames/${b.game.slug}`}
                    className="block text-sm font-semibold text-blue-400 hover:underline"
                  >
                    {b.game.title}
                  </Link>
                  {b.content && (
                    <p className="text-sm text-gray-300">{b.content}</p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-gray-500 pt-1">
                    <button
                      onClick={() => handleLike(b.id)}
                      className={`inline-flex items-center gap-1 hover:text-red-400 transition-colors ${b.likedByMe ? "text-red-400" : ""}`}
                    >
                      <Heart className={`h-3 w-3 ${b.likedByMe ? "fill-current" : ""}`} /> {b._count.likes}
                    </button>
                    <button
                      onClick={() => toggleComments(b.id)}
                      className="inline-flex items-center gap-1 hover:text-blue-400 transition-colors"
                    >
                      <MessageCircle className="h-3 w-3" /> {b._count.comments}
                    </button>
                  </div>

                  {/* Comments */}
                  {openComments === b.id && (
                    <div className="pt-2 space-y-2">
                      {(comments[b.id] || []).length === 0 ? (
                        <p className="text-xs text-gray-600">No replies yet.</p>
                      ) : (
                        <>
                          {(expandedComments.has(b.id)
                            ? comments[b.id]
                            : (comments[b.id] || []).slice(0, 10)
                          ).map((c) => (
                            <div key={c.id} className="flex items-start gap-2">
                              <Link href={`/user/${c.createByUser.id}`} className="shrink-0">
                                <div className="h-5 w-5 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                                  {c.createByUser.avatar ? (
                                    <img src={c.createByUser.avatar} alt={c.createByUser.name} className="h-full w-full object-cover" />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center text-[8px] font-bold text-gray-400">
                                      {c.createByUser.name[0].toUpperCase()}
                                    </div>
                                  )}
                                </div>
                              </Link>
                              <div className="min-w-0">
                                <Link
                                  href={`/user/${c.createByUser.id}`}
                                  className="text-xs font-semibold text-gray-300 hover:text-blue-400 transition-colors"
                                >
                                  {c.createByUser.name}
                                </Link>
                                <span className="ml-2 text-xs text-gray-600">{timeAgo(c.createdAt)}</span>
                                <p className="text-xs text-gray-400 break-words">{c.content}</p>
                              </div>
                            </div>
                          ))}
                          {!expandedComments.has(b.id) && (comments[b.id] || []).length > 10 && (
                            <button
                              onClick={() => setExpandedComments((prev) => new Set(prev).add(b.id))}
                              className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              Show more ({(comments[b.id] || []).length - 10} more replies)
                            </button>
                          )}
                        </>
                      )}
                      <div className="flex gap-2 pt-1">
                        <input
                          value={replyingTo === b.id ? replyText : ""}
                          onFocus={() => setReplyingTo(b.id)}
                          onChange={(e) => { setReplyingTo(b.id); setReplyText(e.target.value) }}
                          placeholder="Write a reply..."
                          className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                        />
                        <button
                          onClick={() => handleReply(b.id)}
                          className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                        >
                          Reply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(b.id)}
                  className="shrink-0 rounded border border-red-500/40 p-2 text-red-400 hover:bg-red-500/10 transition-colors"
                  title="Delete broadcast"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}