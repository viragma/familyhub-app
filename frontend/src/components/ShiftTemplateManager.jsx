import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const ShiftTemplateManager = () => {
  const { user, token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [loading, setLoading] = useState(false);

  // Automatikus responsive nézet
  const getInitialViewMode = () => {
    const width = window.innerWidth;
    if (width < 480) {
      return { compact: true, ultraCompact: true };
    } else if (width < 768) {
      return { compact: true, ultraCompact: false };
    } else {
      return { compact: false, ultraCompact: false };
    }
  };
  
  const initialView = getInitialViewMode();
  const [compactView, setCompactView] = useState(initialView.compact);
  const [ultraCompactView, setUltraCompactView] = useState(initialView.ultraCompact);

  const [formData, setFormData] = useState({
    name: '',
    start_time: '',
    end_time: '',
    location: 'office',
    location_details: '',
    color: '#3b82f6',
    description: '',
    is_active: true
  });

  const locationOptions = [
    { value: 'office', label: '🏢 Iroda', icon: '🏢' },
    { value: 'home', label: '🏠 Home Office', icon: '🏠' },
    { value: 'field', label: '🚗 Terepen', icon: '🚗' },
    { value: 'other', label: '📍 Egyéb', icon: '📍' }
  ];

  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b',
    '#8b5cf6', '#06b6d4', '#84cc16', '#f97316'
  ];

  useEffect(() => {
    fetchTemplates();
  }, []);

  // Automatikus responsive nézet váltás
  useEffect(() => {
    const updateViewMode = () => {
      const width = window.innerWidth;
      
      if (width < 480) {
        setUltraCompactView(true);
        setCompactView(true);
      } else if (width < 768) {
        setUltraCompactView(false);
        setCompactView(true);
      } else {
        setUltraCompactView(false);
        setCompactView(false);
      }
    };

    updateViewMode();
    window.addEventListener('resize', updateViewMode);
    return () => window.removeEventListener('resize', updateViewMode);
  }, []);

  const fetchTemplates = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/time-management/shift-templates`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        console.error('Failed to fetch templates:', response.status);
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      const url = editingTemplate 
        ? `http://${window.location.hostname}:8000/api/time-management/shift-templates/${editingTemplate.id}`
        : `http://${window.location.hostname}:8000/api/time-management/shift-templates`;
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        console.log('Template saved successfully');
        await fetchTemplates();
        closeModal();
      } else {
        console.error('Failed to save template:', response.status);
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      start_time: template.start_time,
      end_time: template.end_time,
      location: template.location,
      location_details: template.location_details || '',
      color: template.color,
      description: template.description || '',
      is_active: template.is_active
    });
    setShowModal(true);
  };

  const handleDelete = async (templateId) => {
    if (!token || !window.confirm('Biztosan törölni szeretnéd ezt a sablont?')) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/time-management/shift-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('Template deleted successfully');
        await fetchTemplates();
      } else {
        console.error('Failed to delete template:', response.status);
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const openModal = () => {
    setEditingTemplate(null);
    setFormData({
      name: '',
      start_time: '',
      end_time: '',
      location: 'office',
      location_details: '',
      color: '#3b82f6',
      description: '',
      is_active: true
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingTemplate(null);
  };

  const getLocationDisplay = (location, details) => {
    const option = locationOptions.find(opt => opt.value === location);
    if (location === 'other' && details) {
      return `📍 ${details}`;
    }
    return option ? option.label : location;
  };

  const formatTime = (time) => {
    return time.substring(0, 5);
  };

  return (
    <div className="timemanager-templates-manager">
      <div className="timemanager-templates-header">
        <div className="timemanager-templates-title-section">
          <h2 className="timemanager-templates-title">🏷️ Műszak Sablonok</h2>
          <p className="timemanager-templates-subtitle">Hozz létre és kezelj újrafelhasználható műszak sablonokat</p>
        </div>
        <button className="timemanager-button-primary timemanager-add-template-btn" onClick={openModal}>
          <span className="timemanager-button-icon">✨</span>
          Új Sablon
        </button>
      </div>

      {loading ? (
        <div className="timemanager-loading-state">
          <div className="timemanager-loading-spinner"></div>
          <p className="timemanager-loading-text">Sablonok betöltése...</p>
        </div>
      ) : (
        <div className={`timemanager-templates-grid ${compactView ? 'timemanager-templates-compact' : ''} ${ultraCompactView ? 'timemanager-templates-ultra-compact' : ''}`}>
          {templates.map(template => (
            <div key={template.id} className="timemanager-template-card">
              <div className="timemanager-template-card-header">
                <div className="timemanager-template-color-badge" style={{ backgroundColor: template.color }}>
                  <span className="timemanager-template-color-icon">🏭</span>
                </div>
                <div className="timemanager-template-card-actions">
                  <button 
                    className="timemanager-template-action-btn timemanager-edit-btn" 
                    onClick={() => handleEdit(template)}
                    title="Szerkesztés"
                  >
                    ✏️
                  </button>
                  <button 
                    className="timemanager-template-action-btn timemanager-delete-btn" 
                    onClick={() => handleDelete(template.id)}
                    title="Törlés"
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="timemanager-template-card-body">
                <h3 className="timemanager-template-card-title">
                  {ultraCompactView ? template.name.substring(0, 10) : template.name}
                </h3>
                
                <div className="timemanager-template-details-grid">
                  <div className="timemanager-template-detail-item">
                    <div className="timemanager-template-detail-icon">🕐</div>
                    <div className="timemanager-template-detail-content">
                      {!ultraCompactView && <span className="timemanager-template-detail-label">Időpont</span>}
                      <span className="timemanager-template-detail-value">
                        {formatTime(template.start_time)} - {formatTime(template.end_time)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="timemanager-template-detail-item">
                    <div className="timemanager-template-detail-icon">📍</div>
                    <div className="timemanager-template-detail-content">
                      {!ultraCompactView && <span className="timemanager-template-detail-label">Helyszín</span>}
                      <span className="timemanager-template-detail-value">
                        {ultraCompactView ? 
                          getLocationDisplay(template.location, template.location_details).substring(0, 8) :
                          getLocationDisplay(template.location, template.location_details)
                        }
                      </span>
                    </div>
                  </div>
                  
                  {template.description && !ultraCompactView && (
                    <div className="timemanager-template-detail-item timemanager-template-description">
                      <div className="timemanager-template-detail-icon">📝</div>
                      <div className="timemanager-template-detail-content">
                        <span className="timemanager-template-detail-label">Megjegyzés</span>
                        <span className="timemanager-template-detail-value">{template.description}</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="timemanager-template-card-footer">
                  <div className="timemanager-template-status">
                    <span className={`timemanager-template-status-badge ${template.is_active ? 'timemanager-status-active' : 'timemanager-status-inactive'}`}>
                      {template.is_active ? '✅ Aktív' : '⏸️ Inaktív'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {templates.length === 0 && (
            <div className="timemanager-templates-empty-state">
              <div className="timemanager-empty-icon">🏭</div>
              <h3 className="timemanager-empty-title">Még nincsenek műszak sablonok</h3>
              <p className="timemanager-empty-description">
                Hozd létre az első sablont a gyorsabb műszak beosztásokhoz
              </p>
              <button className="timemanager-button-primary" onClick={openModal}>
                <span className="timemanager-button-icon">✨</span>
                Első sablon létrehozása
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="timemanager-modal-backdrop" onClick={closeModal}>
          <div className="timemanager-modal-container" onClick={e => e.stopPropagation()}>
            <div className="timemanager-modal-header">
              <h3 className="timemanager-modal-title">
                {editingTemplate ? '✏️ Sablon Szerkesztése' : '✨ Új Műszak Sablon'}
              </h3>
              <button className="timemanager-modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="timemanager-form-container">
              <div className="timemanager-form-group">
                <label className="timemanager-form-label">Sablon neve</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="pl. Reggeli műszak"
                  required
                  className="timemanager-form-input"
                />
              </div>

              <div className="timemanager-form-row">
                <div className="timemanager-form-group">
                  <label className="timemanager-form-label">Kezdési idő</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={handleInputChange}
                    required
                    className="timemanager-form-input"
                  />
                </div>
                <div className="timemanager-form-group">
                  <label className="timemanager-form-label">Befejezési idő</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={handleInputChange}
                    required
                    className="timemanager-form-input"
                  />
                </div>
              </div>

              <div className="timemanager-form-group">
                <label className="timemanager-form-label">Helyszín</label>
                <div className="timemanager-location-options">
                  {locationOptions.map(option => (
                    <button
                      key={option.value}
                      type="button"
                      className={`timemanager-location-option ${formData.location === option.value ? 'timemanager-location-active' : ''}`}
                      onClick={() => setFormData(prev => ({ ...prev, location: option.value }))}
                    >
                      <span className="timemanager-location-icon">{option.icon}</span>
                      <span className="timemanager-location-label">{option.label.replace(option.icon + ' ', '')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {formData.location === 'other' && (
                <div className="timemanager-form-group">
                  <label className="timemanager-form-label">Egyéb helyszín</label>
                  <input
                    type="text"
                    name="location_details"
                    value={formData.location_details}
                    onChange={handleInputChange}
                    placeholder="Add meg a helyszín nevét"
                    className="timemanager-form-input"
                  />
                </div>
              )}

              <div className="timemanager-form-group">
                <label className="timemanager-form-label">Leírás (opcionális)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="További részletek a műszakról..."
                  rows="3"
                  className="timemanager-form-textarea"
                />
              </div>

              <div className="timemanager-form-group">
                <label className="timemanager-form-label">Szín</label>
                <div className="timemanager-color-palette">
                  {defaultColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`timemanager-color-swatch ${formData.color === color ? 'timemanager-color-active' : ''}`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                    />
                  ))}
                </div>
              </div>

              <div className="timemanager-form-group">
                <div className="timemanager-checkbox-item">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleInputChange}
                  />
                  <label className="timemanager-checkbox-label">Aktív sablon</label>
                </div>
              </div>

              <div className="timemanager-form-actions">
                <button type="button" className="timemanager-button-secondary" onClick={closeModal}>
                  Mégse
                </button>
                <button type="submit" className="timemanager-button-primary">
                  {editingTemplate ? 'Frissítés' : 'Létrehozás'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShiftTemplateManager;