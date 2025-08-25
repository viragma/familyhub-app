import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('authToken'));
  const [user, setUser] = useState(null);
  
  const apiUrl = `http://${window.location.hostname}:8000`;

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
      // JAVÍTÁS: Az adatokat a kérés törzsébe (body) helyezzük, URLSearchParams formátumban.
      const body = new URLSearchParams();
      body.append('user_id', userId);
      body.append('pin', pin);

      const response = await fetch(`${apiUrl}/api/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body,
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
    <AuthContext.Provider value={{ token, user, login, logout, apiUrl }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};