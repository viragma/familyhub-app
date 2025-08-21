import React from 'react';
import BentoCard from './BentoCard';

// A komponens most már csak egy "buta" megjelenítő, ami a props-ból dolgozik
function BentoGrid({ dashboardData }) {
  
  const goalPercentage = (dashboardData.goal.current / dashboardData.goal.target) * 100;

  return (
    <div className="bento-grid">
      {/* Családi Egyenleg kártya */}
      <BentoCard title="Családi Egyenleg" icon="💰" className="card-wide">
        <div>
          <div className="balance-amount">{dashboardData.balance.amount.toLocaleString()} Ft</div>
          <span className="balance-change">↑ +{dashboardData.balance.change_percent}% a múlt hónaphoz képest</span>
        </div>
      </BentoCard>

      {/* Havi Statisztika kártya */}
      <BentoCard title="Havi Statisztika" icon="📈">
        <div className="stats-grid">
            <div className="stat-item">
                <div className="stat-label">Bevétel</div>
                <div className="stat-value" style={{ color: 'var(--success)' }}>+{dashboardData.stats.income.toLocaleString()}</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Kiadás</div>
                <div className="stat-value" style={{ color: 'var(--danger)' }}>-{dashboardData.stats.expense.toLocaleString()}</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Megtakarítás</div>
                <div className="stat-value">{dashboardData.stats.savings.toLocaleString()}</div>
            </div>
            <div className="stat-item">
                <div className="stat-label">Célok</div>
                <div className="stat-value">{dashboardData.stats.goals_progress}%</div>
            </div>
        </div>
      </BentoCard>

      {/* Nyaralás Alap kártya */}
      <BentoCard title={dashboardData.goal.name} icon="🏖️">
         <div>
          <div className="progress-container">
            <div className="progress-header">
              <span>{dashboardData.goal.current.toLocaleString()} Ft / {dashboardData.goal.target.toLocaleString()} Ft</span>
              <span style={{ color: 'var(--accent-primary)' }}>{goalPercentage.toFixed(0)}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${goalPercentage}%` }}></div>
            </div>
          </div>
        </div>
      </BentoCard>


      {/* Mai Feladatok kártya (csak megjelenítés, nincs interakció) */}
      <BentoCard title="Mai Feladatok" icon="✅" className="card-tall">
        <div className="task-list">
          {dashboardData.tasks.map((task) => (
            <div className="task-item" key={task.id}>
              <div className="task-info">
                <div className={`task-checkbox ${task.done ? 'checked' : ''}`}></div>
                <div>
                  <div style={{ fontWeight: 500 }}>{task.title}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {task.owner}
                  </div>
                </div>
              </div>
              <div className="task-reward">{task.reward}</div>
            </div>
          ))}
        </div>
      </BentoCard>


       <BentoCard title="Család" icon="👨‍👩‍👧‍👦">
        <div className="members-grid">
          {dashboardData.family.map((member) => (
            <div className="member-card" key={member.name}>
              <div className="member-avatar" style={{ background: member.color }}>
                {member.initial}
                {/* Feltételes renderelés: a státusz pötty csak akkor jelenik meg,
                    ha a "member.online" értéke igaz. */}
                {member.online && <div className="member-status"></div>}
              </div>
              <div className="member-name">{member.name}</div>
            </div>
          ))}
        </div>
      </BentoCard>

      <BentoCard title="Bevásárlólista" icon="🛒">
        <div style={{ marginTop: '1rem' }}>
          {dashboardData.shopping_list.items.map((item, index) => (
            <div className="shopping-item" key={index}>
              <div className="shopping-checkbox"></div>
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
          Becsült költség: ~8,500 Ft
        </p>
      </BentoCard>
    </div>
    
  );
}

export default BentoGrid;