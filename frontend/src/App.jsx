import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // Új import!
import './index.css';
import Nav from './components/Nav';
import MobileNav from './components/MobileNav';
import { useTheme } from './context/ThemeContext';

// A Header, BentoGrid, FAB, TaskModal már nem kellenek ide közvetlenül

function App() {
  const { darkMode, toggleDarkMode } = useTheme();
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    localStorage.setItem('theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  return (
    <div>
      <Nav />
      <div className="container">
        <Outlet />
      </div>
      <MobileNav />
    </div>
  );
}

export default App;