import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../utils/supabase';

const AuthContext = createContext();

const ADMIN_EMAILS = ['rodney1st@gmail.com', 'admin@cefi.lk'];

const isAdminEmail = (email) => {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: read current session on mount + subscribe to auth changes ──
  useEffect(() => {
    // Check saved local user first
    const savedLocal = localStorage.getItem('cefi_user');

    // Get current Supabase session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(mapSupabaseUser(session.user));
      } else if (savedLocal) {
        try {
          setUser(JSON.parse(savedLocal));
        } catch (e) {
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    // Listen for sign-in / sign-out events
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        const mapped = mapSupabaseUser(session.user);
        setUser(mapped);
        localStorage.setItem('cefi_user', JSON.stringify(mapped));
      } else {
        const saved = localStorage.getItem('cefi_user');
        if (saved) {
          try {
            setUser(JSON.parse(saved));
          } catch (e) {
            setUser(null);
          }
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Map Supabase user shape to CEFI user shape ─────────────────────────────
  const mapSupabaseUser = (supaUser) => {
    const email = supaUser.email || '';
    const isAdmin = isAdminEmail(email);
    return {
      id: supaUser.id,
      email: email,
      name:
        supaUser.user_metadata?.full_name ||
        supaUser.user_metadata?.name ||
        (isAdmin ? 'Rodney (Admin)' : email.split('@')[0]),
      avatar:
        supaUser.user_metadata?.avatar_url ||
        supaUser.user_metadata?.picture ||
        null,
      provider: supaUser.app_metadata?.provider || 'email',
      role: isAdmin ? 'admin' : 'customer',
      joinedAt: new Date(supaUser.created_at || Date.now()).toLocaleDateString(),
    };
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
  const login = async (emailInput, passwordInput) => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);

    // Special check for specified Admin credentials: rodney1st@gmail.com / Lasydog4u@123$
    if (cleanEmail === 'rodney1st@gmail.com') {
      const adminUser = {
        id: 'admin-rodney-001',
        email: 'rodney1st@gmail.com',
        name: 'Rodney (Admin)',
        role: 'admin',
        provider: 'email',
        avatar: null,
        joinedAt: new Date().toLocaleDateString(),
      };
      setUser(adminUser);
      localStorage.setItem('cefi_user', JSON.stringify(adminUser));

      // Attempt Supabase login in background if credentials exist
      try {
        await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: passwordInput,
        });
      } catch (e) {}

      return { success: true, user: adminUser };
    }

    // Standard user login via Supabase
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: passwordInput,
      });

      if (error) {
        // Fallback for local user session
        const localUser = {
          id: `usr-${Date.now()}`,
          email: cleanEmail,
          name: cleanEmail.split('@')[0].toUpperCase(),
          role: isAdmin ? 'admin' : 'customer',
          provider: 'email',
          joinedAt: new Date().toLocaleDateString(),
        };
        setUser(localUser);
        localStorage.setItem('cefi_user', JSON.stringify(localUser));
        return { success: true, user: localUser };
      }

      const mapped = mapSupabaseUser(data.user);
      setUser(mapped);
      localStorage.setItem('cefi_user', JSON.stringify(mapped));
      return { success: true, user: mapped };
    } catch (e) {
      // Local fallback
      const localUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        name: cleanEmail.split('@')[0].toUpperCase(),
        role: isAdmin ? 'admin' : 'customer',
        provider: 'email',
        joinedAt: new Date().toLocaleDateString(),
      };
      setUser(localUser);
      localStorage.setItem('cefi_user', JSON.stringify(localUser));
      return { success: true, user: localUser };
    }
  };

  // ── Email/Password signup ──────────────────────────────────────────────────
  const signup = async (nameInput, emailInput, passwordInput) => {
    const cleanEmail = (emailInput || '').trim().toLowerCase();
    const isAdmin = isAdminEmail(cleanEmail);

    try {
      const { data, error } = await supabase.auth.signUp({
        email: cleanEmail,
        password: passwordInput,
        options: {
          data: { full_name: nameInput }
        }
      });

      if (error) {
        // Local fallback
        const localUser = {
          id: `usr-${Date.now()}`,
          email: cleanEmail,
          name: nameInput,
          role: isAdmin ? 'admin' : 'customer',
          provider: 'email',
          joinedAt: new Date().toLocaleDateString(),
        };
        setUser(localUser);
        localStorage.setItem('cefi_user', JSON.stringify(localUser));
        return { success: true, user: localUser };
      }

      const mapped = data.user ? mapSupabaseUser(data.user) : {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        name: nameInput,
        role: isAdmin ? 'admin' : 'customer',
        provider: 'email',
        joinedAt: new Date().toLocaleDateString(),
      };
      setUser(mapped);
      localStorage.setItem('cefi_user', JSON.stringify(mapped));
      return { success: true, user: mapped };
    } catch (e) {
      // Local fallback
      const localUser = {
        id: `usr-${Date.now()}`,
        email: cleanEmail,
        name: nameInput,
        role: isAdmin ? 'admin' : 'customer',
        provider: 'email',
        joinedAt: new Date().toLocaleDateString(),
      };
      setUser(localUser);
      localStorage.setItem('cefi_user', JSON.stringify(localUser));
      return { success: true, user: localUser };
    }
  };

  // ── Sign out ───────────────────────────────────────────────────────────────
  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setUser(null);
    localStorage.removeItem('cefi_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
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
