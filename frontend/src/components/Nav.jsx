import React from 'react';

function Nav() {
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
          <button className="theme-toggle">
            <span id="theme-icon">🌙</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default Nav;