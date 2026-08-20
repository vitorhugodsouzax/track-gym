import { useEffect, useState } from 'react';
import { getMe, getToken, login as loginRequest, logout as logoutRequest, register as registerRequest } from '../services/api';
import type { AuthUser } from '../types/api';

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      setLoading(false);
      return;
    }
    getMe()
      .then((result) => setUser(result.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  return {
    user,
    loading,
    async login(nickname: string, password: string) {
      const next = await loginRequest(nickname, password);
      setUser(next);
    },
    async register(nickname: string, password: string) {
      const next = await registerRequest(nickname, password);
      setUser(next);
    },
    async logout() {
      await logoutRequest();
      setUser(null);
    },
    refresh: async () => {
      const result = await getMe();
      setUser(result.user);
    },
  };
}
