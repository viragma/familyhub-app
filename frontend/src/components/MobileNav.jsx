import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MobileNav() {
  // Lekérjük a bejelentkezett felhasználó adatait és a kijelentkezés funkciót
  const { user, logout } = useAuth();

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        {/* A sima <a> tageket lecseréljük NavLink-re a helyes útvonalakkal */}
        <NavLink to="/" className="mobile-nav-item" end>
          <span className="mobile-nav-icon">🏠</span>
          <span className="mobile-nav-label">Főoldal</span>
        </NavLink>
        {user && ['Szülő', 'Családfő','Gyerek','Tizenéves'].includes(user.role) && (
     <NavLink to="/finances" className="mobile-nav-item">
          <span className="mobile-nav-icon">💰</span>
          <span className="mobile-nav-label">Pénzügy</span>
        </NavLink>
)}
       
        <NavLink to="/tasks" className="mobile-nav-item">
          <span className="mobile-nav-icon">✅</span>
          <span className="mobile-nav-label">Feladatok</span>
        </NavLink>
        
        {/* A "Család Kezelése" menüpont csak akkor jelenik meg, ha a user létezik ÉS a szerepköre 'Családfő' */}
        {user && user.role === 'Családfő' && (
          <NavLink to="/manage-family" className="mobile-nav-item">
            <span className="mobile-nav-icon">⚙️</span>
            <span className="mobile-nav-label">Kezelés</span>
          </NavLink>
        )}

        {/* A Profil gomb most már kijelentkeztet */}
        <div className="mobile-nav-item" onClick={logout} style={{ cursor: 'pointer' }}>
          <span className="mobile-nav-icon">👤</span>
          <span className="mobile-nav-label">Profil</span>
        </div>
      </div>
    </nav>
  );
}

export default MobileNav;