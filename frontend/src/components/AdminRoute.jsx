import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function AdminRoute() {
  const { user, token } = useAuth();

  // Amíg a felhasználói adatok töltődnek, egy üres oldalt mutatunk, hogy ne villogjon a felület
  if (!user && token) {
    return <div>Betöltés...</div>;
  }

  // Ha nincs bejelentkezve, vagy be van jelentkezve, de NEM Családfő,
  // akkor átirányítjuk a főoldalra.
  if (!user || user.role !== 'Családfő') {
    return <Navigate to="/" />;
  }

  // Ha minden rendben (be van jelentkezve ÉS Családfő), akkor megjeleníti a védett oldalt.
  return <Outlet />;
}

export default AdminRoute;