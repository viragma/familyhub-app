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
  {user && user.role === 'Családfő' && (
            <>
              <NavLink to="/manage-family" className="nav-item">Család Kezelése</NavLink>
            </>
          )}
         
          

          {user && <button onClick={logout} className="nav-item" style={{background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)'}}>Kijelentkezés</button>}
          
          <button className="theme-toggle" onClick={toggleTheme}>
            <span id="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;