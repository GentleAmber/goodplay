"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useRouter } from "next/navigation"

export default function RegisterPage() {
  const router = useRouter()
  const [error, setError] = useState("")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-700 bg-gray-900 p-8"
      >
        <h1 className="text-2xl font-bold text-white">Register</h1>

        {error && (
          <p className="rounded bg-red-500/10 p-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="name" className="block text-sm text-gray-300">
            Username (max: 30 characters)
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            maxLength={30}
            className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm text-gray-300">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="invitationCode" className="block text-sm text-gray-300">
            Invitation Code
          </label>
          <input
            id="invitationCode"
            name="invitationCode"
            type="text"
            required
            className="mt-1 w-full rounded border border-gray-600 bg-gray-800 px-3 py-2 text-white focus:border-blue-500 focus:outline-none"
          />
        </div>

        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Register
        </button>
      </form>
    </div>
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const name = formData.get("name") as string
    const password = formData.get("password") as string
    const invitationCode = formData.get("invitationCode") as string

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      setError("Username can only contain letters, numbers, hyphens, and underscores")
      return
    }

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password, invitationCode }),
    })

    const data = await res.json()

    if (!res.ok) {
      setError(data.error || "Registration failed")
      return
    }

    // Auto sign-in after successful registration
    const signInRes = await signIn("credentials", {
      name,
      password,
      redirect: false,
    })

    if (signInRes?.error) {
      router.push("/login")
    } else {
      router.push("/")
    }
  }
}
