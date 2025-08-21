import React, { useState, useEffect } from 'react'; // useState és useEffect importálása
import './index.css';
import Nav from './components/Nav';
import Header from './components/Header';
import BentoGrid from './components/BentoGrid';
import MobileNav from './components/MobileNav';

function App() {
  // 1. ÁLLAPOT LÉTREHOZÁSA
  // A useState hook létrehoz egy 'theme' nevű állapotváltozót és egy 'setTheme'
  // funkciót a módosítására. Kezdőértéket a localStorage-ből olvasunk,
  // ha nincs, akkor 'light' lesz az alapértelmezett.
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');

  // A funkció, ami vált a témák között
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  // 2. MELLÉKHATÁS KEZELÉSE
  // Az useEffect hook lefut minden alkalommal, amikor a 'theme' változó
  // értéke megváltozik.
  useEffect(() => {
    // Elmentjük az új témát a böngésző tárolójába
    localStorage.setItem('theme', theme);
    // Beállítjuk a data-theme attribútumot a <html> elemen
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]); // A [theme] miatt csak akkor fut le, ha a téma változik
return (
    <div>
      <Nav theme={theme} toggleTheme={toggleTheme} />
      <div className="container">
        <Header />
        <BentoGrid />
      </div>
      <MobileNav /> {/* 2. Hozzáadás a lap aljához */}
    </div>
  );
}

export default App;