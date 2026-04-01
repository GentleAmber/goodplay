/**
 * Thin wrapper around fetch for mutating requests (POST / PATCH / DELETE).
 * If the server returns 403 with the demo-limit error message, an alert is
 * shown automatically and the Response is still returned so callers can
 * treat it as a failed request (res.ok === false).
 */
export async function fetchWithLimit(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const res = await fetch(input, init)

  if (res.status === 403) {
    // Clone so the body can still be read by the caller if needed
    const clone = res.clone()
    try {
      const data = await clone.json()
      if (data?.error?.startsWith("Operation not allowed. Exceeding demo")) {
        alert(data.error)
      }
    } catch {
      // non-JSON 403 — leave it to the caller
    }
  }

  return res
}
