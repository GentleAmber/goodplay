"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Role } from "@/generated/prisma"
import {
  Search,
  Plus,
  Check,
  X,
  ShieldAlert,
  ShieldOff,
  Copy,
  Loader2,
} from "lucide-react"

// ── Types ─────────────────────────────────────────────────────────────

interface InvitationCode {
  id: number
  code: string
  createdAt: string
  createdBy: string | null
  isValid: boolean
  registerAsAdmin: boolean
  _count: { users: number }
}

const REGISTER_AS_OPTIONS = [
  { value: false, label: "User" },
  { value: true, label: "Admin" },
]

interface PendingGame {
  id: string
  title: string
  slug: string
  coverImage: string | null
  gameType: string
  releaseDate: string | null
  genres: string[]
  platforms: string[]
  developers: string[]
  publishers: string[]
  requestStatus: string
}

interface ManagedUser {
  id: number
  name: string
  avatar: string | null
  role: string
  banned: boolean
  bannedAt: string | null
  bannedUntil: string | null
  createdAt: string
}

const BAN_OPTIONS = [
  { value: "1d", label: "1 day" },
  { value: "3d", label: "3 days" },
  { value: "7d", label: "7 days" },
  { value: "15d", label: "15 days" },
  { value: "30d", label: "30 days" },
  { value: "60d", label: "60 days" },
  { value: "90d", label: "90 days" },
  { value: "180d", label: "180 days" },
  { value: "270d", label: "270 days" },
  { value: "1y", label: "1 year" },
  { value: "3y", label: "3 years" },
  { value: "forever", label: "Forever" },
]

// ── Component ─────────────────────────────────────────────────────────

export default function ManagementPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<"codes" | "games" | "users">("codes")

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
    if (status === "authenticated" && session?.user?.role !== Role.ADMIN) {
      router.push("/")
    }
  }, [status, session, router])

  if (status === "loading" || !session || session.user.role !== Role.ADMIN) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Admin Management</h1>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-700">
        {(["codes", "games", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              tab === t
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "codes" ? "Invitation Codes" : t === "games" ? "Game Requests" : "Users"}
          </button>
        ))}
      </div>

      {tab === "codes" && <InvitationCodesTab />}
      {tab === "games" && <GameRequestsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  )
}

// ── Invitation Codes Tab ──────────────────────────────────────────────

function InvitationCodesTab() {
  const [codes, setCodes] = useState<InvitationCode[]>([])
  const [loading, setLoading] = useState(true)
  const [newCode, setNewCode] = useState("")
  const [newCodeAsAdmin, setNewCodeAsAdmin] = useState(false)
  const [creating, setCreating] = useState(false)
  const [disabling, setDisabling] = useState<number | null>(null)
  const [error, setError] = useState("")
  const [copiedId, setCopiedId] = useState<number | null>(null)

  const loadCodes = useCallback(() => {
    fetch("/api/management/invitation-codes")
      .then((r) => r.json())
      .then(setCodes)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadCodes() }, [loadCodes])

  async function handleCreate() {
    setCreating(true)
    setError("")
    const res = await fetch("/api/management/invitation-codes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: newCode || undefined, registerAsAdmin: newCodeAsAdmin }),
    })
    if (res.ok) {
      setNewCode("")
      setNewCodeAsAdmin(false)
      loadCodes()
    } else {
      const data = await res.json()
      setError(data.error ?? "Failed to create")
    }
    setCreating(false)
  }

  function copyCode(code: InvitationCode) {
    navigator.clipboard.writeText(code.code)
    setCopiedId(code.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  async function handleDisable(codeId: number) {
    setDisabling(codeId)
    const res = await fetch("/api/management/invitation-codes", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ codeId }),
    })
    if (res.ok) loadCodes()
    setDisabling(null)
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  return (
    <div className="space-y-6">
      {/* Create new code */}
      <div className="flex items-end gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-300 mb-1">
            New Invitation Code
          </label>
          <input
            value={newCode}
            onChange={(e) => setNewCode(e.target.value)}
            placeholder="Leave empty to auto-generate"
            maxLength={30}
            className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Register as
          </label>
          <select
            value={newCodeAsAdmin ? "admin" : "user"}
            onChange={(e) => setNewCodeAsAdmin(e.target.value === "admin")}
            className="rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
          >
            {REGISTER_AS_OPTIONS.map((o) => (
              <option key={o.label} value={o.value ? "admin" : "user"}>{o.label}</option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Create
        </button>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}

      {/* Codes list */}
      <div className="rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-800 text-gray-400">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Code</th>
              <th className="px-4 py-2 text-left font-medium">Created At</th>
              <th className="px-4 py-2 text-left font-medium">Created By</th>
              <th className="px-4 py-2 text-center font-medium">Register As</th>
              <th className="px-4 py-2 text-center font-medium">Uses</th>
              <th className="px-4 py-2 text-center font-medium">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {codes.map((c) => (
              <tr key={c.id} className="hover:bg-gray-800/50">
                <td className="px-4 py-2 font-mono text-gray-300">{c.code}</td>
                <td className="px-4 py-2 text-gray-500">
                  {new Date(c.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-2">
                  {c.createdBy != "System" ? (
                    <span className="text-gray-500">{c.createdBy}</span>
                  ) : (
                    <span className="text-amber-400 font-medium">System</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <span className={`text-xs ${c.registerAsAdmin ? "text-yellow-400" : "text-gray-500"}`}>
                    {c.registerAsAdmin ? "Admin" : "User"}
                  </span>
                </td>
                <td className="px-4 py-2 text-center text-gray-300">{c._count.users}</td>
                <td className="px-4 py-2 text-center">
                  {c.isValid ? (
                    <span className="text-green-400 text-xs">Active</span>
                  ) : (
                    <span className="text-red-400 text-xs">Disabled</span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => copyCode(c)}
                      className="text-gray-500 hover:text-white"
                      title="Copy code"
                    >
                      {copiedId === c.id ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>
                    <button
                      onClick={() => {
                        if (c.createdBy === "System") {
                          alert("This code was created by System and cannot be modified.")
                          return
                        }
                        handleDisable(c.id)
                      }}
                      disabled={disabling === c.id}
                      className={`${c.isValid ? "text-gray-500 hover:text-red-400" : "text-gray-500 hover:text-green-400"}`}
                      title={c.isValid ? "Disable code" : "Enable code"}
                    >
                      {disabling === c.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : c.isValid ? (
                        <X className="h-4 w-4" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {codes.length === 0 && (
          <p className="text-center text-gray-500 py-8">No invitation codes.</p>
        )}
      </div>
    </div>
  )
}

// ── Game Requests Tab ─────────────────────────────────────────────────

function GameRequestsTab() {
  const [games, setGames] = useState<PendingGame[]>([])
  const [loading, setLoading] = useState(true)
  const [acting, setActing] = useState<string | null>(null)

  const loadGames = useCallback(() => {
    fetch("/api/management/game-requests")
      .then((r) => r.json())
      .then(setGames)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadGames() }, [loadGames])

  async function handleAction(gameId: string, action: "APPROVED" | "REJECTED") {
    setActing(gameId)
    const res = await fetch("/api/management/game-requests", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ gameId, action }),
    })
    if (res.ok) loadGames()
    setActing(null)
  }

  if (loading) return <p className="text-gray-500">Loading...</p>

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-gray-700 bg-gray-900 p-8 text-center text-gray-500">
        No pending game requests.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <div
          key={game.id}
          className="flex items-center gap-4 rounded-lg border border-gray-700 bg-gray-900 p-4"
        >
          <div className="h-16 w-12 shrink-0 overflow-hidden rounded border border-gray-700 bg-gray-800">
            {game.coverImage ? (
              <img src={game.coverImage} alt={game.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-[10px] text-gray-600">N/A</div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-200 line-clamp-1">{game.title}</h3>
            <div className="flex flex-wrap gap-2 mt-1 text-xs text-gray-500">
              <span>{game.gameType.replace("_", " ")}</span>
              {game.releaseDate && (
                <span>&middot; {new Date(game.releaseDate).toLocaleDateString()}</span>
              )}
              {game.genres.length > 0 && (
                <span>&middot; {game.genres.join(", ")}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => handleAction(game.id, "APPROVED")}
              disabled={acting === game.id}
              className="inline-flex items-center gap-1 rounded bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Check className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={() => handleAction(game.id, "REJECTED")}
              disabled={acting === game.id}
              className="inline-flex items-center gap-1 rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" /> Reject
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Users Tab ─────────────────────────────────────────────────────────

function UsersTab() {
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [banTarget, setBanTarget] = useState<ManagedUser | null>(null)
  const [banDuration, setBanDuration] = useState("7d")
  const [acting, setActing] = useState(false)

  const loadUsers = useCallback((q?: string) => {
    setLoading(true)
    const params = q ? `?q=${encodeURIComponent(q)}` : ""
    fetch(`/api/management/users${params}`)
      .then((r) => r.json())
      .then(setUsers)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  function handleSearch() {
    loadUsers(search)
  }

  async function handleBan() {
    if (!banTarget) return
    setActing(true)
    const res = await fetch("/api/management/ban", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: banTarget.id, duration: banDuration }),
    })
    if (res.ok) {
      setBanTarget(null)
      loadUsers(search)
    }
    setActing(false)
  }

  async function handleUnban(userId: number) {
    setActing(true)
    const res = await fetch(`/api/management/ban?userId=${userId}`, { method: "DELETE" })
    if (res.ok) loadUsers(search)
    setActing(false)
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search users by name..."
            className="w-full rounded border border-gray-600 bg-gray-800 pl-9 pr-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <button
          onClick={handleSearch}
          className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-600"
        >
          Search
        </button>
      </div>

      {/* Users list */}
      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : users.length === 0 ? (
        <p className="text-center text-gray-500 py-8">No users found.</p>
      ) : (
        <div className="rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800 text-gray-400">
              <tr>
                <th className="px-4 py-2 text-left font-medium">User</th>
                <th className="px-4 py-2 text-left font-medium">Role</th>
                <th className="px-4 py-2 text-left font-medium">Status</th>
                <th className="px-4 py-2 text-left font-medium">Ban Expires</th>
                <th className="px-4 py-2 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-7 w-7 shrink-0 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xs font-bold text-gray-400 overflow-hidden">
                        {u.avatar ? (
                          <img src={u.avatar} alt={u.name} className="h-full w-full rounded-full object-cover" />
                        ) : (
                          u.name[0].toUpperCase()
                        )}
                      </div>
                      <span className="text-gray-300 font-medium">{u.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`text-xs ${u.role === "ADMIN" ? "text-yellow-400" : "text-gray-500"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    {u.banned ? (
                      <span className="inline-flex items-center gap-1 text-xs text-red-400">
                        <ShieldAlert className="h-3 w-3" /> Banned
                      </span>
                    ) : (
                      <span className="text-xs text-green-400">Active</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-xs text-gray-500">
                    {u.banned
                      ? u.bannedUntil
                        ? new Date(u.bannedUntil).toLocaleDateString()
                        : "Never"
                      : "—"}
                  </td>
                  <td className="px-4 py-2 text-right">
                    {u.role !== "ADMIN" && (
                      u.banned ? (
                        <button
                          onClick={() => handleUnban(u.id)}
                          disabled={acting}
                          className="inline-flex items-center gap-1 rounded border border-green-500/40 px-2 py-1 text-xs text-green-400 hover:bg-green-500/10 disabled:opacity-50"
                        >
                          <ShieldOff className="h-3 w-3" /> Unban
                        </button>
                      ) : (
                        <button
                          onClick={() => { setBanTarget(u); setBanDuration("7d") }}
                          className="inline-flex items-center gap-1 rounded border border-red-500/40 px-2 py-1 text-xs text-red-400 hover:bg-red-500/10"
                        >
                          <ShieldAlert className="h-3 w-3" /> Ban
                        </button>
                      )
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Ban modal */}
      {banTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-sm rounded-lg border border-gray-700 bg-gray-900 p-6 space-y-4">
            <h3 className="font-semibold text-gray-200">
              Ban user: <span className="text-red-400">{banTarget.name}</span>
            </h3>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Duration</label>
              <select
                value={banDuration}
                onChange={(e) => setBanDuration(e.target.value)}
                className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
              >
                {BAN_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setBanTarget(null)}
                className="rounded border border-gray-600 px-4 py-2 text-sm text-gray-300 hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleBan}
                disabled={acting}
                className="inline-flex items-center gap-2 rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {acting && <Loader2 className="h-4 w-4 animate-spin" />}
                Confirm Ban
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
