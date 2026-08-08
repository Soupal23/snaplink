import React, { createContext, useState, useEffect, useCallback } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const storedUser = localStorage.getItem('user');
    return storedUser ? JSON.parse(storedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('token') || '');
  const [loading, setLoading] = useState(true);

  // Centralized logout function
  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken('');
    setUser(null);
  }, []);

  // Save auth credentials to local storage and state
  const saveAuthData = (data) => {
    if (data.token && data.user) {
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    }
  };

  // Synchronize authentication changes across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'token') {
        if (!e.newValue) {
          logout();
        } else {
          setToken(e.newValue);
        }
      }
      if (e.key === 'user') {
        setUser(e.newValue ? JSON.parse(e.newValue) : null);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [logout]);

  // Validate token validity with the backend on initial mount
  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');
      if (!storedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('http://localhost:5000/api/auth/me', {
          headers: {
            Authorization: `Bearer ${storedToken}`,
          },
        });

        if (res.ok) {
          const userData = await res.json();
          setUser(userData);
          localStorage.setItem('user', JSON.stringify(userData));
        } else if (res.status === 401 || res.status === 403) {
          // ONLY logout if token is explicitly invalid or expired
          logout();
        }
        // If status is 404 or 500, we retain localStorage state to prevent accidental logout
      } catch (error) {
        console.error('Token verification network error:', error);
        // On network error (e.g. backend down), keep user logged in offline
      } finally {
        setLoading(false);
      }
    };

    verifyToken();
  }, [logout]);

  const login = async (email, password) => {
    const res = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Login failed');
    saveAuthData(data);
    return data;
  };

  const register = async (username, email, password) => {
    const res = await fetch('http://localhost:5000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Registration failed');
    saveAuthData(data);
    return data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        register,
        logout,
        isAuthenticated: !!token,
      }}
    >
      {loading ? (
        <div style={styles.loadingContainer}>Loading session...</div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};

const styles = {
  loadingContainer: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '18px',
    fontWeight: '600',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
};