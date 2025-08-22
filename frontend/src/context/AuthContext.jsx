import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          const response = await fetch(`${apiUrl}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            // Ha a token érvénytelen, töröljük
            logout();
          }
        } catch (error) {
          console.error("Hiba a felhasználó adatainak lekérésekor:", error);
          logout();
        }
      }
    };
    fetchUser();
  }, [token, apiUrl]);

  const login = async (userId, pin) => {
    try {
      const response = await fetch(`${apiUrl}/api/login?user_id=${userId}&pin=${pin}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Hibás PIN kód vagy felhasználó.');
      
      const data = await response.json();
      localStorage.setItem('authToken', data.access_token);
      setToken(data.access_token); // Ez újra lefuttatja az useEffect-et, ami betölti a felhasználót
      return true;
    } catch (error) {
      console.error("Bejelentkezési hiba:", error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    setToken(null);
    setUser(null);
  };

  return (
    // Most már a 'user'-t is elérhetővé tesszük
    <AuthContext.Provider value={{ token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};