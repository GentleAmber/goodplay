"use client"

import Link from 'next/link'
import { useSession, signIn, signOut } from "next-auth/react"
import { useRef, useState, useEffect } from "react"
import { Role } from "@/generated/prisma"
import { proxiedImageUrl } from "@/lib/image-proxy"
import { useTheme } from "@/app/_components/ThemeProvider"
import { Sun, Moon } from "lucide-react"

export default function Component() {

  const [avatar, setAvatar] = useState(null)
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, toggle } = useTheme()

  useEffect(() => {
    if (!dropdownOpen) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [dropdownOpen])

  useEffect(() => {
    if (session) {
      // If logged in, fetch user profile
      fetch(`/api/users/${session.user.id}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.name) setAvatar(data.avatar)
        })
    }
  }, [session])

  if (status === "loading") return null

  return (
    <nav>
      <Link href="/"><span>Goodplay</span></Link>
      <Link href="/library/videogames"><span>Browse</span></Link>
      <button onClick={toggle} className="theme-toggle" aria-label="Toggle theme">
        {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
      </button>
      {session
        ? <div className="dropdown" ref={dropdownRef}>
            <div id="navbar-avatar" onClick={() => setDropdownOpen((v) => !v)}>
              <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-gray-600 bg-gray-800">
                {avatar ? 
                <img
                    src={proxiedImageUrl(avatar) || ""}
                    alt={session.user.name || ""}
                    className="h-full w-full object-cover"
                  /> :
                <div className="flex h-full w-full items-center justify-center text-lg font-bold text-gray-400">
                  {session.user.name?.[0]?.toUpperCase()}
                </div>
                }
              </div>
              <div className={`${dropdownOpen ? "" : "hidden"} dropdown-menu`}>
                {session.user.role === Role.ADMIN ? <Link href="/management">Admin board</Link> : null}
                <Link href="/account">Account</Link>
                <div onClick={() => signOut()}>Sign out</div>
              </div>
            </div>
          </div>
        : <div>
            <button onClick={() => signIn()}>Sign in</button>
            <button onClick={() => window.location.href = "/register"}>Register</button>
          </div>
      }
    </nav>
  )
}
