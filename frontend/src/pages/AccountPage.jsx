import React, { useState } from 'react';
import { User as UserIcon, Mail, Lock, LogOut, Package, ShieldCheck, ShieldAlert, ArrowRight, LayoutDashboard } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, loading, signInWithGoogle, signInWithFacebook, login, signup, logout } = useAuth();
  const navigate = useNavigate();
  
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [error, setError] = useState('');

  const handleGoogle = async () => {
    setError('');
    setLoadingProvider('google');
    try {
      await signInWithGoogle();
    } catch {
      setError('Could not connect to Google. Please try again.');
      setLoadingProvider(null);
    }
  };

  const handleFacebook = async () => {
    setError('');
    setLoadingProvider('facebook');
    try {
      await signInWithFacebook();
    } catch {
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
        if (res.user?.role === 'admin') {
          navigate('/admin');
        }
      } else {
        setError(res?.error || 'Authentication failed. Please check your credentials.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  // ── Loading state while checking auth ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-cefi-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── Logged-in Customer or Admin Dashboard View ──────────────────────────────
  if (user) {
    const isAdmin = user.role === 'admin';

    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">

        {/* User Welcome Header Box */}
        <div className={`${isAdmin ? 'bg-slate-900 border-2 border-cefi-gold' : 'bg-cefi-green'} text-white p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6 relative overflow-hidden`}>
          {isAdmin && (
            <div className="absolute top-0 right-0 transform translate-x-4 -translate-y-4 w-32 h-32 bg-cefi-gold/10 rounded-full blur-2xl pointer-events-none" />
          )}

          <div className="flex items-center space-x-4 z-10">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="w-16 h-16 rounded-full border-2 border-cefi-gold object-cover shadow-md"
              />
            ) : (
              <div className={`w-16 h-16 ${isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-cefi-gold text-cefi-earth'} font-serif font-bold text-2xl rounded-full flex items-center justify-center border-2 border-white shadow-md`}>
                {user.name ? user.name.charAt(0).toUpperCase() : 'A'}
              </div>
            )}
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">
                  {isAdmin ? '🛡️ CEFI Administrator' : 'CEFI Customer Profile'}
                </span>
              </div>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl">{user.name}</h1>
              <p className="text-xs text-emerald-100">{user.email}</p>
              <div className="flex items-center space-x-2 mt-1.5">
                <span className="text-[10px] bg-white/20 text-white px-2.5 py-0.5 rounded-full capitalize font-semibold">
                  Role: <strong className="text-cefi-gold uppercase">{user.role || 'customer'}</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-3 z-10">
            {isAdmin && (
              <Link
                to="/admin"
                className="px-5 py-2.5 bg-cefi-gold hover:bg-amber-400 text-slate-950 rounded-full text-xs font-bold flex items-center space-x-1.5 shadow-md transition-all"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Admin Dashboard</span>
              </Link>
            )}

            <button
              onClick={logout}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center space-x-2 border border-white/20 transition-all"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>

        {/* Admin Quick Action Banner (If Admin) */}
        {isAdmin && (
          <div className="bg-amber-500/10 border-2 border-amber-500/30 p-6 rounded-3xl flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-amber-500 text-slate-950 rounded-2xl flex items-center justify-center shrink-0">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-serif font-bold text-lg text-slate-900">Administrator Management Privileges Active</h3>
                <p className="text-xs text-slate-600">You have full access to add, edit, or remove products and manage store settings.</p>
              </div>
            </div>
            <Link
              to="/admin"
              className="px-6 py-3 bg-slate-900 text-cefi-gold hover:bg-slate-800 rounded-full text-xs font-bold flex items-center space-x-2 transition-all shrink-0"
            >
              <span>Open Catalog Editor</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        )}

        {/* Order History */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth flex items-center space-x-2">
              <Package className="w-5 h-5 text-cefi-green" />
              <span>Your Orders & Quote History</span>
            </h3>
            <span className="text-xs text-cefi-gold font-bold">Account Activity</span>
          </div>

          <div className="text-center py-8 space-y-3 bg-cefi-cream/30 rounded-2xl border border-gray-100">
            <Package className="w-8 h-8 text-cefi-green/40 mx-auto" />
            <p className="text-xs text-gray-500 font-medium">Your placed orders and requested quotes will be displayed here.</p>
            <Link
              to="/products"
              className="inline-block px-5 py-2 bg-cefi-green text-white text-xs font-semibold rounded-full hover:bg-cefi-green-dark transition-all"
            >
              Browse Catalog
            </Link>
          </div>
        </div>

      </div>
    );
  }

  // ── Guest / Authentication Screen ──────────────────────────────────────────
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
            <UserIcon className="w-7 h-7" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-cefi-earth">
            {isLoginMode ? 'User & Admin Login' : 'Create CEFI Account'}
          </h1>
          <p className="text-xs text-gray-500 leading-relaxed">
            {isLoginMode
              ? 'Sign in with your email or social account to access your portal.'
              : 'Register for faster checkout & export updates.'}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-100 text-red-600 text-xs font-semibold rounded-xl text-center">
            {error}
          </div>
        )}

        {/* Google & Facebook OAuth Buttons */}
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
        <div className="flex items-center space-x-3">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-[11px] text-gray-400 font-bold uppercase tracking-wider">or email</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Email & Password Registration / Login Form */}
        <form onSubmit={handleEmailAuthSubmit} className="space-y-4">
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Your Full Name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                placeholder="customer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green focus:border-transparent outline-none transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loadingProvider !== null}
            className="w-full py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md transition-all disabled:opacity-60"
          >
            {loadingProvider === 'email' ? 'Please wait...' : isLoginMode ? 'Sign In to Account' : 'Register Account'}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-gray-100">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setError('');
            }}
            className="text-xs font-semibold text-cefi-green hover:underline"
          >
            {isLoginMode ? "Don't have an account? Register here" : "Already have an account? Sign In"}
          </button>
        </div>

        <div className="flex items-center justify-center space-x-1.5 text-[11px] text-gray-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-cefi-green" />
          <span>Secured 256-Bit Encrypted Authentication</span>
        </div>

      </div>
    </div>
  );
}
