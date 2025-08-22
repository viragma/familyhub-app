import React from 'react';
import BentoCard from './BentoCard';

function BentoGrid({ dashboardData }) {
  // Ez a sor megvéd az összeomlástól, amíg az adatok töltődnek
  if (!dashboardData || !dashboardData.financial_summary) {
    return <div>Irányítópult adatok betöltése...</div>;
  }

  // Kinyerjük a releváns adatokat az új, helyes struktúrából
  const { financial_summary } = dashboardData;
  const goal = dashboardData.goal || { name: "Célkassza", current: 0, target: 0 };
  const goalPercentage = (goal.target > 0) ? (goal.current / goal.target) * 100 : 0;

  return (
    <div className="bento-grid">
      <BentoCard title={financial_summary.balance_title || "Egyenleg"} icon="💰" className="card-wide">
        <div>
          {/* JAVÍTÁS: financial_summary.total_balance-t használunk */}
          <div className="balance-amount">{parseFloat(financial_summary.total_balance).toLocaleString('hu-HU')} Ft</div>
          
          {financial_summary.view_type === 'parent' && financial_summary.other_accounts.length > 0 && (
            <div className="balance-sub-list">
              {financial_summary.other_accounts.map(acc => (
                <div className="sub-list-item" key={acc.name}>
                  <span>{acc.name}</span>
                  <span>{parseFloat(acc.balance).toLocaleString('hu-HU')} Ft</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </BentoCard>

      <BentoCard title="Havi Statisztika" icon="📈">
        <div className="stats-grid">
            <div className="stat-item">
                <div className="stat-label">Bevétel</div>
                {/* JAVÍTÁS: A financial_summary objektumból vesszük az adatokat */}
                <div className="stat-value" style={{ color: 'var(--success)' }}>+{parseFloat(financial_summary.monthly_income).toLocaleString('hu-HU')} Ft</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Kiadás</div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>-{parseFloat(financial_summary.monthly_expense).toLocaleString('hu-HU')} Ft</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Megtakarítás</div>
                <div className="stat-value">{parseFloat(financial_summary.monthly_savings).toLocaleString('hu-HU')} Ft</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Célok</div>
                <div className="stat-value">{goalPercentage.toFixed(0)}%</div>
            </div>
        </div>
      </BentoCard>

      <BentoCard title={goal.name} icon="🏖️">
         <div>
          <div className="progress-container">
            <div className="progress-header">
              <span>{goal.current.toLocaleString('hu-HU')} Ft / {goal.target.toLocaleString('hu-HU')} Ft</span>
              <span style={{ color: 'var(--accent-primary)' }}>{goalPercentage.toFixed(0)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${goalPercentage}%` }}></div>
            </div>
          </div>
        </div>
      </BentoCard>

      {/* A többi kártya egyelőre statikus maradhat */}
      <BentoCard title="Mai Feladatok" icon="✅" className="card-tall">
        <p>A feladatok összegzése itt fog megjelenni.</p>
      </BentoCard>
      <BentoCard title="Család" icon="👨‍👩‍👧‍👦">
        <p>A családtagok állapota itt fog megjelenni.</p>
      </BentoCard>
      <BentoCard title="Bevásárlólista" icon="🛒">
        <p>A bevásárlólista állapota itt fog megjelenni.</p>
      </BentoCard>
    </div>
  );
}

export default BentoGrid;