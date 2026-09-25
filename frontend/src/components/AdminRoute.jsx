import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Client-side gate for /admin/*. This is defense-in-depth, not the real
 * boundary — every admin API call is independently checked server-side
 * (requireAdmin in backend/middleware/auth.js), so this component being
 * bypassed or its state being tampered with grants nothing by itself. Its
 * job is only to stop a non-admin from seeing the admin dashboard shell
 * (which would otherwise render and then fail every fetch with 401/403).
 */
export default function AdminRoute({ children }) {
  const { user, loading, adminChecked, isAdmin } = useAuth();

  if (loading || !adminChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cefi-cream">
        <div className="w-10 h-10 border-4 border-cefi-green border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/account" replace />;
  }

  return children;
}
