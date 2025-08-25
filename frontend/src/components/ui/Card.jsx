import React from 'react';

export const Card = ({ children, className = "", onClick }) => (
  <div 
    className={`bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200 ${className}`}
    onClick={onClick}
    style={{ cursor: onClick ? 'pointer' : 'default' }}
  >
    {children}
  </div>
);