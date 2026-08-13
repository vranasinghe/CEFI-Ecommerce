import React, { useState } from 'react';
import { X, LogIn, User, Lock, Mail, ArrowRight, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

/**
 * LoginPromptModal
 * Displays Google & Facebook OAuth buttons AND Email/Password Sign In & Registration form.
 */
export default function LoginPromptModal({ isOpen, onClose, onSuccess, redirectTo }) {
  const { signInWithGoogle, signInWithFacebook, login, signup } = useAuth();
  const navigate = useNavigate();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null); // 'google' | 'facebook' | 'email' | null
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const storeRedirect = () => {
    if (redirectTo) sessionStorage.setItem('cefi_auth_redirect', redirectTo);
  };

  const handleGoogle = async () => {
    setError('');
    setLoadingProvider('google');
    storeRedirect();
    try {
      await signInWithGoogle();
    } catch (err) {
      setError('Could not connect to Google. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleFacebook = async () => {
    setError('');
    setLoadingProvider('facebook');
    storeRedirect();
    try {
      await signInWithFacebook();
    } catch (err) {
      setError('Could not connect to Facebook. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleEmailAuthSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoadingProvider('email');

    try {
      let res;
      if (isLoginMode) {
        res = await login(email, password);
      } else {
        if (!name.trim()) {
          setError('Please enter your full name.');
          setLoadingProvider(null);
          return;
        }
        res = await signup(name.trim(), email, password);
      }

      if (res && res.success) {
        onClose();
        if (onSuccess) onSuccess();
        if (redirectTo) navigate(redirectTo);
      } else {
        setError('Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-cefi-earth/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden animate-fadeIn my-6 max-h-[90vh] flex flex-col">

        {/* Top gradient accent bar */}
        <div className="h-1.5 w-full bg-gradient-to-r from-cefi-green via-cefi-gold to-cefi-green shrink-0" />

        {/* Header */}
        <div className="px-7 pt-6 pb-3 flex items-start justify-between shrink-0">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 bg-cefi-green/10 rounded-xl flex items-center justify-center">
                <LogIn className="w-4 h-4 text-cefi-green" />
              </div>
              <span className="text-[10px] uppercase font-bold tracking-widest text-cefi-gold">
                CEFI Account Portal
              </span>
            </div>
            <h2 className="font-serif font-bold text-2xl text-cefi-earth">
              {isLoginMode ? 'Sign In to Account' : 'Create Your Account'}
            </h2>
            <p className="text-xs text-gray-500 leading-relaxed">
              {isLoginMode
                ? 'Sign in to access saved details & checkout faster.'
                : 'Register for faster checkout & exclusive export updates.'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors ml-2 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Warning banner */}
        <div className="mx-7 mb-3 px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-2 shrink-0">
          <span className="text-amber-500 text-base leading-none mt-0.5">&#9888;</span>
          <p className="text-xs text-amber-700 font-medium leading-relaxed">
            <strong>Login required:</strong> Please sign in or create an account to proceed with your order.
          </p>
        </div>

        {/* Modal Scrollable Body */}
        <div className="px-7 pb-6 space-y-4 overflow-y-auto flex-1">

          {error && (
            <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          {/* Social OAuth Buttons */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Button */}
            <button
              onClick={handleGoogle}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center space-x-2 px-3 py-3 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 rounded-2xl shadow-xs transition-all disabled:opacity-60 text-xs font-semibold text-gray-700"
            >
              {loadingProvider === 'google' ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              )}
              <span>Google</span>
            </button>

            {/* Facebook Button */}
            <button
              onClick={handleFacebook}
              disabled={loadingProvider !== null}
              className="flex items-center justify-center space-x-2 px-3 py-3 bg-[#1877F2] hover:bg-[#1666d8] text-white rounded-2xl shadow-xs transition-all disabled:opacity-60 text-xs font-semibold"
            >
              {loadingProvider === 'facebook' ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              )}
              <span>Facebook</span>
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center space-x-3 my-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">or email</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email / Password Form */}
          <form onSubmit={handleEmailAuthSubmit} className="space-y-3.5">
            {!isLoginMode && (
              <div>
                <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Jane Doe"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="customer@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase text-gray-600 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-xs focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingProvider !== null}
              className="w-full py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-xs shadow-md flex items-center justify-center space-x-2 transition-all disabled:opacity-60 mt-2"
            >
              {loadingProvider === 'email' ? (
                <span className="animate-pulse">Please wait...</span>
              ) : (
                <>
                  <span>{isLoginMode ? 'Sign In & Continue' : 'Register & Continue'}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-cefi-gold" />
                </>
              )}
            </button>
          </form>

          {/* Toggle mode */}
          <div className="text-center pt-2">
            <button
              type="button"
              onClick={() => {
                setIsLoginMode(!isLoginMode);
                setError('');
              }}
              className="text-xs font-semibold text-cefi-green hover:underline"
            >
              {isLoginMode
                ? "Don't have an account? Register here"
                : 'Already have an account? Sign In'}
            </button>
          </div>

          <div className="flex items-center justify-center space-x-1.5 text-[10px] text-gray-400 pt-1">
            <ShieldCheck className="w-3.5 h-3.5 text-cefi-green" />
            <span>256-Bit SSL Encrypted Verification</span>
          </div>

        </div>
      </div>
    </div>
  );
}
