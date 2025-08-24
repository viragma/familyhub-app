import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AccountModal from '../components/AccountModal';

function AccountDetailPage() {
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { accountId } = useParams();
  const navigate = useNavigate();
  const { token, user, apiUrl } = useAuth();

  const fetchData = useCallback(async () => {
    if (!token || !user) return;
    try {
      const [accRes, transRes, membersRes] = await Promise.all([
        fetch(`${apiUrl}/api/accounts/${accountId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/transactions?account_id=${accountId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/families/${user.family_id}/users`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      if (!accRes.ok) throw new Error("Kassza nem található vagy nincs jogosultságod.");
      
      setAccount(await accRes.json());
      setTransactions(await transRes.json());
      setFamilyMembers(await membersRes.json());
    } catch (error) {
      console.error(error);
      navigate('/finances');
    }
  }, [accountId, token, user, apiUrl, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSaveAccount = async (accountData) => {
    try {
      const response = await fetch(`${apiUrl}/api/accounts/${accountId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(accountData),
      });
      if (response.ok) {
        setIsModalOpen(false);
        fetchData();
      } else { 
        alert('Hiba a mentés során!'); 
      }
    } catch (error) { 
      console.error("Hiba a kassza mentésekor:", error); 
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Biztosan törölni szeretnéd ezt a kasszát? Ez a művelet nem vonható vissza.")) {
        try {
            const response = await fetch(`${apiUrl}/api/accounts/${accountId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                navigate('/finances');
            } else {
                const errorData = await response.json();
                alert(`Hiba a törlés során: ${errorData.detail}`);
            }
        } catch (error) { console.error("Hiba a kassza törlésekor:", error); }
    }
  };

  const handleSharingToggle = async (viewerId, isShared) => {
    try {
      const response = await fetch(`${apiUrl}/api/accounts/${accountId}/share?viewer_id=${viewerId}&share=${isShared}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchData();
      } else {
        alert('Hiba a megosztás módosításakor!');
      }
    } catch (error) {
      console.error("Hiba a megosztáskor:", error);
    }
  };

  if (!account || !user) {
    return <div>Kassza adatainak betöltése...</div>;
  }

  const isOwner = user.id === account.owner_user_id;
  const isParent = user.role === 'Szülő' || user.role === 'Családfő';
  const canManageAccount = isOwner || isParent;
  const isSystemAccount = account.type === 'személyes' || account.type === 'közös';

  const progress = account.goal_amount > 0 ? (parseFloat(account.balance) / parseFloat(account.goal_amount)) * 100 : 0;
  const timeLeft = account.goal_date ? new Date(account.goal_date) > new Date() ? `${(new Date(account.goal_date).getFullYear() - new Date().getFullYear()) * 12 + (new Date(account.goal_date).getMonth() - new Date().getMonth())} hónap` : 'Lejárt' : 'N/A';
  
  const otherParents = familyMembers.filter(m => m.id !== user.id && ['Szülő', 'Családfő'].includes(m.role));
  const viewerIds = account.viewers.map(v => v.id);

  return (
    <div>
      <div className="page-header">
        <h1>{account.name}</h1>
      </div>

      <div className="account-detail-layout">
        <aside className="account-summary-card">
          <span className="account-card-type">{account.type}</span>
          <div className="summary-balance">{parseFloat(account.balance).toLocaleString('hu-HU')} Ft</div>
          
          {account.type === 'cél' && account.goal_amount && (
            <div>
              <div className="summary-goal-details">
                <span>Cél</span>
                <span>{parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</span>
              </div>
              <div className="progress-bar-large">
                <div className="progress-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
              </div>
              <div className="summary-goal-details">
                <span>Teljesítve</span>
                <span>{progress.toFixed(1)}%</span>
              </div>
              <div className="summary-goal-details">
                <span>Hátralévő idő</span>
                <span>{timeLeft}</span>
              </div>
            </div>
          )}

          {account.type === 'személyes' && isOwner && (
            <div className="sharing-section">
              <h3 className="form-label" style={{marginBottom: '1rem'}}>Megosztás Más Szülőkkel</h3>
              {otherParents.length > 0 ? otherParents.map(parent => (
                <div className="sharing-item" key={parent.id}>
                  <span>{parent.display_name}</span>
                  <label className="switch">
                    <input 
                      type="checkbox" 
                      checked={viewerIds.includes(parent.id)}
                      onChange={(e) => handleSharingToggle(parent.id, e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              )) : <p style={{fontSize: '0.8rem', color: 'var(--text-secondary)'}}>Nincs más szülő a családban.</p>}
            </div>
          )}

          {canManageAccount && !isSystemAccount && (
            <div className="summary-actions">
              <button className="btn btn-secondary" onClick={() => setIsModalOpen(true)}>Kassza Szerkesztése</button>
              <button className="btn btn-secondary" style={{borderColor: 'var(--danger)', color: 'var(--danger)'}} onClick={handleDeleteAccount}>Kassza Törlése</button>
            </div>
          )}
        </aside>

        <main className="transactions-section" style={{marginTop: 0}}>
          <h2>Tranzakciók</h2>
          <div>
            {transactions.length > 0 ? transactions.map(tx => (
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
                </div>
              </div>
            )) : <p>Ehhez a kasszához még nincsenek tranzakciók.</p>}
          </div>
        </main>
      </div>

      {canManageAccount && !isSystemAccount && (
        <AccountModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={handleSaveAccount}
            accountData={account}
        />
      )}
    </div>
  );
}

export default AccountDetailPage;