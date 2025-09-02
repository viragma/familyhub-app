import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { PlusCircle, Link as LinkIcon, X, CheckCircle, ArrowRight } from 'lucide-react';

const AssignGoalModal = ({ isOpen, onClose, wish, onAssignmentSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [goalAccounts, setGoalAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsLoading(true);
      const fetchGoalAccounts = async () => {
        try {
          const response = await fetch(`${apiUrl}/api/accounts?type=cél`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setGoalAccounts(await response.json());
          } else {
            console.error("Hiba a célkasszák lekérdezésekor:", response.status);
          }
        } catch (error) {
          console.error("Hiba a célkasszák lekérdezésekor:", error);
        }
        setIsLoading(false);
      };
      fetchGoalAccounts();
    }
  }, [isOpen, apiUrl, token]);

  const handleSubmit = async (goal_account_id) => {
    setIsLoading(true);
    try {
        const response = await fetch(`${apiUrl}/api/wishes/${wish.id}/activate`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ goal_account_id }),
        });

        if (response.ok) {
            setIsSuccess(true);
            setTimeout(() => {
              onAssignmentSuccess();
            }, 1500); // 1.5 másodperc után automatikusan bezár
        } else {
            const err = await response.json();
            alert(`Hiba a hozzárendelés során: ${err.detail}`);
            setIsLoading(false);
        }
    } catch (error) {
        console.error("Hiba a gyűjtés aktiválásakor:", error);
        alert("Hálózati hiba történt.");
        setIsLoading(false);
    }
  };

  const handleAssign = () => handleSubmit(parseInt(selectedAccountId, 10));
  const handleCreateNew = () => handleSubmit(null);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Gyűjtés indítása</h3>
          <button onClick={onClose} className="modal-close-btn"><X size={24} /></button>
        </div>
        
        <div className="modal-body">
          {isSuccess ? (
            <div className="success-animation">
              <CheckCircle size={64} className="success-icon" />
              <h4>Sikeres!</h4>
              <p>A gyűjtés elindult.</p>
            </div>
          ) : (
            <>
              <div className="wish-summary-in-modal">
                <p>Kívánság:</p>
                <h4>{wish.name}</h4>
                <span>~ {(wish.estimated_price ?? 0).toLocaleString('hu-HU')} Ft</span>
              </div>

              <div className="choice-container">
                {/* 1. OPCIÓ: MEGLÉVŐHÖZ RENDELÉS */}
                <div 
                  className={`choice-card ${selectedAccountId ? 'selected' : ''}`}
                  onClick={() => document.getElementById('goal-select')?.focus()}
                >
                  <div className="choice-header">
                    <LinkIcon />
                    <h5>Hozzárendelés meglévő célhoz</h5>
                  </div>
                  <p>Válaszd ki a listából, melyik közös célhoz adod hozzá ezt a kívánságot.</p>
                  {isLoading ? <p>Töltés...</p> : (
                    <select 
                      id="goal-select"
                      className="form-input" 
                      value={selectedAccountId}
                      onChange={(e) => setSelectedAccountId(e.target.value)}
                    >
                      <option value="">Válassz egy kasszát...</option>
                      {goalAccounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                              {acc.name} ({ (acc.balance ?? 0).toLocaleString() } Ft)
                          </option>
                      ))}
                    </select>
                  )}
                  <button 
                      className="btn btn-primary" 
                      onClick={handleAssign}
                      disabled={!selectedAccountId || isLoading}
                  >
                      Hozzárendelés <ArrowRight size={16} />
                  </button>
                </div>
                
                <div className="or-divider">VAGY</div>

                {/* 2. OPCIÓ: ÚJ LÉTREHOZÁSA */}
                <div className="choice-card" onClick={handleCreateNew}>
                  <div className="choice-header">
                    <PlusCircle />
                    <h5>Új kassza létrehozása</h5>
                  </div>
                  <p>Létrehozunk egy új, önálló kasszát, kifejezetten ennek a kívánságnak.</p>
                   <button 
                      className="btn btn-secondary"
                      onClick={handleCreateNew}
                      disabled={isLoading}
                  >
                      Létrehozás <ArrowRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssignGoalModal;