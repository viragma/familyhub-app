import React, { useState } from 'react';

function QuickActionsPanel({ onNewAccount, onQuickTransaction, accounts, user }) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get the user's personal accounts for quick actions
  const personalAccounts = accounts.filter(acc => 
    acc.owner_user_id === user?.id && acc.type === 'személyes'
  );

  const quickActions = [
    {
      id: 'new-account',
      title: 'Új Kassza',
      description: 'Cél- vagy vészkassza létrehozása',
      icon: '💼',
      color: 'primary',
      onClick: onNewAccount,
      show: true
    },
    {
      id: 'quick-income',
      title: 'Gyors Bevétel',
      description: 'Bevétel rögzítése személyes kasszába',
      icon: '💰',
      color: 'success',
      onClick: () => {
        if (personalAccounts.length > 0) {
          const account = personalAccounts[0];
          onQuickTransaction('bevétel', account.id, account.name);
        }
      },
      show: personalAccounts.length > 0
    },
    {
      id: 'quick-expense',
      title: 'Gyors Kiadás',
      description: 'Kiadás rögzítése személyes kasszából',
      icon: '💸',
      color: 'warning',
      onClick: () => {
        if (personalAccounts.length > 0) {
          const account = personalAccounts[0];
          onQuickTransaction('kiadás', account.id, account.name);
        }
      },
      show: personalAccounts.length > 0
    }
  ];

  const visibleActions = quickActions.filter(action => action.show);

  if (visibleActions.length === 0) return null;

  return (
    <div className={`quick-actions-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="quick-actions-header">
        <div className="header-content">
          <h3 className="panel-title">
            <span className="title-icon">⚡</span>
            Gyors Műveletek
          </h3>
        </div>
        <button 
          className="expand-btn"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span className={`expand-icon ${isExpanded ? 'rotated' : ''}`}>
            ▼
          </span>
        </button>
      </div>

      <div className="quick-actions-content">
        <div className="quick-actions-grid">
          {visibleActions.map(action => (
            <button
              key={action.id}
              className={`quick-action-card ${action.color}`}
              onClick={action.onClick}
            >
              <div className="action-icon-container">
                <span className="action-icon-large">{action.icon}</span>
              </div>
              <div className="action-content">
                <h4 className="action-title">{action.title}</h4>
                <p className="action-description">{action.description}</p>
              </div>
              <div className="action-arrow">→</div>
            </button>
          ))}
        </div>

        {personalAccounts.length > 0 && (
          <div className="quick-account-info">
            <div className="account-info-header">
              <span className="info-icon">ℹ️</span>
              <span className="info-text">
                Gyors műveletek az alábbi kasszával: <strong>{personalAccounts[0].name}</strong>
              </span>
            </div>
            <div className="account-balance-info">
              Aktuális egyenleg: <span className="balance-amount">
                {parseFloat(personalAccounts[0].balance).toLocaleString('hu-HU')} Ft
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default QuickActionsPanel;