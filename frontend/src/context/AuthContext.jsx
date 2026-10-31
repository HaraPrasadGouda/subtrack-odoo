import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getMe } from '@/api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // true while checking stored token

  // On mount: verify stored token
  useEffect(() => {
    const token = localStorage.getItem('subtrack_token');
    if (!token) {
      setLoading(false);
      return;
    }
    getMe()
      .then((u) => setUser(u))
      .catch(() => {
        localStorage.removeItem('subtrack_token');
        localStorage.removeItem('subtrack_user');
      })
      .finally(() => setLoading(false));
  }, []);

  const saveSession = useCallback((user, token) => {
    localStorage.setItem('subtrack_token', token);
    localStorage.setItem('subtrack_user', JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('subtrack_token');
    localStorage.removeItem('subtrack_user');
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, saveSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

