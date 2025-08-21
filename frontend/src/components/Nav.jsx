import React from 'react';
import { Link } from 'react-router-dom'; // Importáljuk a Link-et

function Nav({ theme, toggleTheme }) {
  return (
    <nav className="nav">
      <div className="nav-container">
        <Link to="/" className="logo"> {/* Link a főoldalra */}
          <span>🏠</span>
          <span>FamilyHub</span>
        </Link>
        <div className="nav-menu">
          {/* A href="#" helyett a to="/" és to="/tasks" attribútumokat használjuk */}
          <Link to="/" className="nav-item">Áttekintés</Link>
          <Link to="#" className="nav-item">Pénzügyek</Link>
          <Link to="/tasks" className="nav-item">Feladatok</Link>
          <Link to="#" className="nav-item">Bevásárlás</Link>
          <Link to="#" className="nav-item">Célok</Link>
          <button className="theme-toggle" onClick={toggleTheme}>
            <span id="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;