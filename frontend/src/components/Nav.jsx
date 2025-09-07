import React from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

function Nav({ theme, toggleTheme }) {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="logo">
          <span>🏠</span>
          <span>FamilyHub</span>
        </Link>
        <div className="nav-menu">
          <NavLink to="/" className="nav-item" end>Áttekintés</NavLink>
          {user && ['Szülő', 'Családfő','Gyerek','Tizenéves'].includes(user.role) && (
    <NavLink to="/finances" className="nav-item">Pénzügyek</NavLink>
)}
    <NavLink to="/wishes" className="nav-item">Kívánságok</NavLink>
    <NavLink to="/time-management" className="nav-item">Időkezelés</NavLink>
 
          <NavLink to="/profile" className="nav-item">Profil</NavLink>
          

          {user && <button onClick={logout} className="nav-item" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}>Kijelentkezés</button>}
          
          {/* Téma váltó gomb eltávolítva, csak a profil oldalon lesz! */}
        </div>
      </div>
    </nav>
  );
}

export default Nav;