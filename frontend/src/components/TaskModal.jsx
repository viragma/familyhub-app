import React, { useState } from 'react';

function TaskModal({ isOpen, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [reward, setReward] = useState('');

  const handleSave = () => {
    // Alap validáció, hogy a cím ne legyen üres
    if (!title.trim()) {
      alert('A feladat címe nem lehet üres!');
      return;
    }
    
    onSave({
      title,
      owner,
      reward,
      done: false
    });
    
    // Mezők ürítése mentés után
    setTitle('');
    setOwner('');
    setReward('');
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Új Feladat Létrehozása</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label htmlFor="title">Mi a feladat?</label>
          <input 
            id="title" 
            type="text" 
            value={title} 
            onChange={e => setTitle(e.target.value)} 
            placeholder="Pl. Porszívózás"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="owner">Kié a feladat?</label>
          <input 
            id="owner" 
            type="text" 
            value={owner} 
            onChange={e => setOwner(e.target.value)} 
            placeholder="Pl. Peti"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="reward">Mi a jutalom?</label>
          <input 
            id="reward" 
            type="text" 
            value={reward} 
            onChange={e => setReward(e.target.value)} 
            placeholder="Pl. 500 Ft"
          />
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default TaskModal;