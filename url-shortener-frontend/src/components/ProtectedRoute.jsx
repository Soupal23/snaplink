import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  const location = useLocation();

  // 1. Wait for AuthContext to resolve localStorage on app start
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <p>Loading...</p>
      </div>
    );
  }

  // 2. Redirect only if there is no authentication token
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

const styles = {
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#38bdf8',
    fontSize: '18px',
    fontWeight: '600',
  },
};