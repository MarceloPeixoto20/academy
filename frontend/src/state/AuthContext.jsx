import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function loadMe() {
    try {
      const me = await api("/auth/me");
      setUser(me);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function login(email, senha) {
    await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    await loadMe();
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUser(null);
  }

  function hasPermission(code) {
    return Boolean(user?.permissions?.includes(code) || user?.is_admin);
  }

  useEffect(() => {
    loadMe();
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    login,
    logout,
    hasPermission,
    reload: loadMe,
  }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
