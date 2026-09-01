import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { authService } from "../services/authService.js";

const SESSION_KEY = "ims-session";
const AuthContext = createContext(null);

function getStoredSession() {
  try {
    const storedSession = JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
    return storedSession ? { ...storedSession, verified: false } : null;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function persistSession(session, remember) {
  if (remember) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    return;
  }

  localStorage.removeItem(SESSION_KEY);
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(getStoredSession);

  useEffect(() => {
    if (!session?.token || session.verified !== false) return undefined;

    let mounted = true;

    async function verifyStoredSession() {
      try {
        const data = await authService.me(session.token);
        if (!mounted) return;

        setSession((prev) => {
          if (!prev || prev.token !== session.token) return prev;
          const next = { ...prev, user: { ...prev.user, ...data.user }, verified: true };
          if (localStorage.getItem(SESSION_KEY)) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          }
          return next;
        });
      } catch {
        if (!mounted) return;
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
      }
    }

    verifyStoredSession();

    return () => {
      mounted = false;
    };
  }, [session?.token, session?.verified]);

  const value = useMemo(
    () => ({
      session,
      async signIn(credentials, remember) {
        const nextSession = await authService.login(credentials);
        if (!nextSession.token || !nextSession.user) {
          throw new Error("Login response was incomplete.");
        }

        const verifiedSession = { ...nextSession, verified: true };
        setSession(verifiedSession);
        persistSession(verifiedSession, remember);
        return verifiedSession;
      },
      login(nextSession, remember) {
        const verifiedSession = { ...nextSession, verified: true };
        setSession(verifiedSession);
        persistSession(verifiedSession, remember);
      },
      logout() {
        setSession(null);
        localStorage.removeItem(SESSION_KEY);
      },
      updateProfile(patch) {
        setSession((prev) => {
          if (!prev) return prev;
          const next = { ...prev, user: { ...prev.user, ...patch } };
          if (localStorage.getItem(SESSION_KEY)) {
            localStorage.setItem(SESSION_KEY, JSON.stringify(next));
          }
          return next;
        });
      },
    }),
    [session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return auth;
}
