"use client"

import Link from 'next/link'
import Image from 'next/image'
import { useSession, signIn, signOut } from "next-auth/react"
import { useRef, useState, useEffect } from "react"
import { Role } from "@/generated/prisma"

export default function Component() {
  const { data: session, status } = useSession()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

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

  if (status === "loading") return null

  return (
    <nav>
      <Link href="/"><span>Goodplay</span></Link>
      <Link href="/library/videogames"><span>Browse</span></Link>
      {session
        ? <div className="dropdown" ref={dropdownRef}>
            <div id="navbar-avatar" onClick={() => setDropdownOpen((v) => !v)}>
              <Image
                src={session.user.image || "/voidAvatar.jpg"}
                alt="User's avatar"
                quality={80}
                width={40}
                height={40}
              />
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
