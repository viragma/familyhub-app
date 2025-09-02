import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import SimplifiedFinancesOverview from '../components/finance_tabs/SimplifiedFinancesOverview'; // ÚJ IMPORT
import RecurringRulesManager from '../components/finance_tabs/RecurringRulesManager';
import CategoryManager from '../components/finance_tabs/CategoryManager';
import ExpectedExpensesManager from '../components/finance_tabs/ExpectedExpensesManager';
import FinancialSummaryCard from '../components/finance_tabs/FinancialSummaryCard';

function FinancesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  return (
    <div className="finances-page">
      {/* Modern Tab Navigation */}
      <div className="finances-tabs-container">
        <div className="finances-tabs">
          <button 
            className={`finances-tab ${activeTab === 'overview' ? 'active' : ''}`} 
            onClick={() => setActiveTab('overview')}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-label">Áttekintés</span>
          </button>
          <button 
            className={`finances-tab ${activeTab === 'expected' ? 'active' : ''}`} 
            onClick={() => setActiveTab('expected')}
          >
            <span className="tab-icon">📅</span>
            <span className="tab-label">Tervezett</span>
          </button>
          <button 
            className={`finances-tab ${activeTab === 'recurring' ? 'active' : ''}`} 
            onClick={() => setActiveTab('recurring')}
          >
            <span className="tab-icon">🔄</span>
            <span className="tab-label">Rendszeres</span>
          </button>
          {user && ['Szülő', 'Családfő'].includes(user.role) && (
            <button 
              className={`finances-tab ${activeTab === 'categories' ? 'active' : ''}`} 
              onClick={() => setActiveTab('categories')}
            >
              <span className="tab-icon">🏷️</span>
              <span className="tab-label">Kategóriák</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="finances-content">
        <div className={`finances-tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
          {/* LECSERÉLT KOMPONENS: ModernAccountsOverview -> SimplifiedFinancesOverview */}
          <SimplifiedFinancesOverview />
        </div>
        
        <div className={`finances-tab-content ${activeTab === 'expected' ? 'active' : ''}`}>
          <ExpectedExpensesManager />
        </div>
        
        <div className={`finances-tab-content ${activeTab === 'recurring' ? 'active' : ''}`}>
          <RecurringRulesManager />
        </div>
        
        {user && ['Szülő', 'Családfő'].includes(user.role) && (
          <div className={`finances-tab-content ${activeTab === 'categories' ? 'active' : ''}`}>
            <CategoryManager />
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancesPage;