/**
 * Wraps an external image URL through our proxy endpoint
 * so the viewer's browser never contacts the third-party server directly.
 */
export function proxiedImageUrl(url: string | null | undefined): string | null {
  if (!url) return null
  // Already a local/relative path — no need to proxy
  if (url.startsWith("/")) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}
