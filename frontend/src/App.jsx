import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom'; // Új import!
import './index.css';
import Nav from './components/Nav';
import MobileNav from './components/MobileNav';
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
        {/* Az Outlet komponens helyére tölti be a router az aktuális oldalt
            (pl. a DashboardPage-t vagy a TasksPage-t) */}
        <Outlet /> 
      </div>
      <MobileNav />
    </div>
  );
}

export default App;