"use client"
import { useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, PlusCircle } from "lucide-react"
import { Role } from "@/generated/prisma"
import { fetchWithLimit } from "@/lib/fetch-with-limit"

export default function AddGamePage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const isAdmin = session?.user?.role === Role.ADMIN

  const [title, setTitle] = useState("")
  const [gameType, setGameType] = useState("VIDEO_GAME")
  const [coverImage, setCoverImage] = useState("")
  const [releaseDate, setReleaseDate] = useState("")
  const [description, setDescription] = useState("")
  const [genres, setGenres] = useState("")
  const [platforms, setPlatforms] = useState("")
  const [developers, setDevelopers] = useState("")
  const [publishers, setPublishers] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")

  if (authStatus === "loading") return null

  if (!session) {
    router.push("/login")
    return null
  }

  function parseCommaList(value: string): string[] {
    return value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setSuccess("")
    setSubmitting(true)

    const res = await fetchWithLimit("/api/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        gameType,
        coverImage,
        releaseDate,
        description: description || undefined,
        genres: parseCommaList(genres),
        platforms: parseCommaList(platforms),
        developers: parseCommaList(developers),
        publishers: parseCommaList(publishers),
      }),
    })

    if (res.ok) {
      const game = await res.json()
      if (isAdmin) {
        setSuccess("Game added successfully. Redirecting...")
        setTimeout(() => router.push(`/library/videogames/${game.slug}`), 1500)
      } else {
        setSuccess("Your request has been submitted and is pending admin approval.")
        setTitle("")
        setCoverImage("")
        setReleaseDate("")
        setDescription("")
        setGenres("")
        setPlatforms("")
        setDevelopers("")
        setPublishers("")
      }
    } else {
      const data = await res.json().catch(() => null)
      setError(data?.error || "Something went wrong")
    }

    setSubmitting(false)
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <h1 className="flex items-center gap-2 text-3xl font-bold">
          <PlusCircle className="h-7 w-7" />
          {isAdmin ? "Add a Game" : "Request a Game"}
        </h1>
      </div>

      {!isAdmin && (
        <p className="text-sm text-gray-400">
          Submit a game for admins to review. Once approved, it will appear in the library.
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="e.g. The Legend of Zelda"
          />
        </div>

        {/* Game Type + Release Date row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Game Type <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={gameType}
              onChange={(e) => setGameType(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="VIDEO_GAME">Video Game</option>
              <option value="BOARD_GAME">Board Game</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">
              Release Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={releaseDate}
              onChange={(e) => setReleaseDate(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Cover Image */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">
            Cover Image URL <span className="text-red-400">*</span>
          </label>
          <input
            type="url"
            required
            value={coverImage}
            onChange={(e) => setCoverImage(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="https://example.com/cover.jpg"
          />
          {coverImage && (
            <div className="mt-2 h-32 w-24 overflow-hidden rounded border border-gray-700 bg-gray-900">
              <img
                src={coverImage}
                alt="Cover preview"
                className="h-full w-full object-cover"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none" }}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
            placeholder="A brief description of the game"
          />
        </div>

        {/* Genres */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Genres</label>
          <input
            type="text"
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="Action, RPG, Adventure"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
        </div>

        {/* Platforms */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-300">Platforms</label>
          <input
            type="text"
            value={platforms}
            onChange={(e) => setPlatforms(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            placeholder="PC, PS5, Nintendo Switch"
          />
          <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
        </div>

        {/* Developers + Publishers row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Developers</label>
            <input
              type="text"
              value={developers}
              onChange={(e) => setDevelopers(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Studio A, Studio B"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-300">Publishers</label>
            <input
              type="text"
              value={publishers}
              onChange={(e) => setPublishers(e.target.value)}
              className="w-full rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              placeholder="Publisher A"
            />
            <p className="mt-1 text-xs text-gray-500">Comma-separated</p>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {submitting
            ? "Submitting..."
            : isAdmin
              ? "Add Game"
              : "Submit Request"}
        </button>
      </form>
    </div>
  )
}
