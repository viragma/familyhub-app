import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { token } = useAuth();

  if (!token) {
    // Ha nincs token (nincs bejelentkezve), irányítsa át a felhasználót a login oldalra
    return <Navigate to="/login" />;
  }

  // Ha van token, jelenítse meg a kért oldalt
  return <Outlet />;
}

export default ProtectedRoute;