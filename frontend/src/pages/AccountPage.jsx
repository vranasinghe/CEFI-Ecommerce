import React, { useState } from 'react';
import { User, Mail, Lock, LogOut, Package, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function AccountPage() {
  const { user, login, signup, logout } = useAuth();

  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');

  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setMsg('');

    if (isLoginMode) {
      const res = login(email, password);
      if (res.success) setMsg('Welcome back to CEFI!');
    } else {
      if (!name) {
        setMsg('Please enter your full name.');
        return;
      }
      const res = signup(name, email, password);
      if (res.success) setMsg('Account registered successfully!');
    }
  };

  if (user) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 space-y-8">
        
        {/* User Welcome Box */}
        <div className="bg-cefi-green text-white p-8 rounded-3xl shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-4">
            <div className="w-16 h-16 bg-cefi-gold text-cefi-earth font-serif font-bold text-2xl rounded-full flex items-center justify-center border-2 border-white shadow-md">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div>
              <span className="text-xs uppercase font-bold tracking-widest text-cefi-gold">CEFI Customer Profile</span>
              <h1 className="font-serif font-bold text-2xl sm:text-3xl">{user.name}</h1>
              <p className="text-xs text-emerald-100">{user.email}</p>
            </div>
          </div>

          <button
            onClick={logout}
            className="px-6 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full text-xs font-semibold flex items-center space-x-2 border border-white/20 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Order History */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-soft space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4">
            <h3 className="font-serif font-bold text-xl text-cefi-earth flex items-center space-x-2">
              <Package className="w-5 h-5 text-cefi-green" />
              <span>Your Orders & Quote History</span>
            </h3>
            <span className="text-xs text-cefi-gold font-bold">1 Order Recorded</span>
          </div>

          <div className="border border-gray-100 rounded-2xl p-5 space-y-3 bg-cefi-cream/40">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-bold text-cefi-green">CEFI-ORD-849201</span>
              <span className="px-2.5 py-1 bg-emerald-100 text-cefi-green font-bold text-[10px] rounded-full">Dispatched</span>
            </div>
            <p className="text-xs text-gray-600">
              Single Origin Ceylon Black Tea (250g), Alba Grade Cinnamon Quills (150g)
            </p>
            <div className="flex items-center justify-between pt-2 text-xs border-t border-gray-200/60">
              <span className="text-gray-400">Date: August 1, 2026</span>
              <span className="font-serif font-bold text-cefi-earth">$33.40</span>
            </div>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 bg-cefi-green/10 text-cefi-green rounded-2xl flex items-center justify-center mx-auto">
            <User className="w-6 h-6" />
          </div>
          <h1 className="font-serif font-bold text-2xl text-cefi-earth">
            {isLoginMode ? 'Customer Login' : 'Create CEFI Account'}
          </h1>
          <p className="text-xs text-gray-500">
            {isLoginMode ? 'Sign in to access your order history & saved quote requests.' : 'Register for faster checkout & export updates.'}
          </p>
        </div>

        {msg && (
          <div className="p-3 bg-emerald-50 text-cefi-green text-xs font-semibold rounded-xl text-center">
            {msg}
          </div>
        )}

        <form onSubmit={handleAuthSubmit} className="space-y-4">
          
          {!isLoginMode && (
            <div>
              <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Full Name</label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Email Address</label>
            <input
              type="email"
              required
              placeholder="customer@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-gray-600 mb-1">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-cefi-green"
            />
          </div>

          <button
            type="submit"
            className="w-full py-3.5 bg-cefi-green hover:bg-cefi-green-dark text-white rounded-full font-serif font-bold text-sm shadow-md transition-all"
          >
            {isLoginMode ? 'Sign In to Account' : 'Register Account'}
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => {
              setIsLoginMode(!isLoginMode);
              setMsg('');
            }}
            className="text-xs font-semibold text-cefi-green hover:underline"
          >
            {isLoginMode ? "Don't have an account? Register here" : "Already have an account? Sign In"}
          </button>
        </div>

      </div>

    </div>
  );
}
