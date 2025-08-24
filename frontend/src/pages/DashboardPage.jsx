import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BentoGrid from '../components/BentoGrid';
import { useAuth } from '../context/AuthContext'; // Fontos import

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);
  const { token, user, apiUrl } = useAuth(); // A tokent a contextből vesszük

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return; // Ne fusson le, amíg nincs token
      try {
        // JAVÍTÁS: Hozzáadjuk a hiányzó 'headers' részt
        const response = await fetch(
          `${apiUrl}/api/dashboard`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          }
        );
        if (!response.ok) {
            throw new Error('A dashboard adatok lekérése sikertelen.');
        }
        const data = await response.json();
        setDashboardData(data);
      } catch (error) {
        console.error("Hiba a dashboard adatok lekérésekor:", error);
      }
    };
    fetchData();
  }, [token]); // A useEffect fusson le, ha a token megváltozik

  return (
    <>
      <Header />
      <BentoGrid dashboardData={dashboardData} />
    </>
  );
}

export default DashboardPage;