import React from 'react';

function Header() {
  // JavaScript logika a dátum formázásához
  const formatDate = () => {
    const options = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    const today = new Date().toLocaleDateString('hu-HU', options);
    // A magyar nyelvtan miatt a nap nevét nagybetűssé tesszük
    return today.charAt(0).toUpperCase() + today.slice(1);
  };

  return (
    <div className="header">
      <h1 className="greeting">Üdv újra, András! 👋</h1>
      <p className="date">{formatDate()}</p>
    </div>
  );
}

export default Header;