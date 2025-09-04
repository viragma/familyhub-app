import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // Új import!
import './index.css';
import Nav from './components/Nav';
import MobileNav from './components/MobileNav';
import ProfilePage from './pages/ProfilePage';
// A Header, BentoGrid, FAB, TaskModal már nem kellenek ide közvetlenül

function App() {
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);
  
  const toggleTheme = () => {
    setTheme(prevTheme => prevTheme === 'light' ? 'dark' : 'light');
  };

  return (
    <div>
      <Nav theme={theme} toggleTheme={toggleTheme} />
      <div className="container">
        <Outlet /> 
      </div>
      {/* JAVÍTÁS: Átadjuk a 'theme' és 'toggleTheme' prop-okat */}
      <MobileNav theme={theme} toggleTheme={toggleTheme} />
    </div>
  );
}

export default App;