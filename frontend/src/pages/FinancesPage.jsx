import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
// A 'useSwipeable' importot eltávolítottuk
import AccountsOverview from '../components/finance_tabs/AccountsOverview';
import RecurringRulesManager from '../components/finance_tabs/RecurringRulesManager';
import CategoryManager from '../components/finance_tabs/CategoryManager';

function FinancesPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const { user } = useAuth();

  return (
    <div>
      <div className="page-header">
        <h1>Pénzügyek</h1>
      </div>
      
      <div className="modal-tabs">
        <button className={`modal-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Áttekintés</button>
        <button className={`modal-tab ${activeTab === 'recurring' ? 'active' : ''}`} onClick={() => setActiveTab('recurring')}>Rendszeres Tételek</button>
        {user && ['Szülő', 'Családfő'].includes(user.role) && (
          <button className={`modal-tab ${activeTab === 'categories' ? 'active' : ''}`} onClick={() => setActiveTab('categories')}>Kategóriák</button>
        )}
      </div>

      {/* A swipe 'handlers'-t eltávolítottuk a konténer div-ről */}
      <div>
        <div className={`tab-content ${activeTab === 'overview' ? 'active' : ''}`}>
          <AccountsOverview />
        </div>
        <div className={`tab-content ${activeTab === 'recurring' ? 'active' : ''}`}>
          <RecurringRulesManager />
        </div>
        {user && ['Szülő', 'Családfő'].includes(user.role) && (
          <div className={`tab-content ${activeTab === 'categories' ? 'active' : ''}`}>
            <CategoryManager />
          </div>
        )}
      </div>
    </div>
  );
}

export default FinancesPage;