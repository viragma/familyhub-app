import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function AccountModal({ isOpen, onClose, onSave, accountData = null }) {
  const [formData, setFormData] = useState({ name: '', type: 'cél', goalAmount: '', goalDate: '', showOnDashboard: false });
  const [viewerIds, setViewerIds] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [monthlySaving, setMonthlySaving] = useState(0);
  const { user, token,apiUrl } = useAuth();


  // Mai dátum meghatározása a dátumválasztó korlátozásához
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const fetchMembers = async () => {
      if (user) {
        try {
          const response = await fetch(`${apiUrl}/api/families/${user.family_id}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setFamilyMembers(await response.json());
        } catch (error) { console.error("Hiba a tagok lekérésekor:", error); }
      }
    };

    if (isOpen) {
      fetchMembers();
    }
  }, [isOpen, user, token, apiUrl]);

  useEffect(() => {
    if (isOpen) {
      if (accountData) {
        // Szerkesztés: adatok betöltése
        setFormData({
          name: accountData.name || '',
          type: accountData.type || 'cél',
          goalAmount: accountData.goal_amount || '',
          goalDate: accountData.goal_date ? new Date(accountData.goal_date).toISOString().split('T')[0] : '',
          showOnDashboard: accountData.show_on_dashboard || false,
        });
        setViewerIds(accountData.viewers.map(v => v.id));
      } else {
        // Új kassza: állapotok alaphelyzetbe állítása
        setFormData({ name: '', type: 'cél', goalAmount: '', goalDate: '', showOnDashboard: false });
        setViewerIds([]);
      }
      setSearchTerm('');
    }
  }, [isOpen, accountData]);

  useEffect(() => {
    if (formData.type === 'cél' && formData.goalAmount > 0 && formData.goalDate) {
      const target = new Date(formData.goalDate);
      const now = new Date();
      if (target <= now) {
        setMonthlySaving(0);
        return;
      }
      const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      setMonthlySaving(months > 0 ? formData.goalAmount / months : parseFloat(formData.goalAmount));
    } else {
      setMonthlySaving(0);
    }
  }, [formData.goalAmount, formData.goalDate, formData.type]);

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    if (!formData.name) {
      alert('A kassza neve nem lehet üres!');
      return;
    }
    // Adatok átalakítása a backend által várt formátumra
    const dataToSend = {
      name: formData.name,
      type: formData.type,
      goal_amount: formData.goalAmount ? parseFloat(formData.goalAmount) : null,
      goal_date: formData.goalDate || null,
      show_on_dashboard: formData.showOnDashboard,
      viewer_ids: viewerIds
    };
    onSave(dataToSend);
  };

  const addViewer = (member) => {
    if (!viewerIds.includes(member.id)) {
      setViewerIds([...viewerIds, member.id]);
    }
    setSearchTerm('');
  };

  const removeViewer = (memberId) => {
    setViewerIds(viewerIds.filter(id => id !== memberId));
  };

  const selectedMembers = familyMembers.filter(m => viewerIds.includes(m.id));
  const suggestedMembers = familyMembers.filter(m => 
    !viewerIds.includes(m.id) && 
    user && m.id !== user.id &&
    m.display_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{accountData ? 'Kassza Szerkesztése' : 'Új Kassza Létrehozása'}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Kassza Neve</label>
          <input className="form-input" type="text" name="name" value={formData.name} onChange={handleFormChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Típus</label>
          <select className="form-input" name="type" value={formData.type} onChange={handleFormChange}>
            <option value="cél">Célkassza</option>
            <option value="vész">Vészkassza</option>
          </select>
        </div>
        
        {formData.type === 'cél' && (
          <>
            <div className="form-group">
              <label className="form-label">Célösszeg (Ft)</label>
              <input className="form-input" type="number" name="goalAmount" value={formData.goalAmount} onChange={handleFormChange} />
            </div>
            <div className="form-group">
              <label className="form-label">Határidő</label>
              <input className="form-input" type="date" name="goalDate" value={formData.goalDate} onChange={handleFormChange} min={today} />
            </div>
            {monthlySaving > 0 && (
              <div className="modal-calculation">
                ℹ️ A cél eléréséhez kb. <strong>{Math.ceil(monthlySaving).toLocaleString('hu-HU')} Ft</strong> félretételére van szükség havonta.
              </div>
            )}
          </>
        )}
        
        <div className="form-group">
          <label className="form-label">Megosztás (kik láthatják még rajtad kívül?)</label>
          <div className="token-input-container">
            <div className="tokens-area">
              {selectedMembers.map(member => (
                <div key={member.id} className="token">
                  <span>{member.display_name}</span>
                  <button className="token-remove-btn" onClick={() => removeViewer(member.id)}>&times;</button>
                </div>
              ))}
            </div>
            <input 
              type="text"
              className="token-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Név beírása a hozzáadáshoz..."
            />
          </div>
          {searchTerm && suggestedMembers.length > 0 && (
            <div className="suggestions-list">
              {suggestedMembers.map(member => (
                <div key={member.id} className="suggestion-item" onClick={() => addViewer(member)}>
                  {member.display_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {user && ['Szülő', 'Családfő'].includes(user.role) && (
          <div className="form-group">
            <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <input type="checkbox" name="showOnDashboard" checked={formData.showOnDashboard} onChange={handleFormChange} />
              Megjelenítés mindenki Dashboardján
            </label>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default AccountModal;