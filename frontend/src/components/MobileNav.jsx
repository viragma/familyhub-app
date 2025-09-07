import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function MobileNav({ theme, toggleTheme }) { // Itt fogadjuk a prop-okat
  const { user, logout } = useAuth();

  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        <NavLink to="/" className="mobile-nav-item" end>
          <span className="mobile-nav-icon">🏠</span>
          <span className="mobile-nav-label">Főoldal</span>
        </NavLink>

        {user && ['Szülő', 'Családfő', 'Gyerek'].includes(user.role) && (
            <NavLink to="/finances" className="mobile-nav-item">
                <span className="mobile-nav-icon">💰</span>
                <span className="mobile-nav-label">Pénzügy</span>
            </NavLink>
        )}
        <NavLink to="/wishes" className="mobile-nav-item"> {/* <--- ÚJ MENÜPONT */}
          <span className="mobile-nav-icon">🎁</span>
          <span className="mobile-nav-label">Kívánságok</span>
        </NavLink>
        
        <NavLink to="/time-management" className="mobile-nav-item"> {/* <--- ÚJ IDŐKEZELÉSI MENÜPONT */}
          <span className="mobile-nav-icon">🕒</span>
          <span className="mobile-nav-label">Időkezelés</span>
        </NavLink>
      

        <NavLink to="/profile" className="mobile-nav-item">
          <span className="mobile-nav-icon">👤</span>
          <span className="mobile-nav-label">Profil</span>
        </NavLink>

  {/* Téma váltó gomb eltávolítva, csak a profil oldalon lesz! */}
      </div>
    </nav>
  );
}

export default MobileNav;