import React, { useState, useEffect } from 'react';

const suggestedEmojis = [
    { group: 'Otthon és Háztartás', emojis: ['🏠', '🔌', '💧', '🔧', '🛋️', '🧹'] },
    { group: 'Élelmiszer és Bevásárlás', emojis: ['🛒', '🍎', '🥕', '🍞', '🍽️', '☕'] },
    { group: 'Közlekedés', emojis: ['🚗', '🚌', '⛽', '🚲', '✈️', '🚆'] },
    { group: 'Szórakozás és Egészség', emojis: ['🎉', '🍿', '💊', '🏋️', '🎁', '👕'] },
    { group: 'Pénzügyek és Munka', emojis: ['💰', '💼', '📈', '🧾', '🏦', '📎'] },
];

function CategoryModal({ isOpen, onClose, onSave, categoryData = null, parentId = null }) {
  const [formData, setFormData] = useState({ name: '', color: '#818cf8', icon: '' });

  useEffect(() => {
    if (categoryData) {
      setFormData({
        name: categoryData.name || '',
        color: categoryData.color || '#818cf8',
        icon: categoryData.icon || ''
      });
    } else {
      setFormData({ name: '', color: '#818cf8', icon: '' });
    }
  }, [categoryData, isOpen]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });
  const handleSave = () => onSave({ ...formData, parent_id: parentId });
  const handleEmojiClick = (emoji) => setFormData({ ...formData, icon: emoji });

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{categoryData ? 'Kategória Szerkesztése' : 'Új Kategória'}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Név</label>
          <input className="form-input" name="name" value={formData.name} onChange={handleChange} />
        </div>
        
        <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
          <div className="form-group">
            <label className="form-label">Szín</label>
            <input type="color" name="color" value={formData.color} onChange={handleChange} style={{width: '50px', height: '40px', padding: '0.2rem', borderRadius: '8px', border: '1px solid var(--border)'}}/>
          </div>
          <div className="form-group" style={{flexGrow: 1}}>
            <label className="form-label">Ikon (Emoji)</label>
            <input className="form-input" name="icon" value={formData.icon} onChange={handleChange} placeholder="Pl. 🚗 vagy válassz alul" />
          </div>
        </div>
        
        {/* === MEGSZEBBÍTETT IKONVÁLASZTÓ === */}
        <div className="emoji-picker-container">
          <div className="emoji-picker">
            {suggestedEmojis.map(group => (
              <div key={group.group}>
                <h3 className="emoji-group-title">{group.group}</h3>
                <div className="emoji-grid">
                  {group.emojis.map(emoji => (
                    <button key={emoji} className="emoji-btn" onClick={() => handleEmojiClick(emoji)}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}
export default CategoryModal;