import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import supabase from '../utils/supabase';

/**
 * AuthCallbackPage
 * Supabase redirects the user here after Google/Facebook OAuth.
 * The Supabase client automatically picks up the session tokens from the URL
 * and fires an onAuthStateChange event, which AuthContext handles.
 * We just wait briefly and redirect the user onward.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    // Supabase JS v2 automatically exchanges the code in the URL for a session.
    // We simply wait for the session to be established, then redirect.
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      // If there's a pending redirect stored (e.g. /checkout), use it
      const pendingRedirect = sessionStorage.getItem('cefi_auth_redirect');
      sessionStorage.removeItem('cefi_auth_redirect');

      if (session) {
        navigate(pendingRedirect || '/', { replace: true });
      } else {
        // Retry once after a short delay to allow the code exchange to complete
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          navigate(retrySession ? (pendingRedirect || '/') : '/account', { replace: true });
        }, 1500);
      }
    };

    checkSession();
  }, [navigate]);

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
