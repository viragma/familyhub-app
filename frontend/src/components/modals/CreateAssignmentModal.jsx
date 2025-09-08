import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CreateAssignmentModal.css';

const CreateAssignmentModal = ({ isOpen, onClose, onSuccess, familyMembers, shiftTemplates, selectedDate = null }) => {
  const { token, apiUrl } = useAuth();
  
  const [formData, setFormData] = useState({
    user_id: '',
    template_id: '',
    date: selectedDate ? selectedDate.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    status: 'scheduled',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (selectedDate) {
      setFormData(prev => ({
        ...prev,
        date: selectedDate.toISOString().split('T')[0]
      }));
    }
  }, [selectedDate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          user_id: parseInt(formData.user_id),
          template_id: parseInt(formData.template_id)
        })
      });

      if (response.ok) {
        const newAssignment = await response.json();
        onSuccess(newAssignment);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Hiba történt a beosztás létrehozásakor');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      user_id: '',
      template_id: '',
      date: new Date().toISOString().split('T')[0],
      status: 'scheduled',
      notes: ''
    });
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (!isOpen) return null;

  const selectedTemplate = shiftTemplates.find(t => t.id === parseInt(formData.template_id));

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Új beosztás létrehozása</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="assignment-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="user_id">Családtag *</label>
            <select
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Válassz családtagot...</option>
              {familyMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.full_name || member.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="template_id">Műszak sablon *</label>
            <select
              id="template_id"
              name="template_id"
              value={formData.template_id}
              onChange={handleChange}
              required
              className="form-select"
            >
              <option value="">Válassz sablont...</option>
              {shiftTemplates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.start_time} - {template.end_time})
                </option>
              ))}
            </select>
          </div>

          {selectedTemplate && (
            <div className="template-preview">
              <h4>Sablon részletek:</h4>
              <div className="preview-details">
                <div><strong>Időpont:</strong> {selectedTemplate.start_time} - {selectedTemplate.end_time}</div>
                {selectedTemplate.location && <div><strong>Helyszín:</strong> {selectedTemplate.location}</div>}
                {selectedTemplate.category && <div><strong>Kategória:</strong> {selectedTemplate.category}</div>}
                {selectedTemplate.description && <div><strong>Leírás:</strong> {selectedTemplate.description}</div>}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="date">Dátum *</label>
            <input
              type="date"
              id="date"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="status">Állapot</label>
            <select
              id="status"
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="form-select"
            >
              <option value="scheduled">Tervezett</option>
              <option value="in_progress">Folyamatban</option>
              <option value="completed">Befejezett</option>
              <option value="cancelled">Törölve</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="notes">Megjegyzések</label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows="3"
              className="form-textarea"
              placeholder="Opcionális megjegyzések..."
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Mégse
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Létrehozás...' : 'Létrehozás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateAssignmentModal;
