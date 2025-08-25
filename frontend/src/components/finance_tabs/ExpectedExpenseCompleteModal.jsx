import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function ExpectedExpenseCompleteModal({ isOpen, onClose, onComplete, expenseData, accounts }) {
  const [actualAmount, setActualAmount] = useState('');
  const [accountId, setAccountId] = useState('');

  useEffect(() => {
    if (isOpen && expenseData) {
      // Alapértelmezetten a becsült összeget ajánljuk fel
      setActualAmount(expenseData.estimated_amount || '');
      setAccountId(''); // Mindig üresen indul
    }
  }, [isOpen, expenseData]);

  const handleComplete = () => {
    if (!actualAmount || !accountId) {
      alert('Kérlek, add meg a végleges összeget és válaszd ki a kasszát!');
      return;
    }
    onComplete(expenseData.id, {
      actual_amount: parseFloat(actualAmount),
      account_id: parseInt(accountId),
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Kiadás Teljesítése</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <p className="auth-subtitle" style={{marginBottom: '1.5rem'}}>
          Erősítsd meg a végleges összeget és válaszd ki, melyik kasszából történt a kifizetés.
        </p>

        <div className="form-group">
          <label className="form-label">Tétel</label>
          <input className="form-input" type="text" value={expenseData.description} readOnly disabled />
        </div>

        <div className="form-group">
          <label className="form-label">Végleges Összeg (Ft)</label>
          <input 
            className="form-input" 
            type="number" 
            value={actualAmount} 
            onChange={(e) => setActualAmount(e.target.value)} 
            autoFocus 
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Forrás Kassza</label>
          <select className="form-input" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            <option value="">Válassz kasszát...</option>
            {/* Csak a személyes és közös kasszákból lehet fizetni */}
            {accounts.filter(acc => ['személyes', 'közös', 'vész'].includes(acc.type)).map(acc => (
              <option key={acc.id} value={acc.id}>{acc.name} ({parseFloat(acc.balance).toLocaleString('hu-HU')} Ft)</option>
            ))}
          </select>
        </div>

        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" style={{backgroundColor: 'var(--success)'}} onClick={handleComplete}>Teljesítés</button>
        </div>
      </div>
    </div>
  );
}

export default ExpectedExpenseCompleteModal;