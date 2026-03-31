import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies external images so user-supplied URLs (avatars, covers)
 * never leak the viewer's IP to arbitrary third-party servers.
 *
 * Usage:  /api/image-proxy?url=https://example.com/pic.jpg
 */

const ALLOWED_PROTOCOLS = ["https:"]
const MAX_BYTES = 5 * 1024 * 1024 // 5 MB
const ALLOWED_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "image/avif",
]
const CACHE_SECONDS = 60 * 60 * 24 // 1 day

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url")
  if (!raw) {
    return NextResponse.json({ error: "Missing ?url=" }, { status: 400 })
  }

  // ── Validate the URL ───────────────────────────────────────────────
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 })
  }

  if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) {
    return NextResponse.json({ error: "Only HTTPS URLs allowed" }, { status: 400 })
  }

  // Block requests to private/internal IPs (SSRF prevention)
  const host = parsed.hostname
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    host.endsWith(".local") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    host === "0.0.0.0" ||
    host.startsWith("169.254.")
  ) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 403 })
  }

  // ── Fetch the image ────────────────────────────────────────────────
  let upstream: Response
  try {
    upstream = await fetch(parsed.toString(), {
      headers: { Accept: ALLOWED_CONTENT_TYPES.join(", ") },
      redirect: "follow",
      signal: AbortSignal.timeout(10_000),
    })
  } catch {
    return NextResponse.json({ error: "Failed to fetch image" }, { status: 502 })
  }

  if (!upstream.ok) {
    return NextResponse.json(
      { error: `Upstream returned ${upstream.status}` },
      { status: 502 },
    )
  }

  // ── Validate content type ──────────────────────────────────────────
  const contentType = upstream.headers.get("content-type")?.split(";")[0].trim() ?? ""
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json({ error: "Not an image" }, { status: 400 })
  }

  // ── Validate size ──────────────────────────────────────────────────
  const contentLength = Number(upstream.headers.get("content-length") || 0)
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 })
  }

  const body = await upstream.arrayBuffer()
  if (body.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "Image too large" }, { status: 400 })
  }

  // ── Return the image ───────────────────────────────────────────────
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Length": String(body.byteLength),
      "Cache-Control": `public, max-age=${CACHE_SECONDS}, immutable`,
      "X-Content-Type-Options": "nosniff",
    },
  })
}
