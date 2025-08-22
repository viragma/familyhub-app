import React from 'react';
import { useAuth } from '../context/AuthContext'; // 1. Importáljuk a useAuth hook-ot

function Header() {
  const { user } = useAuth(); // 2. Lekérjük a bejelentkezett felhasználó adatait

  // JavaScript logika a dátum formázásához
  const formatDate = () => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    const today = new Date().toLocaleDateString('hu-HU', options);
    return today.charAt(0).toUpperCase() + today.slice(1);
  };

  return (
    <div className="header">
      {/* 3. A köszöntés most már dinamikus */}
      {/* Ha a 'user' objektum létezik, a nevét írjuk ki, egyébként egy alapértelmezett üzenetet */}
      <h1 className="greeting">Üdv újra, {user ? user.display_name : 'Felhasználó'}! 👋</h1>
      <p className="date">{formatDate()}</p>
    </div>
  );
}

export default Header;