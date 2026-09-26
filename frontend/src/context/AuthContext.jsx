import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authFetch } from '../utils/authFetch';

const AuthContext = createContext();

// Sessions live in HttpOnly cookies set by the backend (/api/auth/*). This
// file never sees a token: it only asks the server who is signed in. That's
// what keeps tokens out of localStorage and out of reach of page scripts.

/** Map the server's profile to the shape the UI uses. */
const toUiUser = (u) => (u ? {
  id: u.id,
  email: u.email,
  name: u.name,
  avatar: u.avatar,
  provider: u.provider,
  role: u.role === 'admin' ? 'admin' : 'customer',
  joinedAt: u.joinedAt ? new Date(u.joinedAt).toLocaleDateString() : '',
} : null);

async function postJson(url, body) {
  const res = await authFetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // Admin status comes from the same /me response, so it's settled as soon
  // as loading is. Kept for AdminRoute, which waits on it.
  const [adminChecked, setAdminChecked] = useState(false);

  const applyUser = useCallback((serverUser) => {
    const ui = toUiUser(serverUser);
    setUser(ui);
    setAdminChecked(true);
    // Display-only cache (no tokens) used by the admin users list.
    try {
      if (ui) localStorage.setItem('cefi_user', JSON.stringify(ui));
      else localStorage.removeItem('cefi_user');
    } catch {}
    return ui;
  }, []);

  /** Re-reads the session from the server (cookies are sent automatically). */
  const refreshUser = useCallback(async () => {
    try {
      const res = await authFetch('/api/auth/me');
      const data = await res.json().catch(() => ({}));
      return applyUser(res.ok ? data.user : null);
    } catch {
      return applyUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyUser]);

  useEffect(() => {
    // One-time cleanup: older versions kept the Supabase session (with its
    // tokens) in localStorage. Remove it so no token lingers there.
    try {
      Object.keys(localStorage)
        .filter((k) => /^sb-.*-auth-token/.test(k))
        .forEach((k) => localStorage.removeItem(k));
    } catch {}
    refreshUser();
  }, [refreshUser]);

  // ── OAuth sign-in (Google / Facebook) ──────────────────────────────────────
  // The server starts the PKCE flow and keeps its secret in an HttpOnly
  // cookie; we just follow the redirect it returns.
  const signInWithProvider = async (provider) => {
    const { ok, data } = await postJson('/api/auth/oauth/start', { provider });
    if (!ok || !data.url) throw new Error(data.message || 'Could not start sign-in. Please try again.');
    window.location.assign(data.url);
  };
  const signInWithGoogle = () => signInWithProvider('google');
  const signInWithFacebook = () => signInWithProvider('facebook');

  // ── Email/Password login ───────────────────────────────────────────────────
  const login = async (emailInput, passwordInput) => {
    try {
      const { ok, data } = await postJson('/api/auth/login', {
        email: (emailInput || '').trim().toLowerCase(),
        password: passwordInput || '',
      });
      if (!ok || !data.user) {
        return { success: false, error: data.message || 'Incorrect email or password.' };
      }
      return { success: true, user: applyUser(data.user) };
    } catch {
      return { success: false, error: 'Could not reach the sign-in service. Please try again.' };
    }
  };

  // ── Email/Password signup ──────────────────────────────────────────────────
  const signup = async (nameInput, emailInput, passwordInput) => {
    try {
      const { data } = await postJson('/api/auth/signup', {
        name: (nameInput || '').trim(),
        email: (emailInput || '').trim().toLowerCase(),
        password: passwordInput || '',
      });
      if (!data.success || !data.user) {
        return { success: false, error: data.message || 'Sign up failed. Please try again.' };
      }
      return { success: true, user: applyUser(data.user) };
    } catch {
      return { success: false, error: 'Could not reach the sign-up service. Please try again.' };
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  // The server revokes every session of the account (all devices), so the
  // tokens stop working immediately, then clears the cookies.
  const logout = async () => {
    try { await postJson('/api/auth/logout'); } catch {}
    applyUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        adminChecked,
        signInWithGoogle,
        signInWithFacebook,
        login,
        signup,
        logout,
        refreshUser,
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
