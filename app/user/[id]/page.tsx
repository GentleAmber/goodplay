"use client"
import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useParams } from "next/navigation"
import Link from "next/link"
import {
  Star,
  Heart,
  MessageCircle,
  UserPlus,
  UserMinus,
  Lock,
  ShieldAlert,
  ShieldOff,
  X,
  Megaphone,
  Trash2,
  Loader2,
} from "lucide-react"
import { Role } from "@/generated/prisma"
import STATUS_CONFIG from "@/app/_types/GameStatus"
import { proxiedImageUrl } from "@/lib/image-proxy"

// ── Types ────────────────────────────────────────────────────────────

interface ProfileReview {
  gameId: string
  userId: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  lastUpdateAt: string
  game: { id: string; title: string; slug: string; coverImage: string | null }
}

interface ProfileBroadcast {
  id: number
  rating: number | null
  status: string
  content: string | null
  createAt: string
  likedByMe: boolean
  game: { id: string; title: string; slug: string }
  _count: { comments: number; likes: number }
}

interface UserProfile {
  id: number
  name: string
  intro: string | null
  avatar: string | null
  createdAt: string
  protectFollowList: boolean
  banned: boolean
  role: string
  followerCount: number
  followingCount: number
  reviews: ProfileReview[]
  broadcasts: ProfileBroadcast[]
  isBlocked: boolean
  isFollowing: boolean
}

interface BroadcastComment {
  id: number
  content: string
  createdAt: string
  createByUser: { id: number; name: string; avatar: string | null }
}

interface FollowUser {
  id: number
  name: string
  avatar: string | null
}

// ── Helpers ──────────────────────────────────────────────────────────

function statusLabel(s: string) {
  return STATUS_CONFIG.find((c) => c.key === s)?.label ?? s
}

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

// ── Component ────────────────────────────────────────────────────────

export default function UserProfilePage() {
  const { id } = useParams<{ id: string }>()
  const { data: session } = useSession()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<"reviews" | "broadcasts">("reviews")
  const [following, setFollowing] = useState(false)

  // Follow list modal
  const [listModal, setListModal] = useState<"followers" | "following" | null>(null)
  const [listUsers, setListUsers] = useState<FollowUser[]>([])
  const [listLoading, setListLoading] = useState(false)

  // Admin ban
  const [showBanModal, setShowBanModal] = useState(false)
  const [banDuration, setBanDuration] = useState("7d")
  const [banActing, setBanActing] = useState(false)

  const myUserId = session?.user?.id ? parseInt(session.user.id, 10) : null
  const isOwnProfile = myUserId !== null && myUserId === profile?.id
  const isAdmin = session?.user?.role === Role.ADMIN

  const loadProfile = useCallback(() => {
    setLoading(true)
    fetch(`/api/users/${id}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then((data: UserProfile) => {
        setProfile(data)
        setFollowing(data.isFollowing)
      })
      .catch(() => setError("User not found"))
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  async function handleFollow() {
    if (!session) return
    const res = await fetch(`/api/users/${id}/follow`, { method: "POST" })
    if (res.ok) {
      const data = await res.json()
      setFollowing(data.following)
      loadProfile()
    }
  }

  async function handleBan() {
    setBanActing(true)
    const res = await fetch("/api/management/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: parseInt(id, 10), duration: banDuration }),
    })
    if (res.ok) {
      setShowBanModal(false)
      loadProfile()
    }
    setBanActing(false)
  }

  async function handleUnban() {
    setBanActing(true)
    const res = await fetch(`/api/management/ban?userId=${id}`, { method: "DELETE" })
    if (res.ok) loadProfile()
    setBanActing(false)
  }

  async function openFollowList(type: "followers" | "following") {
    if (profile?.protectFollowList) return
    setListModal(type)
    setListLoading(true)
    const res = await fetch(`/api/users/${id}/${type}`)
    if (res.ok) {
      setListUsers(await res.json())
    } else {
      setListUsers([])
    }
    setListLoading(false)
  }

  // ── Loading / Error ──

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        <p className="text-lg">{error || "User not found"}</p>
      </div>
    )
  }

  // ── Render ──

  return (
    <div className="container mx-auto px-4 py-10 space-y-10">
      {/* Profile header */}
      <section className="flex flex-col sm:flex-row gap-6 items-start">
        <div className="h-20 w-20 shrink-0 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-2xl font-bold text-gray-400">
          {profile.avatar ? (
            <img src={proxiedImageUrl(profile.avatar)!} alt={profile.name} className="h-full w-full rounded-full object-cover" />
          ) : (
            profile.name[0].toUpperCase()
          )}
        </div>

        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{profile.name}</h1>
            {profile.banned && (
              <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-2 py-0.5 text-xs text-red-400">
                <ShieldAlert className="h-3 w-3" /> Restricted
              </span>
            )}
          </div>

          {profile.intro && (
            <p className="text-sm text-gray-400">{profile.intro}</p>
          )}

          <p className="text-xs text-gray-600">
            Joined {new Date(profile.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "short" })}
          </p>

          {/* Follow counts */}
          <div className="flex items-center gap-4 text-sm">
            {profile.protectFollowList ? (
              <>
                <span className="text-gray-400">
                  <strong>{profile.followerCount}</strong>{" "}
                  <span className="text-gray-500">followers</span>{" "}
                  <Lock className="inline h-3 w-3 text-gray-600" />
                </span>
                <span className="text-gray-400">
                  <strong>{profile.followingCount}</strong>{" "}
                  <span className="text-gray-500">following</span>{" "}
                  <Lock className="inline h-3 w-3 text-gray-600" />
                </span>
              </>
            ) : (
              <>
                <button
                  onClick={() => openFollowList("followers")}
                  className="text-gray-400 hover:text-white"
                >
                  <strong>{profile.followerCount}</strong>{" "}
                  <span className="text-gray-500">followers</span>
                </button>
                <button
                  onClick={() => openFollowList("following")}
                  className="text-gray-400 hover:text-white"
                >
                  <strong>{profile.followingCount}</strong>{" "}
                  <span className="text-gray-500">following</span>
                </button>
              </>
            )}
          </div>

          {/* Follow / unfollow button */}
          {session && !isOwnProfile && (
            <button
              onClick={handleFollow}
              className={`mt-2 inline-flex items-center gap-2 rounded px-4 py-2 text-sm font-medium ${
                following
                  ? "border border-gray-600 text-gray-300 hover:bg-gray-800"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              }`}
            >
              {following ? (
                <><UserMinus className="h-4 w-4" /> Unfollow</>
              ) : (
                <><UserPlus className="h-4 w-4" /> Follow</>
              )}
            </button>
          )}

          {profile.isBlocked && (
            <p className="text-xs text-red-400 mt-1">
              This user has blocked you. You cannot interact with their broadcasts.
            </p>
          )}

          {/* Admin ban/unban button */}
          {isAdmin && !isOwnProfile && profile.role !== "ADMIN" && (
            profile.banned ? (
              <button
                onClick={handleUnban}
                disabled={banActing}
                className="mt-2 inline-flex items-center gap-2 rounded border border-green-500/40 px-4 py-2 text-sm font-medium text-green-400 hover:bg-green-500/10 disabled:opacity-50"
              >
                {banActing ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldOff className="h-4 w-4" />}
                Unban User
              </button>
            ) : (
              <button
                onClick={() => { setShowBanModal(true); setBanDuration("7d") }}
                className="mt-2 inline-flex items-center gap-2 rounded border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-500/10"
              >
                <ShieldAlert className="h-4 w-4" /> Ban User
              </button>
            )
          )}
        </div>
      </section>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-0">
        <button
          onClick={() => setTab("reviews")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "reviews"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Reviews ({profile.reviews.length})
        </button>
        <button
          onClick={() => setTab("broadcasts")}
          className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
            tab === "broadcasts"
              ? "border-blue-500 text-blue-400"
              : "border-transparent text-gray-500 hover:text-gray-300"
          }`}
        >
          Broadcasts ({profile.broadcasts.length})
        </button>
      </div>

      {/* Reviews tab */}
      {tab === "reviews" && (
        <section className="space-y-3">
          {profile.reviews.length === 0 ? (
            <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center text-gray-500">
              No reviews yet.
            </div>
          ) : (
            profile.reviews.map((review) => (
              <div
                key={review.gameId}
                className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-900 p-4"
              >
                <Link href={`/library/videogames/${review.game.slug}`} className="shrink-0">
                  <div className="h-20 w-14 overflow-hidden rounded border border-gray-700 bg-gray-800">
                    {review.game.coverImage ? (
                      <img src={proxiedImageUrl(review.game.coverImage)!} alt={review.game.title} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-gray-600">N/A</div>
                    )}
                  </div>
                </Link>
                <div className="flex-1 min-w-0">
                  <Link href={`/library/videogames/${review.game.slug}`} className="font-semibold hover:text-blue-400 line-clamp-1">
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
                  </div>
                  {review.content && (
                    <p className="mt-1 text-sm text-gray-400 line-clamp-2">{review.content}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* Broadcasts tab */}
      <div className={tab === "broadcasts" ? "" : "hidden"}>
        <BroadcastsSection
          userId={profile.id}
          initialBroadcasts={profile.broadcasts}
          isOwnProfile={isOwnProfile}
          isBlocked={profile.isBlocked}
          hasSession={!!session}
        />
      </div>

      {/* Ban modal (admin) */}
      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
            <h3 className="font-semibold text-gray-200">
              Ban user: <span className="text-red-400">{profile.name}</span>
            </h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Duration</label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                <option value="1d">1 day</option>
                <option value="3d">3 days</option>
                <option value="7d">7 days</option>
                <option value="15d">15 days</option>
                <option value="30d">30 days</option>
                <option value="60d">60 days</option>
                <option value="90d">90 days</option>
                <option value="180d">180 days</option>
                <option value="270d">270 days</option>
                <option value="1y">1 year</option>
                <option value="3y">3 years</option>
                <option value="forever">Forever</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowBanModal(false)}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={banActing}
                className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {banActing && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Follow list modal */}
      {listModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-200 capitalize">{listModal}</h3>
              <button onClick={() => setListModal(null)} className="text-gray-500 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>
            {listLoading ? (
              <p className="text-center text-gray-500 py-4">Loading...</p>
            ) : listUsers.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No users.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {listUsers.map((u) => (
                  <Link
                    key={u.id}
                    href={`/user/${u.id}`}
                    onClick={() => setListModal(null)}
                    className="flex items-center gap-3 rounded p-2 hover:bg-gray-800"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400">
                      {u.avatar ? (
                        <img src={proxiedImageUrl(u.avatar)!} alt={u.name} className="h-full w-full rounded-full object-cover" />
                      ) : (
                        u.name[0].toUpperCase()
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

// ── Broadcasts Section ────────────────────────────────────────────────

function BroadcastsSection({
  userId,
  initialBroadcasts,
  isOwnProfile,
  isBlocked,
  hasSession,
}: {
  userId: number
  initialBroadcasts: ProfileBroadcast[]
  isOwnProfile: boolean
  isBlocked: boolean
  hasSession: boolean
}) {
  const [broadcasts, setBroadcasts] = useState(initialBroadcasts)

  useEffect(() => {
    setBroadcasts(initialBroadcasts)
  }, [initialBroadcasts])

  const [openComments, setOpenComments] = useState<number | null>(null)
  const [comments, setComments] = useState<Record<number, BroadcastComment[]>>({})
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [replyText, setReplyText] = useState("")

  function loadBroadcasts() {
    fetch(`/api/users/${userId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.broadcasts) setBroadcasts(data.broadcasts)
      })
  }

  async function handleLike(broadcastId: number) {
    if (!hasSession) return
    await fetch(`/api/broadcasts/${broadcastId}/like`, { method: "POST" })
    loadBroadcasts()
  }

  async function handleDeleteBroadcast(broadcastId: number) {
    if (!confirm("Delete this broadcast?")) return
    const res = await fetch(`/api/broadcasts/${broadcastId}`, { method: "DELETE" })
    if (res.ok) loadBroadcasts()
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
    setReplyText("")
  }

  async function handleReply(broadcastId: number) {
    if (!hasSession || !replyText.trim()) return
    await fetch(`/api/broadcasts/${broadcastId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: replyText.trim() }),
    })
    setReplyText("")
    loadComments(broadcastId)
    loadBroadcasts()
  }

  if (broadcasts.length === 0) {
    return (
      <section className="space-y-3">
        <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center text-gray-500">
          No broadcasts yet.
        </div>
      </section>
    )
  }

  return (
    <section className="space-y-3">
      {broadcasts.map((b) => (
        <div
          key={b.id}
          className="flex items-start gap-4 rounded-lg border border-gray-700 bg-gray-900 p-4"
        >
          <Megaphone className="h-5 w-5 shrink-0 text-gray-600 mt-0.5" />
          <div className="flex-1 min-w-0 space-y-1">
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
              <p className="text-sm text-gray-300 line-clamp-3">{b.content}</p>
            )}
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <button
                onClick={() => handleLike(b.id)}
                className={`inline-flex items-center gap-1 hover:text-red-400 ${b.likedByMe ? "text-red-400" : ""}`}
              >
                <Heart className={`h-3 w-3 ${b.likedByMe ? "fill-current" : ""}`} /> {b._count.likes}
              </button>
              <button
                onClick={() => toggleComments(b.id)}
                className="inline-flex items-center gap-1 hover:text-blue-400"
              >
                <MessageCircle className="h-3 w-3" /> {b._count.comments}
              </button>
            </div>
            {openComments === b.id && (
              <div className="space-y-3 pt-1">
                <CommentsSection
                  comments={comments[b.id] || []}
                  expanded={expandedComments.has(b.id)}
                  onExpand={() => setExpandedComments((prev) => new Set(prev).add(b.id))}
                />
                {hasSession && !isBlocked && (
                  <div className="flex gap-2">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-white focus:border-blue-500 focus:outline-none"
                    />
                    <button
                      onClick={() => handleReply(b.id)}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      Reply
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          {isOwnProfile && (
            <button
              onClick={() => handleDeleteBroadcast(b.id)}
              className="shrink-0 rounded border border-red-500/40 p-2 text-red-400 hover:bg-red-500/10"
              title="Delete broadcast"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
    </section>
  )
}

// ── Comments Section ──────────────────────────────────────────────────

function CommentsSection({
  comments,
  expanded,
  onExpand,
}: {
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
            <div className="h-6 w-6 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 overflow-hidden">
              {c.createByUser.avatar ? (
                <img src={proxiedImageUrl(c.createByUser.avatar)!} alt={c.createByUser.name} className="h-full w-full rounded-full object-cover" />
              ) : (
                c.createByUser.name[0].toUpperCase()
              )}
            </div>
          </Link>
          <div className="min-w-0">
            <span className="text-xs font-semibold text-gray-300">
              <Link href={`/user/${c.createByUser.id}`} className="hover:text-blue-400">
                {c.createByUser.name}
              </Link>
            </span>
            <span className="text-xs text-gray-600 ml-2">{timeAgo(c.createdAt)}</span>
            <p className="text-xs text-gray-400 break-words">{c.content}</p>
          </div>
        </div>
      ))}
      {hasMore && (
        <button
          onClick={onExpand}
          className="text-xs text-blue-400 hover:text-blue-300"
        >
          Show more ({comments.length - 10} more replies)
        </button>
      )}
    </div>
  )
}
