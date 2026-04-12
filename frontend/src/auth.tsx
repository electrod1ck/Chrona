import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { apiFetch, ensureCsrf } from './api';

export type Me = {
  id: number;
  username: string;
  display_name: string;
  avatar_url?: string;
};

type AuthMeResponse =
  | { authenticated: false }
  | {
      authenticated: true;
      id: number;
      username: string;
      display_name: string;
      avatar_url?: string;
    };

type RegisterPayload = {
  username: string;
  password: string;
  email?: string;
  display_name?: string;
};

type AuthContextValue = {
  me: Me | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await apiFetch<AuthMeResponse>('/auth/me/');
      if (!r.authenticated) {
        setMe(null);
        return;
      }
      setMe({
        id: r.id,
        username: r.username,
        display_name: r.display_name,
        avatar_url: r.avatar_url || undefined,
      });
    } catch {
      setMe(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void ensureCsrf().then(() => refresh());
  }, [refresh]);

  const login = useCallback(
    async (username: string, password: string) => {
      await ensureCsrf();
      await apiFetch('/auth/login/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      await refresh();
    },
    [refresh]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      await ensureCsrf();
      await apiFetch('/auth/register/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      await refresh();
    },
    [refresh]
  );

  const logout = useCallback(async () => {
    await ensureCsrf();
    try {
      await apiFetch('/auth/logout/', { method: 'POST', body: '{}' });
    } catch {
      /* ignore */
    }
    setMe(null);
  }, []);

  const value = useMemo(
    () => ({ me, loading, login, register, logout, refresh }),
    [me, loading, login, register, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthProvider');
  return ctx;
}
