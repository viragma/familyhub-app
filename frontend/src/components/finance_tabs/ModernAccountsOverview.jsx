import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TransactionModal from '../TransactionModal';
import TransferModal from '../TransferModal';
import AccountModal from '../AccountModal';
import ModernTransactionsList from './ModernTransactionsList';
import QuickActionsPanel from './QuickActionsPanel';

function ModernAccountsOverview() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromAccount, setTransferFromAccount] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [modalConfig, setModalConfig] = useState({ type: '', accountId: null, accountName: '' });
  const [selectedAccountGroup, setSelectedAccountGroup] = useState('all');

  const [filters, setFilters] = useState({
    accountId: 'all',
    type: 'all',
    searchTerm: '',
    sortBy: 'date_desc'
  });

  const { user, token, apiUrl } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token || !user) return;

    const queryParams = new URLSearchParams();
    if (filters.accountId !== 'all') queryParams.append('account_id', filters.accountId);
    if (filters.type !== 'all') queryParams.append('type', filters.type);
    if (filters.searchTerm) queryParams.append('search', filters.searchTerm);
    queryParams.append('sort_by', filters.sortBy);

    try {
      const [accRes, catRes, transRes] = await Promise.all([
        fetch(`${apiUrl}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/categories/tree`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/transactions?${queryParams.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const accData = accRes.ok ? await accRes.json() : [];
      const catData = catRes.ok ? await catRes.json() : [];
      const transData = transRes.ok ? await transRes.json() : [];

      setAccounts(accData);
      setCategories(catData);
      setTransactions(transData);
    } catch (error) {
      console.error("Hiba az adatok lekérésekor:", error);
      setAccounts([]);
      setCategories([]);
      setTransactions([]);
    }
  }, [token, user, apiUrl, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const groupedAccounts = useMemo(() => {
    if (!user || !Array.isArray(accounts) || accounts.length === 0) return [];

    const getSortOrder = (account) => {
        if (account.owner_user_id === user.id) return 0;
        if (account.type === 'közös') return 1;
        if (account.type === 'személyes') return 2;
        return 3;
    };

    const sortedAccounts = [...accounts].sort((a, b) => {
        const orderA = getSortOrder(a);
        const orderB = getSortOrder(b);
        if (orderA !== orderB) return orderA - orderB;
        return a.name.localeCompare(b.name);
    });

    const groups = [];
    if (user.role === 'Családfő' || user.role === 'Szülő') {
        const myAccounts = sortedAccounts.filter(acc => acc.owner_user_id === user.id);
        const commonAccounts = sortedAccounts.filter(acc => acc.type === 'közös');
        const goalAndEmergency = sortedAccounts.filter(acc => ['cél', 'vész'].includes(acc.type));
        const childrenAccounts = sortedAccounts.filter(acc => acc.owner_user_id && acc.owner_user_id !== user.id);

        if(myAccounts.length > 0) groups.push({ id: 'my', title: 'Saját Kasszáim', accounts: myAccounts, icon: '👤' });
        if(commonAccounts.length > 0) groups.push({ id: 'common', title: 'Közös Kasszák', accounts: commonAccounts, icon: '🏠' });
        if(goalAndEmergency.length > 0) groups.push({ id: 'goals', title: 'Cél- és Vészkasszák', accounts: goalAndEmergency, icon: '🎯' });
        
        const childrenGrouped = childrenAccounts.reduce((acc, current) => {
            const ownerName = current.owner_user?.display_name || 'Ismeretlen';
            if(!acc[ownerName]) acc[ownerName] = [];
            acc[ownerName].push(current);
            return acc;
        }, {});

        for(const childName in childrenGrouped){
            groups.push({ id: `child-${childName}`, title: `${childName} Kasszái`, accounts: childrenGrouped[childName], icon: '👶' });
        }
    } else {
        const myOwnedAccounts = sortedAccounts.filter(acc => acc.owner_user_id === user.id);
        const sharedWithMe = sortedAccounts.filter(acc => acc.owner_user_id !== user.id);

        if(myOwnedAccounts.length > 0) groups.push({ id: 'my', title: 'Saját Kasszáim', accounts: myOwnedAccounts, icon: '👤' });
        if(sharedWithMe.length > 0) groups.push({ id: 'shared', title: 'Velem Megosztott Kasszák', accounts: sharedWithMe, icon: '👥' });
    }
    return groups;
  }, [accounts, user]);

  const displayedGroups = useMemo(() => {
    if (selectedAccountGroup === 'all') return groupedAccounts;
    return groupedAccounts.filter(group => group.id === selectedAccountGroup);
  }, [groupedAccounts, selectedAccountGroup]);

  const handleFilterChange = (filterName, value) => {
    setFilters(prevFilters => ({...prevFilters, [filterName]: value}));
  };

  const handleAccountCardClick = (accountId) => {
    navigate(`/finances/account/${accountId}`);
  };

  const openModalForNew = (type, accountId, accountName) => {
    setEditingTransaction(null);
    setModalConfig({ type, accountId, accountName });
    setIsTransactionModalOpen(true);
  };
  
  const openModalForEdit = (transaction) => {
    setEditingTransaction(transaction);
    const account = accounts.find(acc => acc.id === transaction.account_id);
    setModalConfig({ type: transaction.type, accountId: transaction.account_id, accountName: account?.name || '' });
    setIsTransactionModalOpen(true);
  };

  const handleSaveTransaction = async (transactionData) => {
    const method = editingTransaction ? 'PUT' : 'POST';
    const endpoint = editingTransaction 
      ? `${apiUrl}/api/transactions/${editingTransaction.id}`
      : `${apiUrl}/api/accounts/${modalConfig.accountId}/transactions`;
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(transactionData),
      });
      if (response.ok) {
        setIsTransactionModalOpen(false);
        fetchData();
      } else { 
        alert('Hiba a mentés során!'); 
      }
    } catch (error) { 
      console.error("Hiba a tranzakció mentésekor:", error); 
    }
  };

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a tranzakciót?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchData();
      } else { 
        alert('Hiba a törlés során!'); 
      }
    } catch (error) { 
      console.error("Hiba a tranzakció törlésekor:", error); 
    }
  };

  const handleSaveTransfer = async (transferData) => {
    try {
      const response = await fetch(`${apiUrl}/api/transfers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(transferData),
      });
      if (response.ok) {
        setIsTransferModalOpen(false);
        fetchData();
      } else {
        const errorData = await response.json();
        alert(`Hiba az utalás során: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Hiba az átutaláskor:", error);
    }
  };
  
  const openTransferModal = (fromAccount) => {
    setTransferFromAccount(fromAccount);
    setIsTransferModalOpen(true);
  };

  const handleSaveAccount = async (accountData) => {
    try {
      const response = await fetch(`${apiUrl}/api/accounts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(accountData),
      });
      if (response.ok) {
        setIsAccountModalOpen(false);
        fetchData();
      } else {
        alert('Hiba a kassza létrehozásakor!');
      }
    } catch (error) {
      console.error("Hiba a kassza mentésekor:", error);
    }
  };

  const handleSaveRecurringRule = async (ruleData) => {
    const fullRuleData = ruleData.type === 'átutalás' 
        ? ruleData 
        : { ...ruleData, to_account_id: modalConfig.accountId };

    try {
      const response = await fetch(`${apiUrl}/api/recurring-rules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(fullRuleData),
      });
      if (response.ok) {
        setIsTransactionModalOpen(false);
        setIsTransferModalOpen(false);
        alert('Ismétlődő szabály sikeresen elmentve!');
      } else {
        alert('Hiba a szabály mentése során!');
      }
    } catch (error) {
      console.error("Hiba az ismétlődő szabály mentésekor:", error);
    }
  };

  return (
    <div className="modern-accounts-overview">
      <QuickActionsPanel 
        onNewAccount={() => setIsAccountModalOpen(true)}
        onQuickTransaction={openModalForNew}
        accounts={accounts}
        user={user}
      />

      <div className="account-group-filter">
        <div className="filter-chips">
          <button 
            className={`filter-chip ${selectedAccountGroup === 'all' ? 'active' : ''}`}
            onClick={() => setSelectedAccountGroup('all')}
          >
            <span className="chip-icon">📋</span>
            <span>Összes</span>
          </button>
          {groupedAccounts.map(group => (
            <button 
              key={group.id}
              className={`filter-chip ${selectedAccountGroup === group.id ? 'active' : ''}`}
              onClick={() => setSelectedAccountGroup(group.id)}
            >
              <span className="chip-icon">{group.icon}</span>
              <span>{group.title}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="accounts-section">
        {displayedGroups.map(group => (
          <div key={group.id} className="account-group">
            <div className="account-group-header-modern">
              <span className="group-icon">{group.icon}</span>
              <h2 className="group-title">{group.title}</h2>
              <span className="group-count">{group.accounts.length}</span>
            </div>
            
            <div className="modern-accounts-grid">
              {group.accounts.map(account => {
                const isGoal = account.type === 'cél';
                const progress = isGoal && account.goal_amount > 0 
                  ? (parseFloat(account.balance) / parseFloat(account.goal_amount)) * 100 
                  : 0;
                const canTransferFrom = user && (user.role === 'Családfő' || user.role === 'Szülő' || user.id === account.owner_user_id);

                return (
                  <div 
                    className={`modern-account-card ${isGoal ? 'goal-type' : ''}`} 
                    key={account.id}
                    onClick={() => handleAccountCardClick(account.id)}
                  >
                    <div className="account-card-header-modern">
                      <div className="account-type-badge">
                        {account.type === 'személyes' && '👤'}
                        {account.type === 'közös' && '🏠'}
                        {account.type === 'cél' && '🎯'}
                        {account.type === 'vész' && '🚨'}
                        <span>{account.type}</span>
                      </div>
                      <div className="account-menu">⋮</div>
                    </div>

                    <div className="account-info">
                      <h3 className="account-name">{account.name}</h3>
                      <div className="account-balance">
                        {parseFloat(account.balance).toLocaleString('hu-HU')} Ft
                      </div>
                    </div>
                    
                    {isGoal && account.goal_amount && (
                      <div className="goal-progress">
                        <div className="progress-info">
                          <span>Cél: {parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</span>
                          <span className="progress-percentage">{progress.toFixed(1)}%</span>
                        </div>
                        <div className="progress-bar-modern">
                          <div className="progress-fill-modern" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                        </div>
                      </div>
                    )}
                    
                    <div className="account-actions-modern" onClick={e => e.stopPropagation()}>
                      {account.type !== 'közös' && account.type !== 'cél' && (
                        <>
                          <button 
                            className="action-btn-modern positive" 
                            onClick={(e) => { e.stopPropagation(); openModalForNew('bevétel', account.id, account.name); }}
                          >
                            <span className="action-icon">+</span>
                          </button>
                          <button 
                            className="action-btn-modern negative" 
                            onClick={(e) => { e.stopPropagation(); openModalForNew('kiadás', account.id, account.name); }}
                          >
                            <span className="action-icon">-</span>
                          </button>
                        </>
                      )}
                      {account.type !== 'közös' && canTransferFrom && (
                        <button 
                          className="action-btn-modern transfer" 
                          onClick={(e) => { e.stopPropagation(); openTransferModal(account); }}
                        >
                          <span className="action-icon">↗</span>
                        </button>
                      )}
                    </div>

                    {account.owner_user && (
                      <div className="account-owner">
                        <span className="owner-icon">👤</span>
                        <span className="owner-name">{account.owner_user.display_name}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <ModernTransactionsList 
        transactions={transactions}
        filters={filters}
        onFilterChange={handleFilterChange}
        onEditTransaction={openModalForEdit}
        onDeleteTransaction={handleDeleteTransaction}
        user={user}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSave={handleSaveAccount}
      />
      <TransactionModal 
        isOpen={isTransactionModalOpen}
        onClose={() => setIsTransactionModalOpen(false)}
        onSave={handleSaveTransaction}
        onSaveRecurring={handleSaveRecurringRule}
        transactionType={modalConfig.type}
        accountName={modalConfig.accountName}
        categories={categories}
        transactionData={editingTransaction}
      />
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSave={handleSaveTransfer}
        onSaveRecurring={handleSaveRecurringRule}
        fromAccount={transferFromAccount}
      />
    </div>
  );
}

export default ModernAccountsOverview;