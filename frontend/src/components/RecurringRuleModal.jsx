import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function RecurringRuleModal({ isOpen, onClose, onSave, ruleData }) {
  const [formData, setFormData] = useState({});
  const { user, token, apiUrl } = useAuth();

 useEffect(() => {
    if (isOpen) {
      if (ruleData) {
        setFormData({
          description: ruleData.description || '',
          amount: ruleData.amount || '',
          type: ruleData.type || 'kiadás',
          from_account_id: ruleData.from_account_id || '',
          to_account_id: ruleData.to_account_id || '',
          category_id: ruleData.category_id || '',
          frequency: ruleData.frequency || 'havi',
          day_of_month: ruleData.day_of_month || 1,
          day_of_week: ruleData.day_of_week || 1,
          start_date: ruleData.start_date ? new Date(ruleData.start_date).toISOString().split('T')[0] : '',
          end_date: ruleData.end_date ? new Date(ruleData.end_date).toISOString().split('T')[0] : '',
        });
      } else {
        setFormData({}); // Új szabály létrehozásakor üres
      }
    }
    
  }, [isOpen, ruleData]);
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // JAVÍTÁS: Itt alakítjuk át az adatokat a backend által várt formátumra
    const dataToSend = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      from_account_id: formData.from_account_id ? parseInt(formData.from_account_id) : null,
      to_account_id: formData.to_account_id ? parseInt(formData.to_account_id) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      frequency: formData.frequency,
      day_of_month: formData.frequency === 'havi' ? parseInt(formData.day_of_month) : null,
      day_of_week: formData.frequency === 'heti' ? parseInt(formData.day_of_week) : null,
      start_date: formData.start_date,
      end_date: formData.end_date || null,
    };
    onSave(dataToSend);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Szabály Szerkesztése</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <input className="form-input" type="text" name="description" value={formData.description || ''} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Összeg (Ft)</label>
          <input className="form-input" type="number" inputMode="decimal" name="amount" value={formData.amount || ''} onChange={handleChange} />
        </div>
        
        <div className="form-group">
          <label className="form-label">Gyakoriság</label>
          <select className="form-input" name="frequency" value={formData.frequency || 'havi'} onChange={handleChange}>
            <option value="napi">Naponta</option>
            <option value="heti">Hetente</option>
            <option value="havi">Havonta</option>
            <option value="éves">Évente</option>
          </select>
        </div>

        {formData.frequency === 'heti' && (
          <div className="form-group">
            <label className="form-label">A hét napja:</label>
            <select className="form-input" name="dayOfWeek" value={formData.dayOfWeek || '1'} onChange={handleChange}>
              <option value="1">Hétfő</option>
              <option value="2">Kedd</option>
              <option value="3">Szerda</option>
              <option value="4">Csütörtök</option>
              <option value="5">Péntek</option>
              <option value="6">Szombat</option>
              <option value="7">Vasárnap</option>
            </select>
          </div>
        )}

        {formData.frequency === 'havi' && (
          <div className="form-group">
            <label className="form-label">A hónap napja:</label>
            <input className="form-input" type="number" name="dayOfMonth" value={formData.dayOfMonth || '1'} onChange={handleChange} min="1" max="31" />
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Érvényesség Kezdete:</label>
          <input className="form-input" type="date" name="startDate" value={formData.startDate || ''} onChange={handleChange} />
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default RecurringRuleModal;