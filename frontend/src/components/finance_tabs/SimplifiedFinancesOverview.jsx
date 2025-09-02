import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Plus, TrendingUp, TrendingDown, ArrowUpRight, Search, Filter } from 'lucide-react';
import TransactionModal from '../TransactionModal';
import TransferModal from '../TransferModal';
import AccountModal from '../AccountModal';

function SimplifiedFinancesOverview() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferFromAccount, setTransferFromAccount] = useState(null);
  const [editingTransaction, setEditingTransaction] = useState(null);
  const [modalConfig, setModalConfig] = useState({ type: '', accountId: null, accountName: '' });
  
  // Simple filter states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  
  const { user, token, apiUrl } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    
    setLoading(true);
    try {
      const [accRes, catRes, transRes] = await Promise.all([
        fetch(`${apiUrl}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/categories/tree`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/transactions?limit=20`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);

      const accData = accRes.ok ? await accRes.json() : [];
      const catData = catRes.ok ? await catRes.json() : [];
      const transData = transRes.ok ? await transRes.json() : [];

      setAccounts(accData);
      setCategories(catData);
      setTransactions(transData);
    } catch (error) {
      console.error("Hiba az adatok lekérésekor:", error);
    } finally {
      setLoading(false);
    }
  }, [token, user, apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = !searchTerm || 
        tx.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.creator?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesAccount = selectedAccountId === 'all' || 
        tx.account_id?.toString() === selectedAccountId;
      
      return matchesSearch && matchesAccount;
    });
  }, [transactions, searchTerm, selectedAccountId]);

  // Quick action handlers
  const openModalForNew = (type, accountId, accountName) => {
    setEditingTransaction(null);
    setModalConfig({ type, accountId, accountName });
    setIsTransactionModalOpen(true);
  };

  const openTransferModal = (fromAccount) => {
    setTransferFromAccount(fromAccount);
    setIsTransferModalOpen(true);
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

  // Kasszák csoportosítása
  const groupedAccounts = useMemo(() => {
    if (!user || !Array.isArray(accounts) || accounts.length === 0) return [];

    const groups = [];
    
    // Saját kasszák
    const myAccounts = accounts.filter(acc => acc.owner_user_id === user.id && acc.type !== 'cél');
    if (myAccounts.length > 0) {
      groups.push({
        id: 'my-accounts',
        title: 'Saját kasszáim',
        icon: '👤',
        accounts: myAccounts,
        priority: 1
      });
    }

    // Közös kasszák
    const commonAccounts = accounts.filter(acc => acc.type === 'közös');
    if (commonAccounts.length > 0) {
      groups.push({
        id: 'common-accounts', 
        title: 'Közös kasszák',
        icon: '🏠',
        accounts: commonAccounts,
        priority: 2
      });
    }

    // Cél kasszák
    const goalAccounts = accounts.filter(acc => acc.type === 'cél');
    if (goalAccounts.length > 0) {
      // Cél kasszák tulajdonos szerint csoportosítva
      const goalsByOwner = goalAccounts.reduce((acc, current) => {
        const ownerName = current.owner_user?.display_name || 'Ismeretlen';
        const isMyGoal = current.owner_user_id === user.id;
        const key = isMyGoal ? 'Saját céljaim' : `${ownerName} céljai`;
        
        if (!acc[key]) {
          acc[key] = {
            id: `goals-${isMyGoal ? 'my' : current.owner_user_id}`,
            title: key,
            icon: isMyGoal ? '🎯' : '👥',
            accounts: [],
            priority: isMyGoal ? 3 : 4
          };
        }
        acc[key].accounts.push(current);
        return acc;
      }, {});

      groups.push(...Object.values(goalsByOwner));
    }

    // Vész kasszák
    const emergencyAccounts = accounts.filter(acc => acc.type === 'vész');
    if (emergencyAccounts.length > 0) {
      groups.push({
        id: 'emergency-accounts',
        title: 'Vészkasszák', 
        icon: '🚨',
        accounts: emergencyAccounts,
        priority: 5
      });
    }

    // Más családtagok kasszái (személyes)
    const otherPersonalAccounts = accounts.filter(acc => 
      acc.type === 'személyes' && acc.owner_user_id !== user.id
    );
    
    if (otherPersonalAccounts.length > 0) {
      const otherAccountsByOwner = otherPersonalAccounts.reduce((acc, current) => {
        const ownerName = current.owner_user?.display_name || 'Ismeretlen';
        if (!acc[ownerName]) {
          acc[ownerName] = {
            id: `other-${current.owner_user_id}`,
            title: `${ownerName} kasszái`,
            icon: '👶',
            accounts: [],
            priority: 6
          };
        }
        acc[ownerName].accounts.push(current);
        return acc;
      }, {});

      groups.push(...Object.values(otherAccountsByOwner));
    }

    return groups.sort((a, b) => a.priority - b.priority);
  }, [accounts, user]);

  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  
  // Mobil nézetben alapból összecsukjuk a nem első csoportokat
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 768;
      if (isMobile && groupedAccounts.length > 1) {
        // Mobil nézetben az első csoport kivételével mindent összecsukunk
        const toCollapse = groupedAccounts.slice(1).map(group => group.id);
        setCollapsedGroups(new Set(toCollapse));
      } else if (!isMobile) {
        // Asztali nézetben mindent kinyitunk
        setCollapsedGroups(new Set());
      }
    };

    handleResize(); // Kezdeti beállítás
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [groupedAccounts]);
  
  const toggleGroup = (groupId) => {
    setCollapsedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const totalBalance = accounts.reduce((sum, acc) => sum + parseFloat(acc.balance || 0), 0);
  const myPersonalAccount = accounts.find(acc => acc.owner_user_id === user?.id && acc.type === 'személyes');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '2rem' }}>
        <div className="loading-spinner"></div>
        <p>Adatok betöltése...</p>
      </div>
    );
  }

  return (
    <div className="simplified-finances">
      {/* Egyenleg áttekintő */}
      <div className="balance-overview-card">
        <div className="balance-main">
          <h2 className="balance-title">Teljes egyenleg</h2>
          <div className="balance-amount-large">
            {totalBalance.toLocaleString('hu-HU')} Ft
          </div>
        </div>
        
        {myPersonalAccount && (
          <div className="personal-balance">
            <span className="personal-label">Saját egyenleg:</span>
            <span className="personal-amount">
              {parseFloat(myPersonalAccount.balance).toLocaleString('hu-HU')} Ft
            </span>
          </div>
        )}
      </div>

      {/* Gyors műveletek */}
      <div className="quick-actions-simple">
        <h3 className="section-title">
          <span className="title-icon">⚡</span>
          Gyors műveletek
        </h3>
        
        <div className="actions-grid">
          <button 
            className="action-card income"
            onClick={() => myPersonalAccount && openModalForNew('bevétel', myPersonalAccount.id, myPersonalAccount.name)}
            disabled={!myPersonalAccount}
          >
            <TrendingUp size={24} />
            <span>Bevétel</span>
          </button>
          
          <button 
            className="action-card expense"
            onClick={() => myPersonalAccount && openModalForNew('kiadás', myPersonalAccount.id, myPersonalAccount.name)}
            disabled={!myPersonalAccount}
          >
            <TrendingDown size={24} />
            <span>Kiadás</span>
          </button>
          
          <button 
            className="action-card transfer"
            onClick={() => myPersonalAccount && openTransferModal(myPersonalAccount)}
            disabled={!myPersonalAccount}
          >
            <ArrowUpRight size={24} />
            <span>Átutalás</span>
          </button>
          
          <button 
            className="action-card new-account"
            onClick={() => setIsAccountModalOpen(true)}
          >
            <Plus size={24} />
            <span>Új kassza</span>
          </button>
        </div>
      </div>

      {/* Kasszák csoportok szerint */}
      <div className="accounts-simple">
        <h3 className="section-title">
          <span className="title-icon">💰</span>
          Kasszáim ({accounts.length})
        </h3>
        
        <div className="account-groups">
          {groupedAccounts.map(group => (
            <div key={group.id} className="account-group-section">
              <div 
                className="group-header"
                onClick={() => toggleGroup(group.id)}
              >
                <div className="group-header-left">
                  <span className="group-icon">{group.icon}</span>
                  <span className="group-title">{group.title}</span>
                  <span className="group-count">({group.accounts.length})</span>
                </div>
                <div className={`group-toggle ${collapsedGroups.has(group.id) ? 'collapsed' : ''}`}>
                  ▼
                </div>
              </div>
              
              <div className={`group-content ${collapsedGroups.has(group.id) ? 'collapsed' : ''}`}>
                <div className="accounts-list">
                  {group.accounts.map(account => {
                    const isGoal = account.type === 'cél';
                    const progress = isGoal && account.goal_amount > 0 
                      ? (parseFloat(account.balance) / parseFloat(account.goal_amount)) * 100 
                      : 0;
                    
                    return (
                      <div 
                        key={account.id} 
                        className="account-item-simple"
                        onClick={() => navigate(`/finances/account/${account.id}`)}
                      >
                        <div className="account-info">
                          <div className="account-header">
                            <span className="account-name">{account.name}</span>
                            <div className="account-badges">
                              <span className={`account-type-tag ${account.type}`}>
                                {account.type}
                              </span>
                              {account.owner_user && account.owner_user_id !== user?.id && (
                                <span className="owner-badge">
                                  {account.owner_user.display_name}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="account-balance">
                            {parseFloat(account.balance).toLocaleString('hu-HU')} Ft
                          </div>
                          
                          {isGoal && account.goal_amount && (
                            <div className="goal-progress-simple">
                              <div className="progress-text">
                                Cél: {parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft • {progress.toFixed(0)}%
                              </div>
                              <div className="progress-bar-simple">
                                <div 
                                  className="progress-fill-simple" 
                                  style={{ width: `${Math.min(progress, 100)}%` }}
                                />
                              </div>
                              {account.goal_date && (
                                <div className="goal-deadline">
                                  Határidő: {new Date(account.goal_date).toLocaleDateString('hu-HU')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
          
          {groupedAccounts.length === 0 && (
            <div className="empty-accounts">
              <p>Még nincsenek kasszáid. Hozz létre egyet!</p>
            </div>
          )}
        </div>
      </div>

      {/* Legutóbbi tranzakciók */}
      <div className="recent-transactions">
        <div className="transactions-header-simple">
          <h3 className="section-title">
            <span className="title-icon">📝</span>
            Legutóbbi tranzakciók
          </h3>
          
          <button 
            className="filter-toggle"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter size={16} />
            {showFilters ? 'Bezár' : 'Szűrő'}
          </button>
        </div>
        
        {showFilters && (
          <div className="simple-filters">
            <div className="search-box">
              <Search size={16} />
              <input
                type="text"
                placeholder="Keresés..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-simple"
              />
            </div>
            
            <select 
              className="account-filter"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
            >
              <option value="all">Minden kassza</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name}</option>
              ))}
            </select>
          </div>
        )}
        
        <div className="transactions-list-simple">
          {filteredTransactions.length === 0 ? (
            <div className="empty-transactions-simple">
              <span>Nincsenek tranzakciók</span>
            </div>
          ) : (
            filteredTransactions.slice(0, 10).map(tx => (
              <div key={tx.id} className="transaction-item-simple">
                <div className={`transaction-icon-simple ${tx.type}`}>
                  {tx.type === 'bevétel' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                </div>
                
                <div className="transaction-details-simple">
                  <div className="transaction-description">
                    {tx.description || 'Nincs leírás'}
                  </div>
                  <div className="transaction-meta-simple">
                    {tx.creator?.display_name} • {new Date(tx.date).toLocaleDateString('hu-HU')}
                    {tx.category && ` • ${tx.category.name}`}
                  </div>
                </div>
                
                <div className={`transaction-amount-simple ${tx.type}`}>
                  {tx.type === 'bevétel' ? '+' : '-'}
                  {parseFloat(tx.amount).toLocaleString('hu-HU')} Ft
                </div>
              </div>
            ))
          )}
        </div>
        
        {filteredTransactions.length > 10 && (
          <div className="show-more-simple">
            <span>...és még {filteredTransactions.length - 10} tranzakció</span>
          </div>
        )}
      </div>

      {/* Modals */}
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

export default SimplifiedFinancesOverview;