import React from 'react';
import { Telescope, TrendingUp, TrendingDown, PiggyBank, User, Users } from 'lucide-react';


// Segédfüggvény a számok formázásához és színezéséhez
const StatItem = ({ label, value, currency = 'Ft', colorClass = '' }) => (
  <div className="forecast-stat">
    <span className="stat-label">{label}</span>
    <span className={`stat-value ${colorClass}`}>
      {value?.toLocaleString('hu-HU') || '0'} {currency}
    </span>
  </div>
);

function ForecastCard({ forecastData, title }) {
  if (!forecastData || (forecastData.projected_income === 0 && forecastData.projected_expenses === 0)) {
    // Ne jelenítsük meg a kártyát, ha nincs benne adat
    return null;
  }
  
  const { 
    projected_income, 
    projected_expenses, 
    projected_savings, 
  } = forecastData;

const savingsClass = projected_savings >= 0 ? 'income' : 'expense';
  const savingsIcon = projected_savings >= 0 
    ? <PiggyBank size={32} className="income"/> 
    : <TrendingDown size={32} className="expense"/>;
  
  // Ikon a cím alapján
  const titleIcon = title === 'Személyes Előrejelzés' 
    ? <User className="dashboard-card-icon" /> 
    : <Users className="dashboard-card-icon" />;

  return (
     <div className="dashboard-card forecast-card">
      <div className="dashboard-card-header">
        <h3 className="dashboard-card-title">{title}</h3>
        {titleIcon}
      </div>
      <div className="forecast-stats-container">
        <StatItem label="Várható bevételek" value={projected_income} colorClass="income" />
        <StatItem label="Tervezett kiadások" value={projected_expenses} colorClass="expense" />
      </div>

      <div className="forecast-summary">
        {savingsIcon}
        <div className="summary-text">
          <span className="stat-label">Várható megtakarítás</span>
          <span className={`stat-value ${savingsClass}`}>
            {projected_savings?.toLocaleString('hu-HU') || '0'} Ft
          </span>
        </div>
      </div>
    </div>
  );
}

export default ForecastCard;