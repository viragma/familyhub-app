import React, { useState, useMemo } from 'react';
import { Calendar, TrendingUp, User, Users, AlertCircle } from 'lucide-react';

const ForecastView = ({ data }) => {
  if (!data) return (
    <div className="forecast-empty">
      <AlertCircle size={20} className="icon" />
      <span>Nincs elérhető adat</span>
    </div>
  );

  const {
    projected_income: income = 0,
    projected_expenses: expense = 0,
  } = data;
  const balance = income - expense;

  return (
    <>
      <div className="forecast-summary">
        <span className="forecast-label">Várható egyenleg változás</span>
        <span className={`forecast-amount ${balance >= 0 ? 'positive' : 'negative'}`}>
          {balance >= 0 ? '+' : ''}{balance.toLocaleString('hu-HU')} Ft
        </span>
      </div>
      <div className="forecast-details">
        <div className="forecast-item income">
          <div className="forecast-icon">💰</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható bevétel</span>
            <span className="forecast-item-value">+{income.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
        <div className="forecast-item expense">
          <div className="forecast-icon">💸</div>
          <div className="forecast-content">
            <span className="forecast-item-label">Várható kiadás</span>
            <span className="forecast-item-value">-{expense.toLocaleString('hu-HU')} Ft</span>
          </div>
        </div>
      </div>
    </>
  );
};

const ForecastCard = ({ currentMonthData, nextMonthData, viewType }) => {
  const [activePeriod, setActivePeriod] = useState('current');
  const [activeScope, setActiveScope] = useState('personal');

  const isParentView = viewType === 'parent';

  const displayData = useMemo(() => {
    const periodData = activePeriod === 'current' ? currentMonthData : nextMonthData;
    if (!periodData) return null;
    if (!isParentView) return periodData.personal || periodData.family;
    return activeScope === 'personal' ? periodData.personal : periodData.family;
  }, [activePeriod, activeScope, currentMonthData, nextMonthData, isParentView]);

  const cardTitle = isParentView ? `Előrejelzés - ${activeScope === 'personal' ? 'Személyes' : 'Családi'}` : "Előrejelzés";

  return (
    <div className="dashboard-card forecast-card modern">
      <div className="card-header">
        <div className="header-content">
          <h3>{cardTitle}</h3>
        </div>
        <TrendingUp className="header-icon" />
      </div>

      <div className="tab-container">
        <div className="tab-group-wrapper">
          <div className="tab-group period-tabs">
            <button
              className={`tab-btn ${activePeriod === 'current' ? 'active' : ''}`}
              onClick={() => setActivePeriod('current')}
            >
              <Calendar size={14} /> E havi
            </button>
            <button
              className={`tab-btn ${activePeriod === 'next' ? 'active' : ''}`}
              onClick={() => setActivePeriod('next')}
            >
              <Calendar size={14} /> Következő
            </button>
          </div>
          <span
            className="active-tab-indicator"
            style={{ transform: `translateX(${activePeriod === 'current' ? '0%' : '100%'})` }}
          />
        </div>

        {isParentView && (
          <div className="tab-group-wrapper">
            <div className="tab-group scope-tabs">
              <button
                className={`tab-btn ${activeScope === 'personal' ? 'active' : ''}`}
                onClick={() => setActiveScope('personal')}
              >
                <User size={14} /> Személyes
              </button>
              <button
                className={`tab-btn ${activeScope === 'family' ? 'active' : ''}`}
                onClick={() => setActiveScope('family')}
              >
                <Users size={14} /> Családi
              </button>
            </div>
            <span
              className="active-tab-indicator"
              style={{ transform: `translateX(${activeScope === 'personal' ? '0%' : '100%'})` }}
            />
          </div>
        )}
      </div>

      <div className="forecast-content-wrapper">
        <ForecastView data={displayData} />
      </div>
    </div>
  );
};

export default ForecastCard;