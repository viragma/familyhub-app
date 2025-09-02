import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  Search, 
  Filter,
  Eye,
  EyeOff,
  PiggyBank,
  Target,
  AlertTriangle,
  Users,
  User,
  Home,
  ChevronDown,
  Send
} from 'lucide-react';
import TransactionModal from '../TransactionModal';
import TransferModal from '../TransferModal';
import AccountModal from '../AccountModal';
// Import az új, javított tranzakció lista komponenshez
import ModernTransactionsList from './ModernTransactionsList';

// Kassza típus ikonok és színek
const ACCOUNT_TYPES = {
  'személyes': {
    icon: <User size={16} />,
    color: '#4299e1', // Kék
    bgColor: 'rgba(66, 153, 225, 0.1)',
    borderColor: '#4299e1'
  },
  'közös': {
    icon: <Home size={16} />,
    color: '#48bb78', // Zöld
    bgColor: 'rgba(72, 187, 120, 0.1)',
    borderColor: '#48bb78'
  },
  'cél': {
    icon: <Target size={16} />,
    color: '#ed8936', // Narancs
    bgColor: 'rgba(237, 137, 54, 0.1)',
    borderColor: '#ed8936'
  },
  'vész': {
    icon: <AlertTriangle size={16} />,
    color: '#f56565', // Piros
    bgColor: 'rgba(245, 101, 101, 0.1)',
    borderColor: '#f56565'
  }
};

function ImprovedFinancesOverview() {
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
  
  // UI states
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState('all');
  const [hideZeroBalances, setHideZeroBalances] = useState(false);
  
  // ÚJ: Tranzakció szűrő state-ek a ModernTransactionsList számára
  const [transactionFilters, setTransactionFilters] = useState({
    accountId: 'all',
    type: 'all',
    searchTerm: '',
    sortBy: 'date_desc'
  });
  
  const { user, token, apiUrl } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    
    setLoading(true);
    try {
      // ÚJ: Több tranzakciót kérünk le a jobb megjelenítés érdekében
      const [accRes, catRes, transRes] = await Promise.all([
        fetch(`${apiUrl}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/categories/tree`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/transactions?limit=50`, { headers: { 'Authorization': `Bearer ${token}` } }),
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

  // Kasszák csoportosítása továbbfejlesztett logikával
  const groupedAccounts = useMemo(() => {
    if (!user || !Array.isArray(accounts) || accounts.length === 0) return [];

    let filteredAccounts = accounts;
    
    // Szűrés nulla egyenlegűekre
    if (hideZeroBalances) {
      filteredAccounts = filteredAccounts.filter(acc => parseFloat(acc.balance) !== 0);
    }

    const groups = [];
    
    // Saját kasszák (személyes + cél + vész ahol owner = user)
    const myPersonalAccounts = filteredAccounts.filter(acc => 
      acc.owner_user_id === user.id && acc.type === 'személyes'
    );
    const myGoalAccounts = filteredAccounts.filter(acc => 
      acc.owner_user_id === user.id && acc.type === 'cél'
    );
    const myEmergencyAccounts = filteredAccounts.filter(acc => 
      acc.owner_user_id === user.id && acc.type === 'vész'
    );

    // Közös kasszák
    const commonAccounts = filteredAccounts.filter(acc => acc.type === 'közös');

    // Családtagok kasszái (nem saját)
    const familyAccountsByOwner = filteredAccounts
      .filter(acc => acc.owner_user_id !== user.id && acc.owner_user_id !== null)
      .reduce((acc, current) => {
        const ownerName = current.owner_user?.display_name || 'Ismeretlen';
        if (!acc[ownerName]) acc[ownerName] = [];
        acc[ownerName].push(current);
        return acc;
      }, {});

    // Saját kasszák csoportok
    if (myPersonalAccounts.length > 0) {
      groups.push({
        id: 'my-personal',
        title: 'Saját kasszáim',
        icon: <User size={20} />,
        accounts: myPersonalAccounts,
        priority: 1,
        isOwner: true
      });
    }

    if (myGoalAccounts.length > 0) {
      groups.push({
        id: 'my-goals',
        title: 'Saját céljaim',
        icon: <Target size={20} />,
        accounts: myGoalAccounts,
        priority: 2,
        isOwner: true
      });
    }

    if (myEmergencyAccounts.length > 0) {
      groups.push({
        id: 'my-emergency',
        title: 'Vészkasszáim',
        icon: <AlertTriangle size={20} />,
        accounts: myEmergencyAccounts,
        priority: 3,
        isOwner: true
      });
    }

    // Közös kasszák
    if (commonAccounts.length > 0) {
      groups.push({
        id: 'common',
        title: 'Közös kasszák', 
        icon: <Home size={20} />,
        accounts: commonAccounts,
        priority: 4,
        isOwner: false
      });
    }

    // Családtagok kasszái
    Object.entries(familyAccountsByOwner).forEach(([ownerName, ownerAccounts], index) => {
      groups.push({
        id: `family-${ownerName}`,
        title: `${ownerName} kasszái`,
        icon: <Users size={20} />,
        accounts: ownerAccounts,
        priority: 5 + index,
        isOwner: false
      });
    });

    return groups.sort((a, b) => a.priority - b.priority);
  }, [accounts, user, hideZeroBalances]);

  // Összecsukható csoportok kezelése
  const [collapsedGroups, setCollapsedGroups] = useState(new Set());
  
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

    handleResize();
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

  // ÚJ: Tranzakció szűrő handler
  const handleTransactionFilterChange = (filterName, value) => {
    setTransactionFilters(prevFilters => ({
      ...prevFilters,
      [filterName]: value
    }));
  };

  // Modal handlers (ugyanazok mint előtte)
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
    <div className="improved-finances">
      {/* Egyenleg áttekintő fejlesztett verzió */}
      <div className="balance-overview-enhanced">
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

        {/* Gyors műveletek panel */}
        <div className="quick-actions-enhanced">
          <button 
            className="quick-action-btn income"
            onClick={() => myPersonalAccount && openModalForNew('bevétel', myPersonalAccount.id, myPersonalAccount.name)}
            disabled={!myPersonalAccount}
          >
            <TrendingUp size={20} />
            <span>Bevétel</span>
          </button>
          
          <button 
            className="quick-action-btn expense"
            onClick={() => myPersonalAccount && openModalForNew('kiadás', myPersonalAccount.id, myPersonalAccount.name)}
            disabled={!myPersonalAccount}
          >
            <TrendingDown size={20} />
            <span>Kiadás</span>
          </button>
          
          <button 
            className="quick-action-btn transfer"
            onClick={() => myPersonalAccount && openTransferModal(myPersonalAccount)}
            disabled={!myPersonalAccount}
          >
            <Send size={20} />
            <span>Átutalás</span>
          </button>
          
          <button 
            className="quick-action-btn new-account"
            onClick={() => setIsAccountModalOpen(true)}
          >
            <Plus size={20} />
            <span>Új kassza</span>
          </button>
        </div>
      </div>

      {/* Szűrők és beállítások */}
      <div className="accounts-controls">
        <div className="controls-header">
          <h3 className="section-title">
            <PiggyBank size={24} />
            Kasszáim ({accounts.length})
          </h3>
          
          <div className="controls-actions">
            <button 
              className="control-btn"
              onClick={() => setHideZeroBalances(!hideZeroBalances)}
              title={hideZeroBalances ? "Nulla egyenlegűek mutatása" : "Nulla egyenlegűek elrejtése"}
            >
              {hideZeroBalances ? <Eye size={16} /> : <EyeOff size={16} />}
            </button>
            
            <button 
              className="control-btn"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter size={16} />
              {showFilters ? 'Bezár' : 'Szűrő'}
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="simple-filters-enhanced">
            <div className="search-box-enhanced">
              <Search size={16} />
              <input
                type="text"
                placeholder="Keresés..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input-enhanced"
              />
            </div>
          </div>
        )}
      </div>

      {/* Kasszák csoportok szerint fejlesztett nézet */}
      <div className="account-groups-enhanced">
        {groupedAccounts.map(group => (
          <div key={group.id} className="account-group-enhanced">
            <div 
              className="group-header-enhanced"
              onClick={() => toggleGroup(group.id)}
            >
              <div className="group-header-left-enhanced">
                <span className="group-icon-enhanced">{group.icon}</span>
                <span className="group-title-enhanced">{group.title}</span>
                <span className="group-count-enhanced">({group.accounts.length})</span>
                <span className="group-total-enhanced">
                  {group.accounts.reduce((sum, acc) => sum + parseFloat(acc.balance), 0).toLocaleString('hu-HU')} Ft
                </span>
              </div>
              <div className={`group-toggle-enhanced ${collapsedGroups.has(group.id) ? 'collapsed' : ''}`}>
                <ChevronDown size={16} />
              </div>
            </div>
            
            <div className={`group-content-enhanced ${collapsedGroups.has(group.id) ? 'collapsed' : ''}`}>
              <div className="accounts-grid-enhanced">
                {group.accounts.map(account => {
                  const accountType = ACCOUNT_TYPES[account.type] || ACCOUNT_TYPES['személyes'];
                  const isGoal = account.type === 'cél';
                  const progress = isGoal && account.goal_amount > 0 
                    ? (parseFloat(account.balance) / parseFloat(account.goal_amount)) * 100 
                    : 0;
                  const canTransferTo = isGoal; // Cél kasszákba lehet utalni
                  const canTransferFrom = user && (user.role === 'Családfő' || user.role === 'Szülő' || user.id === account.owner_user_id);
                  
                  return (
                    <div 
                      key={account.id} 
                      className="account-card-enhanced"
                      onClick={() => navigate(`/finances/account/${account.id}`)}
                      style={{
                        borderLeft: `4px solid ${accountType.borderColor}`
                      }}
                    >
                      <div className="account-header-enhanced">
                        <div className="account-title-section">
                          <h4 className="account-name-enhanced">{account.name}</h4>
                          <div 
                            className="account-type-badge-enhanced"
                            style={{
                              backgroundColor: accountType.bgColor,
                              color: accountType.color,
                              border: `1px solid ${accountType.borderColor}`
                            }}
                          >
                            {accountType.icon}
                            <span>{account.type}</span>
                          </div>
                        </div>
                        
                        <div className="account-balance-enhanced">
                          {parseFloat(account.balance).toLocaleString('hu-HU')} Ft
                        </div>
                      </div>
                      
                      {isGoal && account.goal_amount && (
                        <div className="goal-progress-enhanced">
                          <div className="progress-info-enhanced">
                            <span className="goal-target">Cél: {parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</span>
                            <span className="progress-percentage-enhanced" style={{ color: accountType.color }}>
                              {progress.toFixed(0)}%
                            </span>
                          </div>
                          <div className="progress-bar-enhanced">
                            <div 
                              className="progress-fill-enhanced" 
                              style={{ 
                                width: `${Math.min(progress, 100)}%`,
                                backgroundColor: accountType.color
                              }}
                            />
                          </div>
                          {account.goal_date && (
                            <div className="goal-deadline-enhanced">
                              Határidő: {new Date(account.goal_date).toLocaleDateString('hu-HU')}
                            </div>
                          )}
                        </div>
                      )}
                      
                      {account.owner_user && account.owner_user_id !== user?.id && (
                        <div className="account-owner-enhanced">
                          <User size={14} />
                          <span>{account.owner_user.display_name}</span>
                        </div>
                      )}

                      <div className="account-actions-enhanced" onClick={e => e.stopPropagation()}>
                        {account.type !== 'közös' && !isGoal && (
                          <>
                            <button 
                              className="action-btn-enhanced income" 
                              onClick={(e) => { e.stopPropagation(); openModalForNew('bevétel', account.id, account.name); }}
                              title="Bevétel hozzáadása"
                            >
                              <TrendingUp size={16} />
                            </button>
                            <button 
                              className="action-btn-enhanced expense" 
                              onClick={(e) => { e.stopPropagation(); openModalForNew('kiadás', account.id, account.name); }}
                              title="Kiadás hozzáadása"
                            >
                              <TrendingDown size={16} />
                            </button>
                          </>
                        )}
                        
                        {/* Átutalás CÉL kasszákBA */}
                        {canTransferTo && (
                          <button 
                            className="action-btn-enhanced transfer-to" 
                            onClick={(e) => { e.stopPropagation(); openTransferModal(myPersonalAccount); }}
                            title="Átutalás ebbe a célkasszába"
                            disabled={!myPersonalAccount}
                          >
                            <ArrowUpRight size={16} />
                          </button>
                        )}
                        
                        {/* Átutalás kasszából (nem cél kasszák esetén) */}
                        {!isGoal && canTransferFrom && (
                          <button 
                            className="action-btn-enhanced transfer-from" 
                            onClick={(e) => { e.stopPropagation(); openTransferModal(account); }}
                            title="Átutalás ebből a kasszából"
                          >
                            <Send size={16} />
                          </button>
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
          <div className="empty-accounts-enhanced">
            <PiggyBank size={48} />
            <h3>Még nincsenek kasszáid</h3>
            <p>Hozz létre az első kasszádat a gombbal fent!</p>
          </div>
        )}
      </div>

      {/* ÚJ: ModernTransactionsList komponens használata */}
      <ModernTransactionsList 
        transactions={transactions}
        filters={transactionFilters}
        onFilterChange={handleTransactionFilterChange}
        onEditTransaction={openModalForEdit}
        onDeleteTransaction={handleDeleteTransaction}
        user={user}
      />

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

export default ImprovedFinancesOverview;