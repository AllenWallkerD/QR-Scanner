import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthState } from '../hooks/useAuthState';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthState();

  if (loading) {
    return <div>Загрузка...</div>;
  }
  if (!user) {
    return <Navigate to="/signin" replace />;
  }
  return children;
}

export default ProtectedRoute;
