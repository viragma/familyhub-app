import React, { useState, useEffect } from 'react';

function UserModal({ isOpen, onClose, onSave, userData = null }) {
  const [formData, setFormData] = useState({
    name: '', display_name: '', role: 'Gyerek', pin: '', email: ''
  });

  // Ha a modal kap 'userData'-t (szerkesztés), töltsük fel az űrlapot
  useEffect(() => {
    if (userData) {
      setFormData({
        name: userData.name || '',
        display_name: userData.display_name || '',
        role: userData.role || 'Gyerek',
        pin: '', // A PIN-t biztonsági okokból sosem töltjük vissza
        email: userData.email || ''
      });
    } else {
      // Ha új felhasználót hozunk létre, ürítsük az űrlapot
      setFormData({ name: '', display_name: '', role: 'Gyerek', pin: '', email: '' });
    }
  }, [userData, isOpen]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = () => {
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{userData ? 'Tag Szerkesztése' : 'Új Tag Hozzáadása'}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Teljes Név</label>
          <input className="form-input" name="name" value={formData.name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Megjelenítendő Név</label>
          <input className="form-input" name="display_name" value={formData.display_name} onChange={handleChange} />
        </div>
        <div className="form-group">
          <label className="form-label">Szerepkör</label>
          <select className="form-input" name="role" value={formData.role} onChange={handleChange}>
            <option value="Szülő">Családfő</option>
            <option value="Szülő">Szülő</option>
            <option value="Tizenéves">Tizenéves</option>
            <option value="Gyerek">Gyerek</option>
          </select>
        </div>
        {/* A PIN mező csak új felhasználó esetén kötelező/látható */}
        {!userData && (
          <div className="form-group">
            <label className="form-label">4-jegyű PIN</label>
            <input className="form-input" name="pin" type="password" value={formData.pin} onChange={handleChange} maxLength="4" />
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

export default UserModal;