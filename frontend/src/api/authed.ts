const API_BASE = ''

export function authHeaders(token: string, jsonBody?: boolean): HeadersInit {
  const h: Record<string, string> = { Authorization: `Bearer ${token}` }
  if (jsonBody) h['Content-Type'] = 'application/json'
  return h
}

export async function authedFetch(
  token: string,
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (init.body != null && typeof init.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_BASE}${path}`, { ...init, headers })
}
