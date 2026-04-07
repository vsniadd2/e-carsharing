/** Пустая строка: запросы на тот же origin, в dev Vite проксирует /api → http://localhost:8080 */
const API_BASE = '';

export type User = { id: string; email: string; name: string; balance?: number; carsiki?: number };

export type AuthResponse = { accessToken: string; refreshToken: string; user: User };

async function readError(res: Response, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    return (data as { error: string }).error;
  }
  return res.statusText || 'Ошибка запроса';
}

export async function register(email: string, password: string, name?: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: name || '' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(await readError(res, data));
  return data as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(await readError(res, data));
  return data as AuthResponse;
}

export async function refreshSession(refreshToken: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(await readError(res, data));
  return data as AuthResponse;
}

const refreshFlights = new Map<string, Promise<AuthResponse>>();

/** Один HTTP-refresh на один и тот же refresh-токен (React Strict Mode / параллельные вызовы). */
export function refreshSessionSingleFlight(refreshToken: string): Promise<AuthResponse> {
  const key = refreshToken.trim();
  let existing = refreshFlights.get(key);
  if (existing) return existing;
  const promise = refreshSession(key).finally(() => {
    refreshFlights.delete(key);
  });
  refreshFlights.set(key, promise);
  return promise;
}

export async function logoutRemote(refreshToken: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  if (res.ok || res.status === 204) return;
  const data = await res.json().catch(() => ({}));
  throw new Error(await readError(res, data));
}

/** Без верификации подписи: только для проверки срока access JWT в UI. */
export function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return true;
    const json = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
    const payload = JSON.parse(json) as { exp?: number };
    if (payload.exp == null) return false;
    return payload.exp * 1000 < Date.now() + 10_000;
  } catch {
    return true;
  }
}
