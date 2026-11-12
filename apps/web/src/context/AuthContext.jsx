import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../services/apiClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [csrfToken, setCsrfToken] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await api.me();
      setUser(res.data.user);
      setCsrfToken(res.data.csrfToken);
    } catch {
      setUser(null);
      setCsrfToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email, password) => {
    const res = await api.login(email, password);
    setUser(res.data.user);
    setCsrfToken(res.data.csrfToken);
    return res.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } finally {
      setUser(null);
      setCsrfToken(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      csrfToken,
      loading,
      isAdmin: user?.role === 'ADMIN',
      login,
      logout,
      refresh,
    }),
    [user, csrfToken, loading, login, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
