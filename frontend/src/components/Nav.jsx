import React from 'react';

// A komponens most már megkapja a "props"-ként átadott theme és toggleTheme értékeket
function Nav({ theme, toggleTheme }) {
  return (
    <nav className="nav">
      <div className="nav-container">
        <div className="logo">
          <span>🏠</span>
          <span>FamilyHub</span>
        </div>
        <div className="nav-menu">
          <a href="#" className="nav-item">Áttekintés</a>
          <a href="#" className="nav-item">Pénzügyek</a>
          <a href="#" className="nav-item">Feladatok</a>
          <a href="#" className="nav-item">Bevásárlás</a>
          <a href="#" className="nav-item">Célok</a>
          {/* A gombra kattintva meghívjuk a "toggleTheme" funkciót */}
          <button className="theme-toggle" onClick={toggleTheme}>
            {/* Az ikon attól függ, hogy mi az aktuális téma */}
            <span id="theme-icon">{theme === 'light' ? '🌙' : '☀️'}</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;