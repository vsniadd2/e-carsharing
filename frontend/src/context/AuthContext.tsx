import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from 'react';
import type { User } from '../api/auth';
import {
  login as apiLogin,
  register as apiRegister,
  refreshSessionSingleFlight,
  logoutRemote,
  isJwtExpired,
} from '../api/auth';
import { fetchMe } from '../api/fleet';
import { tryRegisterPushForEcoRide } from '../lib/pushSetup';

const ACCESS_KEY = 'ecoride_access_token';
const REFRESH_KEY = 'ecoride_refresh_token';
const USER_KEY = 'ecoride_user';
/** Старый ключ до пары access/refresh — очищаем при загрузке. */
const LEGACY_TOKEN_KEY = 'ecoride_token';

type AuthContextType = {
  user: User | null;
  token: string | null;
  /** Access JWT ещё не истёк по данным клиента — можно слать authed-запросы без неминуемого 401. */
  isAccessTokenValid: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  isReady: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

function persistSession(access: string, refresh: string, user: User) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSessionStorage() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
}

function loadStored(): { token: string | null; refreshToken: string | null; user: User | null } {
  try {
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    const access = localStorage.getItem(ACCESS_KEY);
    const refresh = localStorage.getItem(REFRESH_KEY);
    const u = localStorage.getItem(USER_KEY);
    if (u) {
      const user = JSON.parse(u) as User;
      if (typeof user.balance !== 'number') user.balance = 0;
      if (typeof user.carsiki !== 'number') user.carsiki = 0;
      if (access && refresh) return { token: access, refreshToken: refresh, user };
      if (access && !refresh) {
        clearSessionStorage();
        return { token: null, refreshToken: null, user: null };
      }
    }
  } catch (_) {
    clearSessionStorage();
  }
  return { token: null, refreshToken: null, user: null };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const isAccessTokenValid = useMemo(
    () => Boolean(token) && !isJwtExpired(token as string),
    [token],
  );

  useEffect(() => {
    const { token: t, user: u } = loadStored();
    setToken(t);
    setUser(u);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) return;
    const refresh = localStorage.getItem(REFRESH_KEY);
    const access = localStorage.getItem(ACCESS_KEY);
    if (!refresh) return;
    if (access && !isJwtExpired(access)) return;

    let cancelled = false;
    void refreshSessionSingleFlight(refresh)
      .then((auth) => {
        if (cancelled) return;
        persistSession(auth.accessToken, auth.refreshToken, auth.user);
        setToken(auth.accessToken);
        setUser(auth.user);
      })
      .catch(() => {
        if (cancelled) return;
        clearSessionStorage();
        setToken(null);
        setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isReady]);

  const refreshProfile = useCallback(async () => {
    const t = localStorage.getItem(ACCESS_KEY);
    if (!t) return;
    try {
      const u = await fetchMe(t);
      setUser(u);
      const r = localStorage.getItem(REFRESH_KEY);
      if (r) persistSession(t, r, u);
    } catch {
      /* ignore */
    }
  }, []);

  /** Баланс и профиль — из БД (/api/me), а не только из кэша localStorage */
  useEffect(() => {
    if (!isReady || !token) return;
    if (isJwtExpired(token)) return;
    void refreshProfile();
  }, [isReady, token, refreshProfile]);

  useEffect(() => {
    if (!isReady || !token || !user) return;
    void tryRegisterPushForEcoRide(token).catch(() => {});
  }, [isReady, token, user?.id]);

  const login = useCallback(async (email: string, password: string) => {
    const auth = await apiLogin(email, password);
    persistSession(auth.accessToken, auth.refreshToken, auth.user);
    setToken(auth.accessToken);
    setUser(auth.user);
  }, []);

  const register = useCallback(async (email: string, password: string, name?: string) => {
    const auth = await apiRegister(email, password, name);
    persistSession(auth.accessToken, auth.refreshToken, auth.user);
    setToken(auth.accessToken);
    setUser(auth.user);
  }, []);

  const logout = useCallback(() => {
    const r = localStorage.getItem(REFRESH_KEY);
    if (r) void logoutRemote(r).catch(() => {});
    clearSessionStorage();
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    const onSessionInvalid = () => logout();
    window.addEventListener('ecoride:session-invalid', onSessionInvalid);
    return () => window.removeEventListener('ecoride:session-invalid', onSessionInvalid);
  }, [logout]);

  return (
    <AuthContext.Provider
      value={{ user, token, isAccessTokenValid, login, register, logout, refreshProfile, isReady }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth used outside AuthProvider');
  return ctx;
}
