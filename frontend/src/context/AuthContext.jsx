import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  
  // === ÚJ DINAMIKUS LOGIKA ===
  // A böngésző címsorából vesszük az IP címet, a port pedig fixen 8000.
  const apiUrl = `http://${window.location.hostname}:8000`;

  useEffect(() => {
    const fetchUser = async () => {
      if (token) {
        try {
          // Itt már az új, dinamikus apiUrl-t használjuk
          const response = await fetch(`${apiUrl}/api/users/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const userData = await response.json();
            setUser(userData);
          } else {
            logout();
          }
        } catch (error) {
          console.error("Hiba a felhasználó adatainak lekérésekor:", error);
          logout();
        }
      }
    };
    fetchUser();
  }, [token, apiUrl]); // Az apiUrl-t is felvesszük a függőségek közé

  const login = async (userId, pin) => {
    try {
      // Itt is az új, dinamikus apiUrl-t használjuk
      const response = await fetch(`${apiUrl}/api/login?user_id=${userId}&pin=${pin}`, {
        method: 'POST',
      });
      if (!response.ok) throw new Error('Hibás PIN kód vagy felhasználó.');
      
      const data = await response.json();
      localStorage.setItem('authToken', data.access_token);
      setToken(data.access_token);
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
    // Most már az 'apiUrl'-t is elérhetővé tesszük az egész alkalmazás számára
    <AuthContext.Provider value={{ token, user, login, logout, apiUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};