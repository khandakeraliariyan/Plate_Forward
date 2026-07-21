import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAccessToken, refreshAccessToken, hasSessionCookie } from "../lib/api";
import type { Role, User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, rememberMe: boolean) => Promise<User>;
  register: (fullName: string, email: string, password: string, role: Role) => Promise<User>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!hasSessionCookie()) {
        setLoading(false);
        return;
      }

      const token = await refreshAccessToken();
      if (token) {
        try {
          const res = await api.get("/auth/me");
          setUser(res.data.data.user ?? res.data.data);
        } catch {
          setAccessToken(null);
        }
      }
      setLoading(false);
    })();
  }, []);

  const login = useCallback(async (email: string, password: string, rememberMe: boolean) => {
    const res = await api.post("/auth/login", { email, password, rememberMe });
    const { user: loggedInUser, accessToken } = res.data.data;
    setAccessToken(accessToken);
    setUser(loggedInUser);
    return loggedInUser as User;
  }, []);

  const register = useCallback(async (fullName: string, email: string, password: string, role: Role) => {
    const res = await api.post("/auth/register", { fullName, email, password, role });
    const { user: newUser, accessToken } = res.data.data;
    setAccessToken(accessToken);
    setUser(newUser);
    return newUser as User;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post("/auth/logout");
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
