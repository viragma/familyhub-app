import React, { useState } from 'react';

function ApprovalModal({ isOpen, onClose, onDecision, wish }) {
  const [feedback, setFeedback] = useState('');
  const [status, setStatus] = useState('approved');
  const [conditionalNote, setConditionalNote] = useState('');

  if (!isOpen) return null;

  const handleDecision = () => {
    onDecision(wish.id, {
      status,
      feedback,
      conditional_note: conditionalNote,
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Döntés a kívánságról</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        
        <div className="wish-preview">
            <h4>{wish.name}</h4>
            <p>{wish.description}</p>
            <strong>{parseFloat(wish.estimated_price).toLocaleString('hu-HU')} Ft</strong>
        </div>

        <div className="form-group">
            <label className="form-label">Döntés</label>
            <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="approved">Jóváhagyom</option>
                <option value="conditional">Feltételes jóváhagyás</option>
                <option value="modifications_requested">Módosítást kérek</option>
                <option value="rejected">Elutasítom</option>
            </select>
        </div>
        
        {status === 'conditional' && (
            <div className="form-group">
                <label className="form-label">Feltétel (pl. "Karácsonyra")</label>
                <input type="text" className="form-input" value={conditionalNote} onChange={(e) => setConditionalNote(e.target.value)} />
            </div>
        )}

        <div className="form-group">
            <label className="form-label">Visszajelzés (opcionális)</label>
            <textarea className="form-input" rows="3" value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Indoklás..."></textarea>
        </div>

        <div className="modal-actions">
          <button onClick={onClose} className="btn btn-secondary">Mégse</button>
          <button onClick={handleDecision} className="btn btn-primary">Döntés elküldése</button>
        </div>
      </div>
    </div>
  );
}

export default ApprovalModal;