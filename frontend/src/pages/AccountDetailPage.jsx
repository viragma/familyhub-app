import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ModernTransactionsList from '../components/finance_tabs/ModernTransactionsList';
import './AccountDetailPage.css'; // <-- FONTOS: Az új CSS importálása

// Az oldal tetejére, a többi import alá
import { FaPlus, FaTrophy, FaArchive } from 'react-icons/fa';


// Új komponens az Idővonal megjelenítéséhez
const HistoryTimeline = ({ history }) => {
    const getIcon = (action) => {
        switch (action) {
            case 'created': return <FaPlus />;
            case 'archived': return <FaArchive />;
            default: return '📜';
        }
    };

    const getActionText = (action, details) => {
        switch (action) {
            case 'created': return 'Kassza létrehozva';
            case 'archived':
                return `Kassza lezárva és archiválva`;
            default: return action;
        }
    };

    return (
        <div className="history-timeline">
            {history.map(item => (
                <div key={item.id} className="history-item">
                    <div className="history-icon">{getIcon(item.action)}</div>
                    <div className="history-content">
                        <h4>{getActionText(item.action, item.details)}</h4>
                        <p>
                            {new Date(item.timestamp).toLocaleString('hu-HU')}
                            {item.user && ` - ${item.user.display_name}`}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};


// Komponens az Archivált kassza nézetéhez
const ArchivedAccountView = ({ account, transactions }) => {
    // Keressük meg a lezárási eseményt a történetben, hogy megtudjuk a végső összeget
    const closingEvent = account.history_entries.find(e => e.action === 'archived');
    const finalAmount = closingEvent?.details?.final_amount || 0;
    const difference = (account.goal_amount || 0) - finalAmount;
    
    return (
        <div>
            <header className="archived-header">
                <h1>{account.name.replace(/\[Teljesítve\]\s*/, '')}</h1>
                <div className="status-chip">🏆 Teljesítve & Archiválva</div>
            </header>

            <div className="archived-summary-grid">
                <div className="summary-item">
                    <span className="label">Eredeti Cél</span>
                    <span className="value">{parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="summary-item">
                    <span className="label">Végső Költés</span>
                    <span className="value">{parseFloat(finalAmount).toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="summary-item">
                    <span className="label">Eltérés</span>
                    <span className={`value ${difference >= 0 ? 'positive' : 'negative'}`}>
                        {difference >= 0 ? '+' : ''}{parseFloat(difference).toLocaleString('hu-HU')} Ft
                    </span>
                </div>
            </div>

            <div className="bento-card">
                 <h3>A Cél Története</h3>
                 <HistoryTimeline history={account.history_entries} />
            </div>

            <div className="bento-card" style={{marginTop: '2rem'}}>
                <h3>Kapcsolódó Tranzakciók</h3>
                <ModernTransactionsList transactions={transactions} />
            </div>
        </div>
    );
};

// Komponens az Aktív kassza nézetéhez (a régi tartalom)
const ActiveAccountView = ({ account, transactions, onOpenCloseModal }) => {
    const isParent = useAuth().user.role === 'Szülő' || useAuth().user.role === 'Családfő';
    const goalReached = account.goal_amount && parseFloat(account.balance) >= parseFloat(account.goal_amount);

    return (
        <div>
            <div className="page-header">
                 <h1>{account.name}</h1>
            </div>
            {/* Itt lehetne a régi "aside" és "main" elrendezés, vagy egy egyszerűbb */}
            <div className="bento-card" style={{marginBottom: '2rem'}}>
                <h2>Áttekintés</h2>
                <p>Egyenleg: <strong>{parseFloat(account.balance).toLocaleString('hu-HU')} Ft</strong></p>
                {account.type === 'cél' && (
                    <p>Cél: {parseFloat(account.goal_amount).toLocaleString('hu-HU')} Ft</p>
                )}
                 {isParent && account.type === 'cél' && (
                    <button 
                        className="btn btn-primary" 
                        onClick={() => onOpenCloseModal(account)} 
                        disabled={!goalReached}
                        title={!goalReached ? "A cél még nem teljesült." : "Cél lezárása"}
                    >
                        Gyűjtés Lezárása
                    </button>
                )}
            </div>

            <div className="bento-card">
                 <h3>Tranzakciók</h3>
                <ModernTransactionsList transactions={transactions} />
            </div>
        </div>
    );
};


// A fő komponens
function AccountDetailPage() {
    const { accountId } = useParams();
    const [account, setAccount] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { user, token, apiUrl } = useAuth();
    // ... (a modal state-ek itt maradnak)
    const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
    const [categories, setCategories] = useState([]);
    const [apiError, setApiError] = useState('');
    const navigate = useNavigate();

    const fetchData = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const [accRes, transRes, catRes] = await Promise.all([
                fetch(`${apiUrl}/api/accounts/${accountId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/transactions?account_id=${accountId}`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);

            if (!accRes.ok) throw new Error("Kassza nem található vagy nincs jogosultságod.");
            
            setAccount(await accRes.json());
            if(transRes.ok) setTransactions(await transRes.json());
            if(catRes.ok) setCategories(await catRes.json());

        } catch (error) {
            console.error(error);
            // navigate('/finances');
        } finally {
            setIsLoading(false);
        }
    }, [accountId, token, apiUrl, navigate]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCloseSubmit = async (formData) => {
        setApiError('');
        try {
            const response = await fetch(`${apiUrl}/api/accounts/${accountId}/close`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`},
                body: JSON.stringify(formData),
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || 'A kassza lezárása sikertelen.');
            }
            setIsCloseModalOpen(false);
            // Frissítsük az oldalt, hogy az új archivált nézet jelenjen meg
            fetchData(); 
        } catch (err) {
            setApiError(err.message);
        }
    };


    if (isLoading) return <div className="page-container"><h2>Betöltés...</h2></div>;
    if (!account) return <div className="page-container"><h2>Kassza nem található.</h2></div>;

    return (
        <div className="page-container">
            {account.status === 'archived' ? (
                <ArchivedAccountView account={account} transactions={transactions} />
            ) : (
                <ActiveAccountView account={account} transactions={transactions} onOpenCloseModal={() => setIsCloseModalOpen(true)} />
            )}

            {isCloseModalOpen && (
                 <CloseGoalModal
                    isOpen={isCloseModalOpen}
                    onClose={() => { setIsCloseModalOpen(false); setApiError(''); }}
                    onSubmit={handleCloseSubmit}
                    account={account}
                    categories={categories}
                    error={apiError}
                />
            )}
        </div>
    );
}

export default AccountDetailPage;