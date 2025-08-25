import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import TransactionModal from '../TransactionModal';
import TransferModal from '../TransferModal'; 
import AccountModal from '../AccountModal';

function AccountsOverview() {
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
        fetch(`${apiUrl}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/transactions?${queryParams.toString()}`, { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      
      const accData = await accRes.json();
      const catData = await catRes.json();
      const transData = await transRes.json();
      
      setAccounts(accData);
      setCategories(catData);
      setTransactions(transData);
    } catch (error) { 
      console.error("Hiba az adatok lekérésekor:", error); 
    }
  }, [token, user, apiUrl, filters]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  const groupedAccounts = useMemo(() => {
    if (!user || accounts.length === 0) return [];

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

        if(myAccounts.length > 0) groups.push({ title: 'Saját Kasszáim', accounts: myAccounts });
        if(commonAccounts.length > 0) groups.push({ title: 'Közös Kasszák', accounts: commonAccounts });
        if(goalAndEmergency.length > 0) groups.push({ title: 'Cél- és Vészkasszák', accounts: goalAndEmergency });
        
        const childrenGrouped = childrenAccounts.reduce((acc, current) => {
            const ownerName = current.owner_user?.display_name || 'Ismeretlen';
            if(!acc[ownerName]) acc[ownerName] = [];
            acc[ownerName].push(current);
            return acc;
        }, {});

        for(const childName in childrenGrouped){
            groups.push({ title: `${childName} Kasszái`, accounts: childrenGrouped[childName] });
        }
    } else {
        const myOwnedAccounts = sortedAccounts.filter(acc => acc.owner_user_id === user.id);
        const sharedWithMe = sortedAccounts.filter(acc => acc.owner_user_id !== user.id);

        if(myOwnedAccounts.length > 0) groups.push({ title: 'Saját Kasszáim', accounts: myOwnedAccounts });
        if(sharedWithMe.length > 0) groups.push({ title: 'Velem Megosztott Kasszák', accounts: sharedWithMe });
    }
    return groups;
  }, [accounts, user]);


  const handleFilterChange = (filterName, value) => {
    setFilters(prevFilters => ({...prevFilters, [filterName]: value}));
  };

  const handleAccountCardClick = (accountId) => {
    if (filters.accountId === accountId) {
      navigate(`/finances/account/${accountId}`);
    } else {
      handleFilterChange('accountId', accountId);
    }
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
    // A 'to_account_id'-t a modalConfig-ból vesszük, mert a bevétel/kiadás mindig egy kasszához kötődik
    // De átutalásnál a ruleData már tartalmazza
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
        setIsTransferModalOpen(false); // Ezt is be kell zárni
        alert('Ismétlődő szabály sikeresen elmentve!');
      } else {
        alert('Hiba a szabály mentése során!');
      }
    } catch (error) {
      console.error("Hiba az ismétlődő szabály mentésekor:", error);
    }
  };

  return (
    <div>
     
        <h1>Pénzügyek</h1>
        <div>
          <button className="btn btn-primary" onClick={() => setIsAccountModalOpen(true)}>+ Új Kassza</button>
        </div>
 
      
      {groupedAccounts.map(group => (
        <div key={group.title}>
            <h2 className="account-group-header">{group.title}</h2>
            <div className="accounts-grid">
                {group.accounts.map(account => {
                    const isGoal = account.type === 'cél';
                    const progress = isGoal && account.goal_amount > 0 
                        ? (parseFloat(account.balance) / parseFloat(account.goal_amount)) * 100 
                        : 0;
                    const canTransferFrom = user && (user.role === 'Családfő' || user.role === 'Szülő' || user.id === account.owner_user_id);

                    return (
                        <div 
                            className={`account-card ${filters.accountId === account.id ? 'active' : ''} ${isGoal ? 'goal-type' : ''}`} 
                            key={account.id}
                            onClick={() => handleAccountCardClick(account.id)}
                            style={{cursor: 'pointer'}}
                        >
                            <div className="account-card-header">
                                <span className="account-card-name">{account.name}</span>
                                <span className="account-card-type">{account.type}</span>
                            </div>
                            <div className="account-card-balance">{parseFloat(account.balance).toLocaleString('hu-HU')} Ft</div>
                            
                            {isGoal && account.goal_amount && (
                                <>
                                    <div className="progress-bar-large">
                                        <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                    </div>
                                    <div className="summary-goal-details">
                                        <span>Cél: {parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</span>
                                        <span>{progress.toFixed(1)}%</span>
                                    </div>
                                    <div className="summary-goal-details" style={{fontSize: '0.75rem'}}>
                                        <span>Létrehozta: {account.owner_user?.display_name || 'Ismeretlen'}</span>
                                    </div>
                                </>
                            )}
                            
                            <div className="account-card-actions">
                                {account.type !== 'közös' && account.type !== 'cél' && (
                                    <>
                                        <button className="btn btn-primary" style={{flex: 1}} onClick={(e) => { e.stopPropagation(); openModalForNew('bevétel', account.id, account.name); }}>+ Bevétel</button>
                                        <button className="btn btn-secondary" style={{flex: 1}} onClick={(e) => { e.stopPropagation(); openModalForNew('kiadás', account.id, account.name); }}>- Kiadás</button>
                                    </>
                                )}
                                {account.type !== 'közös' && canTransferFrom && (
                                    <button className="btn btn-secondary" style={{flex: 1}} onClick={(e) => { e.stopPropagation(); openTransferModal(account); }}>Átutalás</button>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
      ))}
      
      <div className="transactions-section">
        <h2>Tranzakciók</h2>
        <div className="filters">
          <div className="filter-group">
            <label className="filter-label">Típus</label>
            <div className="btn-group">
              <button className={filters.type === 'all' ? 'active' : ''} onClick={() => handleFilterChange('type', 'all')}>Mind</button>
              <button className={filters.type === 'bevétel' ? 'active' : ''} onClick={() => handleFilterChange('type', 'bevétel')}>Bevétel</button>
              <button className={filters.type === 'kiadás' ? 'active' : ''} onClick={() => handleFilterChange('type', 'kiadás')}>Kiadás</button>
            </div>
          </div>
          <div className="filter-group" style={{flexGrow: 1}}>
            <label className="filter-label">Keresés a leírásban</label>
            <input 
              type="text" 
              className="form-input"
              value={filters.searchTerm}
              onChange={e => handleFilterChange('searchTerm', e.target.value)}
              placeholder="Keresés..."
            />
          </div>
          <div className="filter-group">
            <label className="filter-label">Rendezés</label>
            <select className="form-input" value={filters.sortBy} onChange={e => handleFilterChange('sortBy', e.target.value)}>
              <option value="date_desc">Legújabb elöl</option>
              <option value="date_asc">Legrégebbi elöl</option>
              <option value="amount_desc">Összeg (csökkenő)</option>
              <option value="amount_asc">Összeg (növekvő)</option>
            </select>
          </div>
        </div>

        <div>
          {transactions.map(tx => (
            <div className="transaction-card" key={tx.id}>
              <div className="transaction-card-icon" style={{ background: tx.type === 'bevétel' ? 'var(--success)' : 'var(--danger)', color: 'white' }}>
                {tx.type === 'bevétel' ? '▼' : '▲'}
              </div>
              <div className="transaction-card-details">
                <span className="transaction-card-description">{tx.description || 'Nincs leírás'}</span>
                <div className="transaction-card-meta">
                  <span><strong>Rögzítette:</strong> {tx.creator?.display_name || 'Ismeretlen'}</span>
                  <span><strong>Dátum:</strong> {new Date(tx.date).toLocaleDateString('hu-HU')}</span>
                  <span><strong>Kategória:</strong> {tx.category ? tx.category.name : 'Nincs'}</span>
                </div>
              </div>
              <div className="transaction-card-amount">
                <span className="amount-value" style={{ color: tx.type === 'bevétel' ? 'var(--success)' : 'var(--text-primary)' }}>
                  {tx.type === 'bevétel' ? '+' : '-'}{parseFloat(tx.amount).toLocaleString('hu-HU')} Ft
                </span>
                {user && ['Szülő', 'Családfő'].includes(user.role) && (
                  <div className="item-actions">
                      <button className="action-btn-icon" onClick={() => openModalForEdit(tx)}>✏️</button>
                      <button className="action-btn-icon" onClick={() => handleDeleteTransaction(tx.id)}>🗑️</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

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

export default AccountsOverview;