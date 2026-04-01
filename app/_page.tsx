"use client"
import { useSession } from "next-auth/react"
import { useEffect, useState, useCallback } from "react"
import { Role } from "@/generated/prisma"
import {
  Gamepad2,
  Star,
  Users,
  Library,
  PlusCircle,
  Heart,
  MessageCircle,
  AlertTriangle,
  Trash2,
  Megaphone,
  X,
  Rss,
} from "lucide-react"
import Link from "next/link"
import STATUS_CONFIG from "@/app/_types/GameStatus"
import BanBanner from "@/app/_components/BanBanner"
import { proxiedImageUrl } from "@/lib/image-proxy"
import { fetchWithLimit } from "@/lib/fetch-with-limit"

// ── Types ────────────────────────────────────────────────────────────

interface ReviewItem {
  gameId: string
  status: string
  rating: number | null
  game: {
    id: string
    title: string
    slug: string
    coverImage: string | null
  }
}

interface UserProfile {
  name: string
  intro: string | null
  avatar: string | null
}

interface BroadcastItem {
  id: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  likedByMe: boolean
  createByUser: { id: number; name: string; avatar: string | null }
  game: { id: string; title: string; coverImage: string | null; slug: string }
  _count: { comments: number; likes: number }
}

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

interface SocialUser {
  id: number
  name: string
  avatar: string | null
}

interface SocialData {
  followerCount: number
  followingCount: number
  followers: SocialUser[]
  following: SocialUser[]
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

export default function Homepage() {
  const { data: session, status } = useSession()

  const [reviewsByStatus, setReviewsByStatus] = useState<Record<string, ReviewItem[]>>({})
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [feed, setFeed] = useState<BroadcastItem[]>([])
  const [myBroadcasts, setMyBroadcasts] = useState<MyBroadcastItem[]>([])
  const [replyingTo, setReplyingTo] = useState<number | null>(null)
  const [replyText, setReplyText] = useState("")
  const [social, setSocial] = useState<SocialData | null>(null)
  const [socialModal, setSocialModal] = useState<"followers" | "following" | null>(null)
  const [openComments, setOpenComments] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, BroadcastComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())

  const isBanned = session?.user?.banned === true
  const isAdmin = session?.user?.role === Role.ADMIN

  function loadFeed() {
    fetch("/api/broadcasts/feed")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setFeed(data) })
  }

  function loadMyBroadcasts() {
    fetch("/api/broadcasts/mine")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setMyBroadcasts(data) })
  }

  useEffect(() => {
    if (!session) return

    // Fetch user profile
    fetch(`/api/users/${session.user.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.name) setProfile({ name: data.name, intro: data.intro, avatar: data.avatar })
      })

    // Fetch reviews for each status
    for (const { key } of STATUS_CONFIG) {
      fetch(`/api/reviews?status=${key}`)
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            setReviewsByStatus((prev) => ({ ...prev, [key]: data }))
          }
        })
    }

    fetch("/api/dashboard/social")
      .then((r) => r.json())
      .then((data) => { if (data.followerCount !== undefined) setSocial(data) })

    loadFeed()
    loadMyBroadcasts()
  }, [session])

  // ── Loading ──

  if (status === "loading") return null

  // ── Logged-out landing ──

  if (!session) {
    return (
      <>
        <section className="container mx-auto px-4 py-20 text-center space-y-6">
          <h1 className="text-5xl font-extrabold tracking-tight lg:text-6xl">
            Your games.{" "}
            <span className="text-gray-500">Tracked.</span>
          </h1>
          <p className="mx-auto max-w-[600px] text-lg text-gray-400">
            Goodplay is the best way to discover, rate, and track your
            video games. Join the community.
          </p>
          <div className="flex justify-center gap-4 flex-wrap">
            <Link
              href="/register"
              className="rounded bg-blue-600 px-5 py-2.5 font-medium text-white hover:bg-blue-700"
            >
              Get started free
            </Link>
            <Link
              href="/library/videogames"
              className="rounded border border-gray-600 px-5 py-2.5 font-medium text-gray-300 hover:bg-gray-800"
            >
              Browse games
            </Link>
          </div>
        </section>

        <section className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Gamepad2, title: "Video Games", description: "Discover and track video games, from the latest releases to all-time classics." },
              { icon: Star, title: "Ratings & Reviews", description: "Rate and review games, track your play status, and build your collection." },
              { icon: Users, title: "Social", description: "Follow friends and discover what the community is playing." },
            ].map(({ icon: Icon, title, description }) => (
              <div key={title} className="rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-3">
                <Icon className="h-6 w-6 text-gray-400" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-sm text-gray-400">{description}</p>
              </div>
            ))}
          </div>
        </section>
      </>
    )
  }

  // ── Logged-in dashboard ──

  async function handleLike(broadcastId: number) {
    if (isBanned) {
      alert("Action not allowed. You're currently banned.")
      return
    }
    await fetchWithLimit(`/api/broadcasts/${broadcastId}/like`, { method: "POST" })
    loadFeed()
    loadMyBroadcasts()
  }

  async function handleDeleteBroadcast(broadcastId: number) {
    if (!confirm("Delete this broadcast? This cannot be undone.")) return
    const res = await fetchWithLimit(`/api/broadcasts/${broadcastId}`, { method: "DELETE" })
    if (res.ok) loadMyBroadcasts()
  }

  async function loadComments(broadcastId: number) {
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
      loadComments(broadcastId)
    }
    setReplyingTo(null)
    setReplyText("")
  }

  async function handleReply(broadcastId: number) {
    if (isBanned) {
      alert("Action not allowed. You're currently banned.")
      return
    }
    if (!replyText.trim()) return
    await fetchWithLimit(`/api/broadcasts/${broadcastId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText.trim() }),
    })
    setReplyText("")
    setReplyingTo(null)
    loadComments(broadcastId)
    loadFeed()
    loadMyBroadcasts()
  }

  // Status display order: Playing, Want to Play, Played, Completed
  const STATUS_ORDER = ["PLAYING", "WANT_TO_PLAY", "PLAYED", "COMPLETED"] as const

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Banned banner */}
      <div className="mb-6">
        <BanBanner />
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ═══ Left column — Game Reviews ═══ */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Action buttons */}
          <div className="flex gap-3 flex-wrap">
            <Link
              href="/library/videogames"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              <Library className="h-4 w-4" />
              Browse Library
            </Link>
            {isBanned ? (
              <span className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-600 cursor-not-allowed">
                <PlusCircle className="h-4 w-4" />
                Request a Game
              </span>
            ) : (
              <Link
                href="/add-game"
                className="inline-flex items-center gap-2 rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800 transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                {isAdmin ? "Add a Game" : "Request a Game"}
              </Link>
            )}
          </div>

          {/* Reviews by status */}
          {STATUS_ORDER.map((statusKey) => {
            const cfg = STATUS_CONFIG.find((c) => c.key === statusKey)
            if (!cfg) return null
            const { label, icon: Icon, color } = cfg
            const games = (reviewsByStatus[statusKey] || []).slice(0, 5)

            return (
              <section key={statusKey}>
                <div className="mb-3 flex items-center justify-between">
                  <Link
                    href={`/reviews?status=${statusKey}`}
                    className="flex items-center gap-2 text-lg font-semibold text-gray-200 hover:text-white transition-colors"
                  >
                    <Icon className={`h-5 w-5 ${color}`} />
                    {label}
                    {reviewsByStatus[statusKey] && (
                      <span className="text-sm font-normal text-gray-500">
                        ({reviewsByStatus[statusKey].length})
                      </span>
                    )}
                  </Link>
                  {(reviewsByStatus[statusKey]?.length ?? 0) > 5 && (
                    <Link
                      href={`/reviews?status=${statusKey}`}
                      className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      View all
                    </Link>
                  )}
                </div>

                {games.length === 0 ? (
                  <p className="rounded-lg border border-gray-800 bg-gray-900/50 px-4 py-6 text-center text-sm text-gray-600">
                    No games yet
                  </p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                    {games.map((r) => (
                      <Link
                        key={r.game.id}
                        href={`/library/videogames/${r.game.slug}`}
                        className="group relative aspect-[3/4] overflow-hidden rounded-lg border border-gray-700 bg-gray-800 transition-all hover:border-gray-500 hover:shadow-lg"
                        title={r.game.title}
                      >
                        {r.game.coverImage ? (
                          <img
                            src={proxiedImageUrl(r.game.coverImage)!}
                            alt={r.game.title}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center p-2">
                            <span className="text-center text-xs text-gray-500">
                              {r.game.title}
                            </span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>

        {/* ═══ Right column — Social ═══ */}
        <div className="w-full lg:w-80 lg:shrink-0 space-y-6">
          {/* Profile card */}
          <div className="rounded-lg border border-gray-700 bg-gray-900 p-5">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-gray-600 bg-gray-800">
                {(profile?.avatar || session.user.image) ? (
                  <img
                    src={proxiedImageUrl(profile?.avatar || session.user.image)!}
                    alt={session.user.name || ""}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400">
                    {session.user.name?.[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="truncate font-semibold text-gray-100">{session.user.name}</p>
                <div className="mt-1 flex items-center gap-3 text-xs text-gray-500">
                  <button
                    onClick={() => setSocialModal("followers")}
                    className="hover:text-gray-300 transition-colors"
                  >
                    <span className="font-medium text-gray-300">{social?.followerCount ?? 0}</span> followers
                  </button>
                  <button
                    onClick={() => setSocialModal("following")}
                    className="hover:text-gray-300 transition-colors"
                  >
                    <span className="font-medium text-gray-300">{social?.followingCount ?? 0}</span> following
                  </button>
                </div>
              </div>
            </div>
            {profile?.intro && (
              <p className="mt-3 text-sm text-gray-400">{profile.intro}</p>
            )}
          </div>

          {/* My Broadcasts */}
          <section>
            <Link
              href="/broadcasts"
              className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              <Megaphone className="h-4 w-4" />
              My Broadcasts ({myBroadcasts.length})
            </Link>
            {myBroadcasts.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center text-sm text-gray-600">
                <p>No broadcasts yet.</p>
                <p className="mt-1 text-xs">
                  Tick &quot;Broadcast&quot; when writing a review to share it.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {myBroadcasts.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-gray-700 bg-gray-900 p-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 space-y-1">
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
                          className="block truncate text-sm font-medium text-blue-400 hover:underline"
                        >
                          {b.game.title}
                        </Link>
                        {b.content && (
                          <p className="text-xs text-gray-400 line-clamp-2">{b.content}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
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
                        {openComments === b.id && (
                          <div className="space-y-2 pt-1">
                            <CommentsSection
                              broadcastId={b.id}
                              comments={comments[b.id] || []}
                              expanded={expandedComments.has(b.id)}
                              onExpand={() => setExpandedComments((prev) => new Set(prev).add(b.id))}
                            />
                            <div className="flex gap-2">
                              <input
                                value={replyingTo === b.id ? replyText : ""}
                                onFocus={() => setReplyingTo(b.id)}
                                onChange={(e) => { setReplyingTo(b.id); setReplyText(e.target.value) }}
                                placeholder="Write a reply..."
                                className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                              />
                              <button
                                onClick={() => handleReply(b.id)}
                                className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                              >
                                Reply
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => handleDeleteBroadcast(b.id)}
                        className="shrink-0 rounded p-1.5 text-gray-600 hover:bg-red-500/10 hover:text-red-400 transition-colors"
                        title="Delete broadcast"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Feed */}
          <section>
            <Link
              href="/feed"
              className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-300 hover:text-white transition-colors"
            >
              <Rss className="h-4 w-4" />
              Feed
            </Link>
            {feed.length === 0 ? (
              <div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4 text-center text-sm text-gray-600">
                <Users className="mx-auto mb-2 h-6 w-6" />
                <p>Nothing here yet.</p>
                <p className="mt-1 text-xs">Follow users to see their broadcasts.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {feed.map((b) => (
                  <div
                    key={b.id}
                    className="rounded-lg border border-gray-700 bg-gray-900 p-3 space-y-2"
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2">
                      <Link href={`/user/${b.createByUser.id}`} className="shrink-0">
                        <div className="h-6 w-6 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                          {b.createByUser.avatar ? (
                            <img
                              src={proxiedImageUrl(b.createByUser.avatar)!}
                              alt={b.createByUser.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-gray-400">
                              {b.createByUser.name[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/user/${b.createByUser.id}`}
                          className="text-sm font-medium hover:text-blue-400 transition-colors"
                        >
                          {b.createByUser.name}
                        </Link>
                        <span className="ml-2 text-xs text-gray-500">
                          {timeAgo(b.createAt)}
                        </span>
                      </div>
                      {b.rating !== null && (
                        <span className="flex items-center gap-0.5 text-xs text-yellow-400">
                          <Star className="h-3 w-3 fill-current" />
                          {b.rating}
                        </span>
                      )}
                    </div>

                    {/* Game + status */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">{statusLabel(b.status)}</span>
                      <Link
                        href={`/library/videogames/${b.game.slug}`}
                        className="truncate text-blue-400 hover:underline"
                      >
                        {b.game.title}
                      </Link>
                    </div>

                    {/* Content */}
                    {b.content && (
                      <p className="text-xs text-gray-400 line-clamp-3">{b.content}</p>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <button
                        onClick={() => handleLike(b.id)}
                        className={`inline-flex items-center gap-1 hover:text-red-400 transition-colors ${b.likedByMe ? "text-red-400" : ""}`}
                      >
                        <Heart className={`h-3 w-3 ${b.likedByMe ? "fill-current" : ""}`} />
                        {b._count.likes}
                      </button>
                      <button
                        onClick={() => toggleComments(b.id)}
                        className="inline-flex items-center gap-1 hover:text-blue-400 transition-colors"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {b._count.comments}
                      </button>
                    </div>

                    {/* Comments + reply */}
                    {openComments === b.id && (
                      <div className="space-y-2 pt-1">
                        <CommentsSection
                          broadcastId={b.id}
                          comments={comments[b.id] || []}
                          expanded={expandedComments.has(b.id)}
                          onExpand={() => setExpandedComments((prev) => new Set(prev).add(b.id))}
                        />
                        <div className="flex gap-2">
                          <input
                            value={replyingTo === b.id ? replyText : ""}
                            onFocus={() => setReplyingTo(b.id)}
                            onChange={(e) => { setReplyingTo(b.id); setReplyText(e.target.value) }}
                            placeholder="Write a reply..."
                            className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => handleReply(b.id)}
                            className="rounded bg-blue-600 px-2 py-1 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {/* Social list modal */}
      {socialModal && social && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200 capitalize">{socialModal}</h3>
              <button
                onClick={() => setSocialModal(null)}
                className="text-gray-500 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {(socialModal === "followers" ? social.followers : social.following).length === 0 ? (
              <p className="text-center text-gray-500 py-4">No users.</p>
            ) : (
              <div className="space-y-1 max-h-80 overflow-y-auto">
                {(socialModal === "followers" ? social.followers : social.following).map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${u.id}`}
                    onClick={() => setSocialModal(null)}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-gray-800 transition-colors"
                  >
                    <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
                      {u.avatar ? (
                        <img src={proxiedImageUrl(u.avatar)!} alt={u.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                          {u.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-medium">{u.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Comments Section ──────────────────────────────────────────────────

function CommentsSection({
  broadcastId,
  comments,
  expanded,
  onExpand,
}: {
  broadcastId: number
  comments: BroadcastComment[]
  expanded: boolean
  onExpand: () => void
}) {
  if (comments.length === 0) {
    return <p className="text-xs text-gray-600">No replies yet.</p>
  }

  const visible = expanded ? comments : comments.slice(0, 10)
  const hasMore = !expanded && comments.length > 10

  return (
    <div className="space-y-2">
      {visible.map((c) => (
        <div key={c.id} className="flex items-start gap-2">
          <Link href={`/user/${c.createByUser.id}`} className="shrink-0">
            <div className="h-5 w-5 overflow-hidden rounded-full border border-gray-700 bg-gray-800">
              {c.createByUser.avatar ? (
                <img src={proxiedImageUrl(c.createByUser.avatar)!} alt={c.createByUser.name} className="h-full w-full object-cover" />
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
      {hasMore && (
        <button
          onClick={onExpand}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          Show more ({comments.length - 10} more replies)
        </button>
      )}
    </div>
  )
}
