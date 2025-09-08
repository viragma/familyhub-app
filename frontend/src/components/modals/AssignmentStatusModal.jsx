import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './AssignmentStatusModal.css';

const AssignmentStatusModal = ({ isOpen, onClose, assignment, template, member, onUpdate }) => {
  const { token, apiUrl } = useAuth();
  
  const [status, setStatus] = useState(assignment?.status || 'scheduled');
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'scheduled', label: 'Tervezett', icon: '📅', color: '#6b7280' },
    { value: 'in_progress', label: 'Folyamatban', icon: '⏳', color: '#f59e0b' },
    { value: 'completed', label: 'Befejezett', icon: '✅', color: '#10b981' },
    { value: 'cancelled', label: 'Törölve', icon: '❌', color: '#ef4444' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const updates = {
        status,
        notes: notes || null
      };

      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        onUpdate(updatedAssignment);
        onClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Hiba történt a frissítés során');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    return statusOptions.find(s => s.value === status);
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content status-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Beosztás állapota</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="assignment-info">
          <div className="info-header">
            <h3>{template?.name}</h3>
            <div className="assignment-time">
              {template?.start_time} - {template?.end_time}
            </div>
          </div>
          
          <div className="info-details">
            <div className="detail-item">
              <span className="detail-label">Családtag:</span>
              <span className="detail-value">{member?.full_name || member?.name}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Dátum:</span>
              <span className="detail-value">
                {new Date(assignment.date).toLocaleDateString('hu-HU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {template?.location && (
              <div className="detail-item">
                <span className="detail-label">Helyszín:</span>
                <span className="detail-value">{template.location}</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="status-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Állapot</label>
            <div className="status-options">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`status-option ${status === option.value ? 'selected' : ''}`}
                  onClick={() => setStatus(option.value)}
                  style={{ '--status-color': option.color }}
                >
                  <span className="status-icon">{option.icon}</span>
                  <span className="status-label">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Megjegyzések</label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows="3"
              className="form-textarea"
              placeholder="Opcionális megjegyzések a beosztáshoz..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Mégse
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Frissítés...' : 'Állapot frissítése'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AssignmentStatusModal;
