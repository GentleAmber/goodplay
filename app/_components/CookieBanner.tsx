"use client"
import { useState, useEffect } from "react"

export default function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!localStorage.getItem("cookie-consent")) setVisible(true)
  }, [])

  function accept() {
    localStorage.setItem("cookie-consent", "true")
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between gap-4 border-t border-gray-700 bg-gray-900 px-6 py-4 text-sm text-gray-300"
    id="cookie-banner">
      <p>This website only uses cookies necessary to keep you signed in.</p>
      <button
        onClick={accept}
        className="shrink-0 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        Got it
      </button>
    </div>
  )
}