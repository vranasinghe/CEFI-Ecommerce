import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../utils/supabase';
import { authFetch } from '../utils/authFetch';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  // True once we've asked the backend whether the current session is an
  // admin (or confirmed there is no session). AdminRoute waits on this so it
  // never renders admin UI, or bounces a real admin, on a stale guess.
  const [adminChecked, setAdminChecked] = useState(false);

  // ── Bootstrap: read current session on mount + subscribe to auth changes ──
  // Only a real Supabase session signs someone in. The localStorage copy is a
  // display cache and is never trusted: anyone can edit it to say role: 'admin'.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        applySession(session.user);
      } else {
        setUser(null);
        setAdminChecked(true);
        localStorage.removeItem('cefi_user');
      }
      setLoading(false);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        applySession(session.user);
      } else {
        setUser(null);
        setAdminChecked(true);
        localStorage.removeItem('cefi_user');
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Map Supabase user shape to CEFI user shape ─────────────────────────────
  // No email is treated as "the admin" here. role always starts as
  // 'customer' — refreshAdminStatus() is the only thing that can upgrade it,
  // and it does so by asking the backend, which is the only place that reads
  // ADMIN_EMAILS / app_metadata.role.
  const mapSupabaseUser = (supaUser) => {
    const email = supaUser.email || '';
    return {
      id: supaUser.id,
      email,
      name:
        supaUser.user_metadata?.full_name ||
        supaUser.user_metadata?.name ||
        email.split('@')[0],
      avatar:
        supaUser.user_metadata?.avatar_url ||
        supaUser.user_metadata?.picture ||
        null,
      provider: supaUser.app_metadata?.provider || 'email',
      role: 'customer',
      joinedAt: new Date(supaUser.created_at || Date.now()).toLocaleDateString(),
    };
  };

  /**
   * Asks the backend's /api/auth/me whether this session is an admin, and
   * upgrades the in-memory + cached user if so. Runs on every bootstrap,
   * auth-state change and successful login/signup, so a session that has
   * been granted admin server-side (or had it revoked) is reflected within
   * one round trip — never taken on the client's word.
   */
  const refreshAdminStatus = async (mappedUser) => {
    let finalUser = mappedUser;
    try {
      const res = await authFetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data?.user?.isAdmin) {
          finalUser = { ...mappedUser, role: 'admin' };
        }
      }
    } catch (e) {
      // Network hiccup: fall back to 'customer'. The backend still enforces
      // the real admin check on every admin API call regardless of this flag.
    }
    setUser(finalUser);
    localStorage.setItem('cefi_user', JSON.stringify(finalUser));
    setAdminChecked(true);
    return finalUser;
  };

  const applySession = (supaUser) => {
    const mapped = mapSupabaseUser(supaUser);
    setUser(mapped);
    setAdminChecked(false);
    return refreshAdminStatus(mapped);
  };

  // ── OAuth sign-in ──────────────────────────────────────────────────────────
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signInWithFacebook = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  // ── Email/Password login ───────────────────────────────────────────────────
  // Failures are failures: no local fallback user and no per-email bypass.
  const login = async (emailInput, passwordInput) => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (error || !data?.user) {
        const unconfirmed = /not confirmed/i.test(error?.message || '');
        return {
          success: false,
          error: unconfirmed
            ? 'Please confirm your email address (check your inbox), then sign in.'
            : 'Incorrect email or password.',
        };
      }

      const mapped = mapSupabaseUser(data.user);
      setUser(mapped);
      setAdminChecked(false);
      localStorage.setItem('cefi_user', JSON.stringify(mapped));
      // Awaited: callers (e.g. AccountPage) check res.user.role === 'admin'
      // right after login() resolves, so the admin check must be settled first.
      const finalUser = await refreshAdminStatus(mapped);
      return { success: true, user: finalUser };
    } catch (e) {
      return { success: false, error: 'Could not reach the sign-in service. Please try again.' };
    }
  };

  // ── Email/Password signup ──────────────────────────────────────────────────
  const signup = async (nameInput, emailInput, passwordInput) => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: passwordInput,
        options: {
          data: { full_name: nameInput }
        }
      });

      // One neutral message whether the address is new or already registered,
      // so the form can't be used to find out who has an account. Errors
      // about the password itself or rate limits are safe to show.
      const neutral = 'If this email can be registered, we have sent a confirmation link. Check your inbox, then sign in.';
      if (error) {
        const msg = error.message || '';
        if (/password/i.test(msg) && !/already/i.test(msg)) return { success: false, error: msg };
        if (/rate limit|too many/i.test(msg)) return { success: false, error: 'Too many attempts. Please wait a few minutes and try again.' };
        return { success: false, error: neutral };
      }

      // Email confirmation is on: there is no session until the link is clicked.
      if (!data?.session) {
        return { success: false, error: neutral };
      }

      const mapped = mapSupabaseUser(data.user);
      setUser(mapped);
      setAdminChecked(false);
      localStorage.setItem('cefi_user', JSON.stringify(mapped));
      const finalUser = await refreshAdminStatus(mapped);
      return { success: true, user: finalUser };
    } catch (e) {
      return { success: false, error: 'Could not reach the sign-up service. Please try again.' };
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    setAdminChecked(true);
    localStorage.removeItem('cefi_user');
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
        isAdmin: user?.role === 'admin',
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
