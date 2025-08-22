import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function TransferModal({ isOpen, onClose, onSave, fromAccount }) {
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [recipients, setRecipients] = useState([]);
  const { token } = useAuth();
  const apiUrl = import.meta.env.VITE_API_BASE_URL;

  // Amikor a modal megnyílik, lekérjük a lehetséges címzettek listáját
  useEffect(() => {
    const fetchRecipients = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/transfer-recipients`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          // Kiszűrjük a listából azt a kasszát, ahonnan utalunk
          setRecipients(data.filter(acc => acc.id !== fromAccount?.id));
        } catch (error) {
          console.error("Hiba a címzettek lekérésekor:", error);
        }
      }
    };
    fetchRecipients();
  }, [isOpen, token, apiUrl, fromAccount]);

  // Mezők ürítése, ha a modal állapota változik (bezárul)
  useEffect(() => {
    if (!isOpen) {
      setToAccountId('');
      setAmount('');
      setDescription('');
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!fromAccount || !toAccountId || !amount) {
      alert('Kérlek, tölts ki minden kötelező mezőt!');
      return;
    }
    if (fromAccount.id === parseInt(toAccountId)) {
      alert('A forrás és cél kassza nem lehet ugyanaz!');
      return;
    }
    onSave({
      from_account_id: fromAccount.id,
      to_account_id: parseInt(toAccountId),
      amount: parseFloat(amount),
      description
    });
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Átutalás Kasszák Között</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Honnan</label>
          <input className="form-input" type="text" value={`${fromAccount.name} (${parseFloat(fromAccount.balance).toLocaleString('hu-HU')} Ft)`} disabled />
        </div>

        <div className="form-group">
          <label className="form-label">Hova</label>
          <select className="form-input" value={toAccountId} onChange={e => setToAccountId(e.target.value)}>
            <option value="">Válassz cél kasszát...</option>
            {recipients.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Összeg (Ft)</label>
          <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} />
        </div>

        <div className="form-group">
          <label className="form-label">Közlemény</label>
          <input className="form-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Pl. Zsebpénz" />
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Utalás</button>
        </div>
      </div>
    </div>
  );
}

export default TransferModal;