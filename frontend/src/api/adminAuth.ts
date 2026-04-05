import type { AuthResponse } from './auth'
import { refreshSession, logoutRemote } from './auth'

const API_BASE = ''

export const ADMIN_ACCESS_KEY = 'ecoride_admin_access_token'
export const ADMIN_REFRESH_KEY = 'ecoride_admin_refresh_token'
export const ADMIN_USER_KEY = 'ecoride_admin_user'

async function readError(res: Response, data: unknown): Promise<string> {
  if (data && typeof data === 'object' && 'error' in data && typeof (data as { error: unknown }).error === 'string') {
    return (data as { error: string }).error
  }
  return res.statusText || 'Ошибка запроса'
}

export async function adminLogin(login: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/api/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ login, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(
        'Маршрут /api/admin/login не найден (404). Пересоберите и перезапустите бэкенд: из папки backend/EcoRide.Api выполните dotnet run, либо docker compose build api && docker compose up -d api.'
      )
    }
    throw new Error(await readError(res, data))
  }
  return data as AuthResponse
}

export function persistAdminSession(auth: AuthResponse): void {
  sessionStorage.setItem(ADMIN_ACCESS_KEY, auth.accessToken)
  sessionStorage.setItem(ADMIN_REFRESH_KEY, auth.refreshToken)
  sessionStorage.setItem(ADMIN_USER_KEY, JSON.stringify(auth.user))
}

export function clearAdminSession(): void {
  sessionStorage.removeItem(ADMIN_ACCESS_KEY)
  sessionStorage.removeItem(ADMIN_REFRESH_KEY)
  sessionStorage.removeItem(ADMIN_USER_KEY)
}

export function loadAdminTokens(): { access: string | null; refresh: string | null } {
  return {
    access: sessionStorage.getItem(ADMIN_ACCESS_KEY),
    refresh: sessionStorage.getItem(ADMIN_REFRESH_KEY),
  }
}

/** Обновление пары токенов через общий `/api/auth/refresh` (тот же refresh, что выдал бэкенд). */
export async function refreshAdminSession(refreshToken: string): Promise<AuthResponse> {
  return refreshSession(refreshToken)
}

export async function adminLogoutRemote(refreshToken: string): Promise<void> {
  return logoutRemote(refreshToken)
}
