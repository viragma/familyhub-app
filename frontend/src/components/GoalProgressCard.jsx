import React from 'react';

function GoalProgressCard({ goal }) {
  const progress = goal.goal_amount > 0 ? (parseFloat(goal.balance) / parseFloat(goal.goal_amount)) * 100 : 0;

  return (
    <div className="bento-card">
      <div className="card-header">
        <h2 className="card-title">{goal.name}</h2>
        <div className="card-icon">🎯</div>
      </div>
      <div className="progress-container">
        <div className="progress-header">
          <span>{parseFloat(goal.balance).toLocaleString('hu-HU')} Ft / {parseFloat(goal.goal_amount).toLocaleString('hu-HU')} Ft</span>
          <span style={{ color: 'var(--accent-primary)' }}>{progress.toFixed(0)}%</span>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
        </div>
      </div>
    </div>
  );
}

export default GoalProgressCard;