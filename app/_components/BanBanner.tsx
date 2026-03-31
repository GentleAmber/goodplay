"use client"
import { useSession } from "next-auth/react"
import { ShieldAlert } from "lucide-react"

export default function BanBanner() {
  const { data: session } = useSession()

  if (!session?.user?.banned) return null

  const bannedUntil = session.user.bannedUntil
  const dateLabel = bannedUntil
    ? new Date(bannedUntil).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "further notice"

  return (
    <div className="bg-red-600/20 border border-red-500/50 rounded-lg px-4 py-3 flex items-start gap-3">
      <ShieldAlert className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
      <p className="text-sm text-red-300">
        You are banned by admins until{" "}
        <span className="font-semibold text-red-200">{dateLabel}</span>. Before
        that, you are not able to write or edit reviews, comment on or like other
        users&apos; broadcasts.
      </p>
    </div>
  )
}
