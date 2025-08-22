import React from 'react';

function AuthLayout({ children }) {
  return (
    <div className="auth-container">
      <div className="auth-logo">
        <span>🏠</span>
        <span>FamilyHub</span>
      </div>
      <div className="auth-card">
        {children}
      </div>
    </div>
  );
}

export default AuthLayout;