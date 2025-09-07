import React, { useState, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import './CalendarModal.css';

const CalendarModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  onDelete,
  item = null, 
  type = 'event', // 'event', 'shift', 'assignment'
  selectedDate = new Date(),
  familyMembers = [],
  shiftTemplates = []
}) => {
  const { darkMode } = useTheme();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Common fields
    title: '',
    description: '',
    color: '#3b82f6',
    
    // Event fields
    start_time: '',
    end_time: '',
    location: '',
    event_type: 'family',
    involves_members: [],
    is_recurring: false,
    recurrence_pattern: '',
    
    // Shift fields
    name: '',
    start_time_shift: '08:00',
    end_time_shift: '16:00',
    days_of_week: [],
    template_id: '',
    
    // Assignment fields
    due_date: '',
    notes: '',
    status: 'scheduled'
  });

  const colorOptions = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
    '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
    '#6b7280', '#1f2937', '#7c3aed', '#dc2626'
  ];

  const weekDays = [
    { id: 1, name: 'H', fullName: 'Hétfő' },
    { id: 2, name: 'K', fullName: 'Kedd' },
    { id: 3, name: 'Sze', fullName: 'Szerda' },
    { id: 4, name: 'Cs', fullName: 'Csütörtök' },
    { id: 5, name: 'P', fullName: 'Péntek' },
    { id: 6, name: 'Szo', fullName: 'Szombat' },
    { id: 0, name: 'V', fullName: 'Vasárnap' }
  ];

  // Initialize form data when modal opens or item changes
  useEffect(() => {
    if (item) {
      // Edit mode - populate with existing data
      setFormData({
        title: item.title || item.name || '',
        description: item.description || '',
        color: item.color || '#3b82f6',
        start_time: item.start_time || '',
        end_time: item.end_time || '',
        location: item.location || '',
        event_type: item.event_type || 'family',
        involves_members: item.involves_members || [],
        is_recurring: item.is_recurring || false,
        recurrence_pattern: item.recurrence_pattern || '',
        name: item.name || '',
        start_time_shift: item.start_time || '08:00',
        end_time_shift: item.end_time || '16:00',
        days_of_week: item.days_of_week ? 
          (typeof item.days_of_week === 'string' ? 
            item.days_of_week.split(',').map(d => parseInt(d.trim())) : 
            item.days_of_week) : [],
        template_id: item.template_id || '',
        due_date: item.due_date || selectedDate.toISOString().split('T')[0],
        notes: item.notes || '',
        status: item.status || 'scheduled'
      });
    } else {
      // Create mode - use defaults
      const dateStr = selectedDate.toISOString().split('T')[0];
      const timeStr = selectedDate.toTimeString().slice(0, 5);
      
      setFormData({
        title: '',
        description: '',
        color: '#3b82f6',
        start_time: `${dateStr}T${timeStr}`,
        end_time: `${dateStr}T${timeStr}`,
        location: '',
        event_type: 'family',
        involves_members: [],
        is_recurring: false,
        recurrence_pattern: '',
        name: '',
        start_time_shift: '08:00',
        end_time_shift: '16:00',
        days_of_week: [],
        template_id: '',
        due_date: dateStr,
        notes: '',
        status: 'scheduled'
      });
    }
  }, [item, selectedDate]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleDayOfWeek = (dayId) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(dayId)
        ? prev.days_of_week.filter(d => d !== dayId)
        : [...prev.days_of_week, dayId]
    }));
  };

  const toggleMemberSelection = (memberId) => {
    setFormData(prev => ({
      ...prev,
      involves_members: prev.involves_members.includes(memberId)
        ? prev.involves_members.filter(m => m !== memberId)
        : [...prev.involves_members, memberId]
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare data based on type
      let submitData = { ...formData };
      
      if (type === 'shift') {
        submitData = {
          name: formData.name || formData.title,
          start_time: formData.start_time_shift,
          end_time: formData.end_time_shift,
          days_of_week: formData.days_of_week.join(','),
          color: formData.color,
          is_active: true
        };
      } else if (type === 'assignment') {
        submitData = {
          title: formData.title,
          due_date: formData.due_date,
          notes: formData.notes,
          status: formData.status,
          template_id: formData.template_id || null
        };
      } else if (type === 'event') {
        submitData = {
          title: formData.title,
          description: formData.description,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: formData.location,
          event_type: formData.event_type,
          color: formData.color,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.recurrence_pattern,
          involves_members: formData.involves_members
        };
      }
      
      await onSave(submitData, item?.id);
      onClose();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!item?.id) return;
    
    const confirmed = window.confirm('Biztosan törölni szeretnéd?');
    if (!confirmed) return;
    
    setLoading(true);
    try {
      await onDelete(item.id);
      onClose();
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const getTitle = () => {
    const action = item ? 'Szerkesztés' : 'Új';
    const itemType = type === 'shift' ? 'beosztás' : 
                     type === 'assignment' ? 'feladat' : 'esemény';
    return `${action} ${itemType}`;
  };

  return (
    <div className="calendar-modal-overlay" onClick={onClose}>
      <div 
        className={`calendar-modal-content ${darkMode ? 'dark-mode' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="calendar-modal-header">
          <h2 className="calendar-modal-title">{getTitle()}</h2>
          <button className="calendar-modal-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="calendar-modal-body">
            
            {/* Title/Name Field */}
            <div className="calendar-form-group">
              <label className="calendar-form-label">
                {type === 'shift' ? 'Beosztás neve' : 'Cím'}
              </label>
              <input
                type="text"
                className="calendar-form-input"
                value={type === 'shift' ? formData.name : formData.title}
                onChange={(e) => handleInputChange(type === 'shift' ? 'name' : 'title', e.target.value)}
                placeholder={type === 'shift' ? 'pl. Reggeli műszak' : 'pl. Családi program'}
                required
              />
            </div>

            {/* Event-specific fields */}
            {type === 'event' && (
              <>
                <div className="calendar-form-group">
                  <label className="calendar-form-label">Leírás</label>
                  <textarea
                    className="calendar-form-input calendar-form-textarea"
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Esemény részletei..."
                  />
                </div>

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Időpont</label>
                  <div className="calendar-datetime-group">
                    <input
                      type="datetime-local"
                      className="calendar-form-input"
                      value={formData.start_time}
                      onChange={(e) => handleInputChange('start_time', e.target.value)}
                      required
                    />
                    <input
                      type="datetime-local"
                      className="calendar-form-input"
                      value={formData.end_time}
                      onChange={(e) => handleInputChange('end_time', e.target.value)}
                    />
                  </div>
                </div>

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Helyszín</label>
                  <input
                    type="text"
                    className="calendar-form-input"
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    placeholder="pl. Otthon, Park, stb."
                  />
                </div>

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Esemény típusa</label>
                  <select
                    className="calendar-form-input calendar-form-select"
                    value={formData.event_type}
                    onChange={(e) => handleInputChange('event_type', e.target.value)}
                  >
                    <option value="family">Családi</option>
                    <option value="personal">Személyes</option>
                  </select>
                </div>

                {familyMembers.length > 0 && (
                  <div className="calendar-form-group">
                    <label className="calendar-form-label">Résztvevők</label>
                    <div className="calendar-member-chips">
                      {familyMembers.map(member => (
                        <div
                          key={member.id}
                          className={`calendar-member-chip ${
                            formData.involves_members.includes(member.id) ? 'selected' : ''
                          }`}
                          onClick={() => toggleMemberSelection(member.id)}
                        >
                          <div className="calendar-member-avatar">
                            {(member.full_name || member.name || member.username || '?').charAt(0).toUpperCase()}
                          </div>
                          {member.full_name || member.name || member.username}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Shift-specific fields */}
            {type === 'shift' && (
              <>
                <div className="calendar-form-group">
                  <label className="calendar-form-label">Munkaidő</label>
                  <div className="calendar-datetime-group">
                    <input
                      type="time"
                      className="calendar-form-input"
                      value={formData.start_time_shift}
                      onChange={(e) => handleInputChange('start_time_shift', e.target.value)}
                      required
                    />
                    <input
                      type="time"
                      className="calendar-form-input"
                      value={formData.end_time_shift}
                      onChange={(e) => handleInputChange('end_time_shift', e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Munkanapok</label>
                  <div className="calendar-days-selector">
                    {weekDays.map(day => (
                      <button
                        key={day.id}
                        type="button"
                        className={`calendar-day-button ${
                          formData.days_of_week.includes(day.id) ? 'active' : ''
                        }`}
                        onClick={() => toggleDayOfWeek(day.id)}
                        title={day.fullName}
                      >
                        {day.name}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Assignment-specific fields */}
            {type === 'assignment' && (
              <>
                <div className="calendar-form-group">
                  <label className="calendar-form-label">Határidő</label>
                  <input
                    type="date"
                    className="calendar-form-input"
                    value={formData.due_date}
                    onChange={(e) => handleInputChange('due_date', e.target.value)}
                    required
                  />
                </div>

                {shiftTemplates.length > 0 && (
                  <div className="calendar-form-group">
                    <label className="calendar-form-label">Beosztás sablon (opcionális)</label>
                    <select
                      className="calendar-form-input calendar-form-select"
                      value={formData.template_id}
                      onChange={(e) => handleInputChange('template_id', e.target.value)}
                    >
                      <option value="">-- Válassz sablont --</option>
                      {shiftTemplates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} ({template.start_time} - {template.end_time})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Megjegyzések</label>
                  <textarea
                    className="calendar-form-input calendar-form-textarea"
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    placeholder="További információk..."
                  />
                </div>

                <div className="calendar-form-group">
                  <label className="calendar-form-label">Állapot</label>
                  <select
                    className="calendar-form-input calendar-form-select"
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                  >
                    <option value="scheduled">Tervezett</option>
                    <option value="completed">Kész</option>
                    <option value="cancelled">Lemondva</option>
                  </select>
                </div>
              </>
            )}

            {/* Color Picker */}
            <div className="calendar-form-group">
              <label className="calendar-form-label">Szín</label>
              <div className="calendar-color-picker">
                {colorOptions.map(color => (
                  <div
                    key={color}
                    className={`calendar-color-option ${formData.color === color ? 'active' : ''}`}
                    style={{ backgroundColor: color }}
                    onClick={() => handleInputChange('color', color)}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="calendar-modal-actions">
            <button
              type="button"
              className="calendar-button calendar-button-secondary"
              onClick={onClose}
              disabled={loading}
            >
              Mégse
            </button>
            
            {item && onDelete && (
              <button
                type="button"
                className="calendar-button calendar-button-danger"
                onClick={handleDelete}
                disabled={loading}
              >
                Törlés
              </button>
            )}
            
            <button
              type="submit"
              className={`calendar-button calendar-button-primary ${loading ? 'calendar-button-loading' : ''}`}
              disabled={loading}
            >
              {item ? 'Frissítés' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CalendarModal;
