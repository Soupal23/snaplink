import React, { useState, useEffect } from 'react';
import { AuthContext } from './AuthContext';
import { jwtDecode } from 'jwt-decode';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

const isTokenValid = (token) => {
  if (!token) return false;
  try {
    const { exp } = jwtDecode(token);
    // Check against current time with a 30-second buffer
    return Date.now() < (exp * 1000) - 30_000;
  } catch {
    return false; // malformed token
  }
};

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => {
    const stored = localStorage.getItem('token') || '';
    // Evict expired token on load — don't even store it in state
    if (!isTokenValid(stored)) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return '';
    }
    return stored;
  });
  const [user, setUser] = useState(() => {
    const storedToken = localStorage.getItem('token');
    if (!isTokenValid(storedToken)) return null; // Consistent with token state
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to sign in');
    }

    // Extract user object from API response or construct fallback
    const userData = data.user || { username: data.username || email.split('@')[0], email };
    const userToken = data.token;

    // Save to state and localStorage
    setUser(userData);
    setToken(userToken);
    localStorage.setItem('token', userToken);
    localStorage.setItem('user', JSON.stringify(userData));

    return data;
  };

  // --- ADDED: REGISTER FUNCTION ---
  const register = async (username, email, password) => {
    const res = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.message || 'Failed to create account');
    }

    const userData = data.user || { username: data.username || username, email };
    const userToken = data.token;

    // Automatically log in user on successful registration if token returned
    if (userToken) {
      setUser(userData);
      setToken(userToken);
      localStorage.setItem('token', userToken);
      localStorage.setItem('user', JSON.stringify(userData));
    }

    return data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  };

  return (
    // FIXED: Added 'register' to the value prop below
    <AuthContext.Provider value={{ user, token, login, register, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};