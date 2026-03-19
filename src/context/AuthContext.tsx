import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

export type PlanType = 'free' | 'founder' | 'early' | 'pro';

export interface AuthUser {
  id: number;
  email: string;
  planType: PlanType;
  emailVerified: boolean;
  uploadsUsedToday: number;
  uploadsUsedMonth: number;
  lifetimeFreeUsed?: number;
  pendingPayment?: boolean;
  pendingPlan?: string;
  paymentProvider?: string;
  planStartDate?: string;
  planEndDate?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPremium: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signup: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'rco_token';

async function apiFetch(path: string, options?: RequestInit) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });
  const data = await res.json();
  return { ok: res.ok, status: res.status, data };
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [isLoading, setIsLoading] = useState(true);

  const fetchMe = useCallback(async (tok: string) => {
    const { ok, data } = await apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${tok}` },
    });
    if (ok) setUser(data);
    else {
      localStorage.removeItem(TOKEN_KEY);
      setToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (stored) {
      setToken(stored);
      fetchMe(stored).finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, [fetchMe]);

  const login = useCallback(async (email: string, password: string) => {
    const { ok, data } = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (ok) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, message: 'Logged in successfully' };
    }
    return { success: false, message: data.message || 'Login failed' };
  }, []);

  const signup = useCallback(async (email: string, password: string) => {
    const { ok, data } = await apiFetch('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (ok) {
      localStorage.setItem(TOKEN_KEY, data.token);
      setToken(data.token);
      setUser(data.user);
      return { success: true, message: data.message || 'Account created!' };
    }
    return { success: false, message: data.message || 'Signup failed' };
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    if (token) await fetchMe(token);
  }, [token, fetchMe]);

  const isPremium = user !== null && user.planType !== 'free';

  return (
    <AuthContext.Provider value={{
      user, token, isLoading, isAuthenticated: user !== null, isPremium,
      login, signup, logout, refreshUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
