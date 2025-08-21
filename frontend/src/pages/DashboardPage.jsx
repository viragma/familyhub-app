import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BentoGrid from '../components/BentoGrid';

function DashboardPage() {
  const [dashboardData, setDashboardData] = useState(null);

  // Ez a funkció felel az adatok lekéréséért a backendtől
  const fetchData = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiUrl}/api/dashboard`);
      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      console.error("Hiba a dashboard adatok lekérésekor:", error);
    }
  };

  // Az useEffect hook biztosítja, hogy az adatok betöltődjenek az oldal megjelenésekor
  useEffect(() => {
    fetchData();
  }, []);

  // Amíg az adatok töltődnek, egy üzenetet jelenítünk meg
  if (!dashboardData) {
    return <div style={{ textAlign: 'center', padding: '2rem' }}>Adatok betöltése...</div>;
  }

  return (
    <>
      <Header />
      <BentoGrid dashboardData={dashboardData} />
    </>
  );
}

export default DashboardPage;