import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function TransferModal({ isOpen, onClose, onSave, onSaveRecurring, fromAccount }) {
  const [activeTab, setActiveTab] = useState('single');
  const [recipients, setRecipients] = useState([]);

  // Külön state-ek a két fülnek
  const [singleData, setSingleData] = useState({ toAccountId: '', amount: '', description: '' });
  const [recurringData, setRecurringData] = useState({
    toAccountId: '', amount: '', description: '',
    frequency: 'havi', dayOfWeek: '1', dayOfMonth: '1', startDate: new Date().toISOString().split('T')[0]
  });
  
  const { token,apiUrl } = useAuth();


  useEffect(() => {
    const fetchRecipients = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/transfer-recipients`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setRecipients(data.filter(acc => acc.id !== fromAccount?.id));
        } catch (error) { console.error("Hiba a címzettek lekérésekor:", error); }
      }
    };
    fetchRecipients();
  }, [isOpen, token, apiUrl, fromAccount]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('single');
      setSingleData({ toAccountId: '', amount: '', description: '' });
      setRecurringData({
        toAccountId: '', amount: '', description: '',
        frequency: 'havi', dayOfWeek: '1', dayOfMonth: '1', startDate: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen]);

  const handleSave = () => {
    if (activeTab === 'single') {
      if (!fromAccount || !singleData.toAccountId || !singleData.amount) { /* validáció */ return; }
      onSave({
        from_account_id: fromAccount.id, to_account_id: parseInt(singleData.toAccountId),
        amount: parseFloat(singleData.amount), description: singleData.description
      });
    } else { // recurring
      if (!fromAccount || !recurringData.toAccountId || !recurringData.amount) { /* validáció */ return; }
      onSaveRecurring({
        description: recurringData.description, amount: parseFloat(recurringData.amount),
        type: 'átutalás', from_account_id: fromAccount.id, to_account_id: parseInt(recurringData.toAccountId),
        frequency: recurringData.frequency,
        day_of_week: recurringData.frequency === 'heti' ? parseInt(recurringData.dayOfWeek) : null,
        day_of_month: recurringData.frequency === 'havi' ? parseInt(recurringData.dayOfMonth) : null,
        start_date: recurringData.startDate
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Átutalás</h2>
          <p className="auth-subtitle" style={{margin: 0}}>Forrás: {fromAccount?.name}</p>
        </div>
        
        <div className="modal-tabs">
          <button className={`modal-tab ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>Egyszeri Utalás</button>
          <button className={`modal-tab ${activeTab === 'recurring' ? 'active' : ''}`} onClick={() => setActiveTab('recurring')}>Rendszeres</button>
        </div>

        {/* Egyszeri Utalás Fül */}
        <div className={`tab-content ${activeTab === 'single' ? 'active' : ''}`}>
          <div className="form-group"><label className="form-label">Hova</label><select className="form-input" name="toAccountId" value={singleData.toAccountId} onChange={(e) => setSingleData({...singleData, toAccountId: e.target.value})}><option value="">Válassz...</option>{recipients.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Összeg (Ft)</label><input className="form-input" type="number" inputMode="decimal" name="amount" value={singleData.amount} onChange={(e) => setSingleData({...singleData, amount: e.target.value})} autoFocus /></div>
          <div className="form-group"><label className="form-label">Közlemény</label><input className="form-input" type="text" name="description" value={singleData.description} onChange={(e) => setSingleData({...singleData, description: e.target.value})}/></div>
        </div>

        {/* Ismétlődő Fül */}
        <div className={`tab-content ${activeTab === 'recurring' ? 'active' : ''}`}>
          <div className="form-group"><label className="form-label">Hova</label><select className="form-input" name="toAccountId" value={recurringData.toAccountId} onChange={(e) => setRecurringData({...recurringData, toAccountId: e.target.value})}><option value="">Válassz...</option>{recipients.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Összeg (Ft)</label><input className="form-input" type="number" inputMode="decimal" name="amount" value={recurringData.amount} onChange={(e) => setRecurringData({...recurringData, amount: e.target.value})} /></div>
          <div className="form-group"><label className="form-label">Közlemény</label><input className="form-input" type="text" name="description" value={recurringData.description} onChange={(e) => setRecurringData({...recurringData, description: e.target.value})}/></div>
          
          <div className="form-group">
            <label className="form-label">Gyakoriság</label>
            <select className="form-input" name="frequency" value={recurringData.frequency} onChange={(e) => setRecurringData({...recurringData, frequency: e.target.value})}>
              <option value="napi">Naponta</option>
              <option value="heti">Hetente</option>
              <option value="havi">Havonta</option>
              <option value="éves">Évente</option>
            </select>
          </div>
          
          {recurringData.frequency === 'heti' && <div className="form-group"><label className="form-label">A hét napja:</label><select className="form-input" name="dayOfWeek" value={recurringData.dayOfWeek} onChange={(e) => setRecurringData({...recurringData, dayOfWeek: e.target.value})}><option value="1">Hétfő</option><option value="2">Kedd</option><option value="3">Szerda</option><option value="4">Csütörtök</option><option value="5">Péntek</option><option value="6">Szombat</option><option value="7">Vasárnap</option></select></div>}
          {recurringData.frequency === 'havi' && <div className="form-group"><label className="form-label">A hónap napja:</label><input className="form-input" type="number" inputMode="numeric" name="dayOfMonth" value={recurringData.dayOfMonth} onChange={(e) => setRecurringData({...recurringData, dayOfMonth: e.target.value})} min="1" max="31" /></div>}
          
          <div className="form-group"><label className="form-label">Első végrehajtás dátuma:</label><input className="form-input" type="date" name="startDate" value={recurringData.startDate} onChange={(e) => setRecurringData({...recurringData, startDate: e.target.value})} min={new Date().toISOString().split('T')[0]} /></div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default TransferModal;