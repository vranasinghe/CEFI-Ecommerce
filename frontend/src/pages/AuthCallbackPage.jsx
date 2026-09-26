import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { authFetch } from '../utils/authFetch';

/**
 * AuthCallbackPage
 * Google/Facebook send the user back here with a one-time ?code=. We hand it
 * to the backend, which completes the PKCE exchange using the secret it kept
 * in an HttpOnly cookie and sets the session cookies. No token ever reaches
 * this page's JavaScript.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [error, setError] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return; // React StrictMode runs effects twice; the code is single-use
    started.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const pendingRedirect = sessionStorage.getItem('cefi_auth_redirect');
    sessionStorage.removeItem('cefi_auth_redirect');
    // Drop the code from the address bar/history straight away.
    window.history.replaceState(null, '', window.location.pathname);

    if (!code) {
      setError(params.get('error_description') || 'Sign-in was cancelled.');
      return;
    }

    (async () => {
      try {
        const res = await authFetch('/api/auth/oauth/callback', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.user) throw new Error(data.message || 'Sign-in could not be completed.');
        await refreshUser();
        navigate(pendingRedirect || '/', { replace: true });
      } catch (err) {
        setError(err.message);
      }
    })();
  }, [navigate, refreshUser]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-cefi-cream space-y-4 px-4 text-center">
        <p className="font-serif font-bold text-xl text-cefi-earth">We couldn't sign you in</p>
        <p className="text-sm text-gray-600">{error}</p>
        <button onClick={() => navigate('/account', { replace: true })} className="px-5 py-2 rounded-full bg-cefi-green text-white text-sm font-bold">
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-cefi-cream space-y-6">
      <div className="w-16 h-16 rounded-full border-4 border-cefi-green border-t-transparent animate-spin" />
      <div className="text-center space-y-1">
        <p className="font-serif font-bold text-xl text-cefi-earth">Signing you in…</p>
        <p className="text-xs text-gray-500">Please wait while we verify your account.</p>
      </div>
    </div>
  );
}
