import React from 'react';
import { Calendar, TrendingUp, AlertCircle } from 'lucide-react';

const SimpleForecastCard = ({ forecastData, title }) => {
  if (!forecastData) return null;

  const {
    projected_income: expectedIncome = 0,
    projected_expenses: expectedExpense = 0,
  } = forecastData;

  const expectedBalance = expectedIncome - expectedExpense;

  return (
    <div className="dashboard-card forecast-card">
      <div className="card-header">
        <div className="header-content">
          <h3>{title}</h3>
          <div className="period-badge">
            <Calendar size={14} />
            Következő hónap
          </div>
        </div>
        <TrendingUp className="header-icon" />
      </div>

      <div className="forecast-summary">
        <span className="forecast-label">Várható egyenleg változás</span>
        <span className={`forecast-amount ${expectedBalance >= 0 ? 'positive' : 'negative'}`}>
          {expectedBalance >= 0 ? '+' : ''}{expectedBalance.toLocaleString('hu-HU')} Ft
        </span>
      </div>

      <div className="forecast-details">
        <div className="forecast-item income">
          <div className="forecast-icon">💰</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható bevétel</span>
            <span className="forecast-item-value">+{expectedIncome.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>

        <div className="forecast-item expense">
          <div className="forecast-icon">💸</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható kiadás</span>
            <span className="forecast-item-value">-{expectedExpense.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
      </div>

      {forecastData.note && (
        <div className="forecast-note">
          <AlertCircle size={14} />
          {forecastData.note}
        </div>
      )}
    </div>
  );
};

export default SimpleForecastCard;