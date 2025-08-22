import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function ParentRoute() {
  const { user, token } = useAuth();

  if (!user && token) {
    return <div>Betöltés...</div>;
  }

  // Ha a felhasználó nem Szülő vagy Családfő, átirányítjuk a főoldalra
  if (!user || !['Szülő', 'Családfő'].includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <Outlet />;
}

export default ParentRoute;