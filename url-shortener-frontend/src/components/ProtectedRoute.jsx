import React, { useContext } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { token, loading } = useContext(AuthContext);
  const location = useLocation();

  // 1. Show loading state while AuthContext initializes
  if (loading) {
    return (
      <div style={{ textAlign: 'center', marginTop: '50px', color: '#fff' }}>
        <p>Loading...</p>
      </div>
    );
  }

  // 2. If not authenticated, redirect to login and save requested location
  if (!token) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  return children;
}