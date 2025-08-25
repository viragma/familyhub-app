import React from 'react';
import BentoCard from './BentoCard';
import GoalProgressCard from './GoalProgressCard';

function BentoGrid({ dashboardData }) {
  // Ez a sor megvéd az összeomlástól, amíg az adatok töltődnek
  if (!dashboardData || !dashboardData.financial_summary) {
    return <div>Irányítópult adatok betöltése...</div>;
  }

  // Kinyerjük a releváns adatokat az új, helyes struktúrából
  const { financial_summary, tasks, goals } = dashboardData;
  const goal = dashboardData.goal || { name: "Célkassza", current: 0, target: 0 };
  const goalPercentage = (goal.target > 0) ? (goal.current / goal.target) * 100 : 0;
 
  return (
    <div className="bento-grid">
        <BentoCard title={financial_summary.balance_title || "Egyenleg"} icon="💰" className="card-wide">
          <div>
            {/* A kártya leegyszerűsítve, ahogy kérted */}
            <div className="balance-amount">{parseFloat(financial_summary.total_balance).toLocaleString('hu-HU')} Ft</div>
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

   {/* === ÚJ, DINAMIKUS CÉLOK SZEKCIÓ === */}
      {goals && goals.family_goals.length > 0 && (
        <>
            <h2 className="account-group-header">Családi Célok</h2>
            <div className="bento-grid">
                {goals.family_goals.map(goal => <GoalProgressCard key={goal.id} goal={goal} />)}
            </div>
        </>
      )}

      {goals && goals.personal_goals.length > 0 && (
        <>
            <h2 className="account-group-header">Személyes Céljaim</h2>
            <div className="bento-grid">
                {goals.personal_goals.map(goal => <GoalProgressCard key={goal.id} goal={goal} />)}
            </div>
        </>
      )}

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