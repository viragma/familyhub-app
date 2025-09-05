import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    // localStorage-ból visszatöltjük a mentett témát
    const saved = localStorage.getItem('familyhub-theme');
    return saved ? JSON.parse(saved) : false;
  });
  
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Mentjük a témát localStorage-ba amikor változik
  useEffect(() => {
    localStorage.setItem('familyhub-theme', JSON.stringify(darkMode));
  }, [darkMode]);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
