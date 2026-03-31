"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Save, Loader2 } from "lucide-react"
import BanBanner from "@/app/_components/BanBanner"

interface AccountProfile {
  id: number
  name: string
  intro: string | null
  avatar: string | null
  protectFollowList: boolean
}

export default function AccountPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // Form state
  const [avatar, setAvatar] = useState("")
  const [intro, setIntro] = useState("")
  const [protectFollowList, setProtectFollowList] = useState(false)

  // UI state
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status !== "authenticated") return

    fetch("/api/account")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load profile")
        return r.json()
      })
      .then((data: AccountProfile) => {
        setProfile(data)
        setAvatar(data.avatar ?? "")
        setIntro(data.intro ?? "")
        setProtectFollowList(data.protectFollowList)
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load profile" }))
      .finally(() => setLoading(false))
  }, [status, router])

  async function handleSave() {
    setSaving(true)
    setMessage(null)

    const res = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatar, intro, protectFollowList }),
    })

    if (res.ok) {
      const data: AccountProfile = await res.json()
      setProfile(data)
      setAvatar(data.avatar ?? "")
      setIntro(data.intro ?? "")
      setProtectFollowList(data.protectFollowList)
      setMessage({ type: "success", text: "Profile updated" })
    } else {
      const err = await res.json()
      setMessage({ type: "error", text: err.error ?? "Failed to save" })
    }

    setSaving(false)
  }

  const hasChanges =
    profile !== null &&
    (avatar !== (profile.avatar ?? "") ||
      intro !== (profile.intro ?? "") ||
      protectFollowList !== profile.protectFollowList)

  if (status === "loading" || loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-gray-500">
        Loading...
      </div>
    )
  }

  if (!session || !profile) {
    return null
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-10 space-y-8">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      <BanBanner />

      {/* Avatar */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Avatar
        </label>
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 shrink-0 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-xl font-bold text-gray-400 overflow-hidden">
            {avatar ? (
              <img
                src={avatar}
                alt="Avatar preview"
                className="h-full w-full rounded-full object-cover"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = "none"
                }}
              />
            ) : (
              profile.name[0].toUpperCase()
            )}
          </div>
          <input
            type="url"
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            placeholder="https://example.com/avatar.jpg"
            className="flex-1 rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
          />
        </div>
        <p className="text-xs text-gray-500">
          Enter an image URL to use as your avatar. Leave empty to remove.
        </p>
      </section>

      {/* Self-intro */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Self Introduction
        </label>
        <textarea
          value={intro}
          onChange={(e) => setIntro(e.target.value)}
          placeholder="Tell others about yourself..."
          rows={4}
          maxLength={500}
          className="w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
        />
        <p className="text-xs text-gray-500 text-right">
          {intro.length}/500
        </p>
      </section>

      {/* Privacy: Follow list */}
      <section className="space-y-3">
        <label className="block text-sm font-medium text-gray-300">
          Followers/Following List Visibility
        </label>
        <div className="flex items-center gap-6">
          <div onClick={() => setProtectFollowList(false)} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <span
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                !protectFollowList ? "border-blue-500" : "border-gray-500"
              }`}
            >
              {!protectFollowList && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </span>
            <span>Public</span>
          </div>
          <div onClick={() => setProtectFollowList(true)} className="flex items-center gap-2 cursor-pointer text-sm text-gray-300">
            <span
              className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                protectFollowList ? "border-blue-500" : "border-gray-500"
              }`}
            >
              {protectFollowList && (
                <span className="h-2 w-2 rounded-full bg-blue-500" />
              )}
            </span>
            <span>Private</span>
          </div>
        </div>
        <p className="text-xs text-gray-500">
          When private, other users cannot see who you follow or who follows you.
        </p>
      </section>

      {/* Save */}
      {message && (
        <p
          className={`text-sm ${
            message.type === "success" ? "text-green-400" : "text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      <button
        onClick={handleSave}
        disabled={saving || !hasChanges}
        className="inline-flex items-center gap-2 rounded bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Save className="h-4 w-4" />
        )}
        Save Changes
      </button>
    </div>
  )
}
