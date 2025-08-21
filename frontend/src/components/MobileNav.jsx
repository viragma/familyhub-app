import React from 'react';

function MobileNav() {
  return (
    <nav className="mobile-nav">
      <div className="mobile-nav-items">
        <a href="#" className="mobile-nav-item active">
          <span className="mobile-nav-icon">🏠</span>
          <span className="mobile-nav-label">Főoldal</span>
        </a>
        <a href="#" className="mobile-nav-item">
          <span className="mobile-nav-icon">💰</span>
          <span className="mobile-nav-label">Pénzügy</span>
        </a>
        <a href="#" className="mobile-nav-item">
          <span className="mobile-nav-icon">✅</span>
          <span className="mobile-nav-label">Feladatok</span>
        </a>
        <a href="#" className="mobile-nav-item">
          <span className="mobile-nav-icon">🛒</span>
          <span className="mobile-nav-label">Bevásárlás</span>
        </a>
        <a href="#" className="mobile-nav-item">
          <span className="mobile-nav-icon">👤</span>
          <span className="mobile-nav-label">Profil</span>
        </a>
      </div>
    </nav>
  );
}

export default MobileNav;