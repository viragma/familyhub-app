import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function AccountModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('cél');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalDate, setGoalDate] = useState('');
  const [isFamilyWide, setIsFamilyWide] = useState(false);
  const [monthlySaving, setMonthlySaving] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setName('');
      setType('cél');
      setGoalAmount('');
      setGoalDate('');
      setIsFamilyWide(false);
    }
  }, [isOpen]);

  // Valós idejű kalkuláció
  useEffect(() => {
    if (type === 'cél' && goalAmount > 0 && goalDate) {
      const targetDate = new Date(goalDate);
      const today = new Date();
      const monthsLeft = (targetDate.getFullYear() - today.getFullYear()) * 12 + (targetDate.getMonth() - today.getMonth());
      
      if (monthsLeft > 0) {
        setMonthlySaving(goalAmount / monthsLeft);
      } else {
        setMonthlySaving(0);
      }
    } else {
      setMonthlySaving(0);
    }
  }, [goalAmount, goalDate, type]);

  const handleSave = () => {
    if (!name) {
      alert('A kassza neve nem lehet üres!');
      return;
    }
    const accountData = { name, type, is_family_wide: isFamilyWide };
    if (type === 'cél') {
      accountData.goal_amount = parseFloat(goalAmount) || null;
      accountData.goal_date = goalDate || null;
    }
    onSave(accountData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Új Kassza Létrehozása</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Kassza Neve</label>
          <input className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label className="form-label">Típus</label>
          <select className="form-input" value={type} onChange={e => setType(e.target.value)}>
            <option value="cél">Célkassza</option>
            <option value="vész">Vészkassza</option>
          </select>
        </div>
        
        {type === 'cél' && (
          <>
            <div className="form-group">
              <label className="form-label">Célösszeg (Ft)</label>
              <input className="form-input" type="number" value={goalAmount} onChange={e => setGoalAmount(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Határidő</label>
              <input className="form-input" type="date" value={goalDate} onChange={e => setGoalDate(e.target.value)} />
            </div>
            {monthlySaving > 0 && (
              <div className="modal-calculation">
                ℹ️ A cél eléréséhez kb. <strong>{Math.ceil(monthlySaving).toLocaleString('hu-HU')} Ft</strong> félretételére van szükség havonta.
              </div>
            )}
          </>
        )}

        {user && ['Szülő', 'Családfő'].includes(user.role) && (
             <div className="form-group">
                <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                    <input type="checkbox" checked={isFamilyWide} onChange={e => setIsFamilyWide(e.target.checked)} />
                    Mindenki láthassa (családi cél/kassza)
                </label>
            </div>
        )}
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Létrehozás</button>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;