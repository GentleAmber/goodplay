"use client"

import { signIn } from "next-auth/react"
import { useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState("")

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-700 bg-gray-900 p-8"
      >
        <h1 className="text-2xl font-bold text-white">Sign In</h1>

        {error && (
          <p className="rounded bg-red-500/10 p-2 text-sm text-red-400">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="name" className="block text-sm text-gray-300">
            Username
          </label>
          <input
            id="name"
            name="name"
            type="text"
            maxLength={30}
            required
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

        <button
          type="submit"
          className="w-full rounded bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700"
        >
          Sign In
        </button>
      </form>
    </div>
  )

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")

    const formData = new FormData(e.currentTarget)
    const res = await signIn("credentials", {
      name: formData.get("name"),
      password: formData.get("password"),
      redirect: false,  
    })

    if (res?.error) {
      setError("Invalid username or password")
    } else {
      router.push("/")
    }
  }
}
