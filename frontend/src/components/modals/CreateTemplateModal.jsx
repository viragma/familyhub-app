import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import './CreateTemplateModal.css';

const CreateTemplateModal = ({ isOpen, onClose, onSuccess }) => {
  const { token, apiUrl } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '09:00',
    end_time: '17:00',
    location: '',
    category: '',
    color: '#6366f1',
    is_recurring: false,
    recurring_days: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const predefinedCategories = [
    'Irodai munka',
    'Ügyfélszolgálat',
    'Karbantartás',
    'Háztartás',
    'Gyerekfelügyelet',
    'Bevásárlás',
    'Takarítás',
    'Kert',
    'Egyéb'
  ];

  const weekDays = [
    { id: 'monday', name: 'Hétfő' },
    { id: 'tuesday', name: 'Kedd' },
    { id: 'wednesday', name: 'Szerda' },
    { id: 'thursday', name: 'Csütörtök' },
    { id: 'friday', name: 'Péntek' },
    { id: 'saturday', name: 'Szombat' },
    { id: 'sunday', name: 'Vasárnap' }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validate time
    if (formData.start_time >= formData.end_time) {
      setError('A kezdő időpont nem lehet későbbi vagy egyenlő a befejező időpontnál');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          category: formData.category || null,
          location: formData.location || null,
          description: formData.description || null
        })
      });

      if (response.ok) {
        const newTemplate = await response.json();
        onSuccess(newTemplate);
        handleClose();
      } else {
        const errorData = await response.json();
        setError(errorData.detail || 'Hiba történt a sablon létrehozásakor');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      start_time: '09:00',
      end_time: '17:00',
      location: '',
      category: '',
      color: '#6366f1',
      is_recurring: false,
      recurring_days: []
    });
    setError('');
    onClose();
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleDayToggle = (dayId) => {
    setFormData(prev => ({
      ...prev,
      recurring_days: prev.recurring_days.includes(dayId)
        ? prev.recurring_days.filter(d => d !== dayId)
        : [...prev.recurring_days, dayId]
    }));
  };

  const getDuration = () => {
    if (formData.start_time && formData.end_time) {
      const start = new Date(`2000-01-01T${formData.start_time}`);
      const end = new Date(`2000-01-01T${formData.end_time}`);
      const diff = (end - start) / (1000 * 60 * 60); // hours
      return diff > 0 ? `${diff} óra` : 'Érvénytelen időtartam';
    }
    return '';
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content large" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Új műszak sablon</h2>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="template-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="name">Sablon neve *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="form-input"
                placeholder="pl. Reggeli műszak"
              />
            </div>

            <div className="form-group">
              <label htmlFor="category">Kategória</label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">Válassz kategóriát...</option>
                {predefinedCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="start_time">Kezdés *</label>
              <input
                type="time"
                id="start_time"
                name="start_time"
                value={formData.start_time}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label htmlFor="end_time">Befejezés *</label>
              <input
                type="time"
                id="end_time"
                name="end_time"
                value={formData.end_time}
                onChange={handleChange}
                required
                className="form-input"
              />
            </div>

            <div className="form-group">
              <label>Időtartam</label>
              <div className="duration-display">
                {getDuration()}
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Helyszín</label>
            <input
              type="text"
              id="location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="form-input"
              placeholder="pl. Iroda, Otthon, Ügyfélnél"
            />
          </div>

          <div className="form-group">
            <label htmlFor="description">Leírás</label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              className="form-textarea"
              placeholder="Részletes leírás a műszakról..."
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="color">Szín</label>
              <div className="color-picker">
                <input
                  type="color"
                  id="color"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="color-input"
                />
                <span className="color-preview" style={{ backgroundColor: formData.color }}></span>
              </div>
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleChange}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                Ismétlődő sablon
              </label>
            </div>
          </div>

          {formData.is_recurring && (
            <div className="form-group">
              <label>Ismétlődés napjai</label>
              <div className="day-selector">
                {weekDays.map(day => (
                  <button
                    key={day.id}
                    type="button"
                    className={`day-btn ${formData.recurring_days.includes(day.id) ? 'selected' : ''}`}
                    onClick={() => handleDayToggle(day.id)}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="template-preview-card">
            <h4>Előnézet</h4>
            <div className="preview-template" style={{ borderLeft: `4px solid ${formData.color}` }}>
              <div className="preview-header">
                <strong>{formData.name || 'Sablon neve'}</strong>
                {formData.category && <span className="preview-category">{formData.category}</span>}
              </div>
              <div className="preview-time">
                {formData.start_time} - {formData.end_time} ({getDuration()})
              </div>
              {formData.location && <div className="preview-location">📍 {formData.location}</div>}
              {formData.description && <div className="preview-description">{formData.description}</div>}
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={handleClose}>
              Mégse
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Létrehozás...' : 'Sablon létrehozása'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateTemplateModal;
