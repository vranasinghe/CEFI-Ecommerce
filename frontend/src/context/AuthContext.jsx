import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cefi_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const login = (email, password) => {
    // Mock or Supabase login
    const newUser = {
      id: 'usr-101',
      email,
      name: email.split('@')[0].toUpperCase(),
      role: 'customer',
      joinedAt: new Date().toLocaleDateString()
    };
    setUser(newUser);
    localStorage.setItem('cefi_user', JSON.stringify(newUser));
    return { success: true, user: newUser };
  };

  const signup = (name, email, password) => {
    const newUser = {
      id: `usr-${Date.now()}`,
      email,
      name,
      role: 'customer',
      joinedAt: new Date().toLocaleDateString()
    };
    setUser(newUser);
    localStorage.setItem('cefi_user', JSON.stringify(newUser));
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('cefi_user');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
