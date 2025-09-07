import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ShiftTemplateManager from './ShiftTemplateManager';
import MonthlyScheduleManager from './MonthlyScheduleManager';
import FamilyCalendar from './FamilyCalendar';
import './TimeManager.css';

const TimeManagement = () => {
  const { user, token } = useAuth();
  const { darkMode } = useTheme();
  const [activeTab, setActiveTab] = useState('overview');
  const [shiftSubTab, setShiftSubTab] = useState('templates');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('shift');

  const [formData, setFormData] = useState({
    // Shift fields
    name: '',
    start_time: '',
    end_time: '',
    days_of_week: [],
    color: '#3b82f6',
    is_active: true,
    
    // FamilyEvent fields
    title: '',
    description: '',
    event_type: 'family',
    start_time_datetime: '',
    end_time_datetime: '',
    location: '',
    is_recurring: false,
    recurrence_pattern: '',
    involves_members: []
  });
  
  const [editingItem, setEditingItem] = useState(null);
  
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!token || !user) return;
    
    setLoading(true);
    try {
      const baseUrl = `http://${window.location.hostname}:8000`;
      
      // Fetch shifts
      const shiftsResponse = await fetch(`${baseUrl}/api/time-management/shifts`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch events
      const eventsResponse = await fetch(`${baseUrl}/api/time-management/events`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch family members
      const familyResponse = await fetch(`${baseUrl}/api/families/${user.family_id}/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch shift assignments (for assignments data) - Use family endpoint to get all family assignments
      const assignmentsResponse = await fetch(`${baseUrl}/api/time-management/shift-assignments/family`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      // Fetch shift templates
      const templatesResponse = await fetch(`${baseUrl}/api/time-management/shift-templates/family`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (shiftsResponse.ok) {
        const shiftsData = await shiftsResponse.json();
        setShifts(shiftsData);
        console.log('Shifts loaded:', shiftsData);
      } else {
        console.error('Failed to fetch shifts:', shiftsResponse.status);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
        console.log('Events loaded:', eventsData);
      } else {
        console.error('Failed to fetch events:', eventsResponse.status);
      }

      if (familyResponse.ok) {
        const familyData = await familyResponse.json();
        setFamilyMembers(familyData);
        console.log('Family members loaded:', familyData);
      } else {
        console.error('Failed to fetch family members:', familyResponse.status);
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData);
        console.log('Assignments loaded:', assignmentsData);
        console.log('Assignment count:', assignmentsData.length);
        if (assignmentsData.length > 0) {
          console.log('First assignment example:', assignmentsData[0]);
        }
      } else {
        console.error('Failed to fetch assignments:', assignmentsResponse.status);
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setShiftTemplates(templatesData);
        console.log('Shift templates loaded:', templatesData);
      } else {
        console.error('Failed to fetch shift templates:', templatesResponse.status);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    activeShifts: shifts.filter(shift => shift.is_active).length,
    totalEvents: events.length,
    todayShifts: (() => {
      const todayDayOfWeek = new Date().getDay();
      return shifts.filter(shift => 
        shift.is_active && shift.days_of_week?.split(',').includes(todayDayOfWeek.toString())
      ).length;
    })()
  };

  const openModal = (type) => {
    setModalType(type);
    setEditingItem(null);
    
    if (type === 'shift') {
      setFormData({
        name: '',
        start_time: '',
        end_time: '',
        days_of_week: [],
        color: '#3b82f6',
        is_active: true,
        title: '',
        description: '',
        event_type: 'family',
        start_time_datetime: '',
        end_time_datetime: '',
        location: '',
        is_recurring: false,
        recurrence_pattern: '',
        involves_members: []
      });
    } else if (type === 'event') {
      setFormData({
        name: '',
        start_time: '',
        end_time: '',
        days_of_week: [],
        color: '#3b82f6',
        is_active: true,
        title: '',
        description: '',
        event_type: 'family',
        start_time_datetime: '',
        end_time_datetime: '',
        location: '',
        is_recurring: false,
        recurrence_pattern: '',
        involves_members: []
      });
    }
    
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingItem(null);
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name === 'days_of_week') {
      const dayValue = parseInt(value);
      setFormData(prev => {
        const currentDays = prev.days_of_week || [];
        const newDays = checked 
          ? [...currentDays, dayValue]
          : currentDays.filter(day => day !== dayValue);
        return { ...prev, days_of_week: newDays };
      });
    } else if (name === 'involves_members') {
      const memberValue = parseInt(value);
      setFormData(prev => {
        const currentMembers = prev.involves_members || [];
        const newMembers = checked 
          ? [...currentMembers, memberValue]
          : currentMembers.filter(member => member !== memberValue);
        return { ...prev, involves_members: newMembers };
      });
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!token) return;

    try {
      const baseUrl = `http://${window.location.hostname}:8000`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let response;
      
      if (modalType === 'shift') {
        const shiftData = {
          name: formData.name,
          start_time: formData.start_time,
          end_time: formData.end_time,
          days_of_week: formData.days_of_week.join(','),
          color: formData.color,
          is_active: formData.is_active
        };

        if (editingItem) {
          response = await fetch(`${baseUrl}/api/time-management/shifts/${editingItem.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(shiftData)
          });
        } else {
          response = await fetch(`${baseUrl}/api/time-management/shifts`, {
            method: 'POST',
            headers,
            body: JSON.stringify(shiftData)
          });
        }
      } else if (modalType === 'event') {
        const eventData = {
          title: formData.title,
          description: formData.description,
          event_type: formData.event_type,
          start_time: formData.start_time_datetime,
          end_time: formData.end_time_datetime,
          location: formData.location,
          color: formData.color,
          is_recurring: formData.is_recurring,
          recurrence_pattern: formData.recurrence_pattern,
          involves_members: formData.involves_members.length > 0 ? formData.involves_members.join(',') : null
        };

        if (editingItem) {
          response = await fetch(`${baseUrl}/api/time-management/events/${editingItem.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(eventData)
          });
        } else {
          response = await fetch(`${baseUrl}/api/time-management/events`, {
            method: 'POST',
            headers,
            body: JSON.stringify(eventData)
          });
        }
      }

      if (response && response.ok) {
        await fetchData();
        closeModal();
      } else {
        console.error('Failed to save:', response?.status);
      }
    } catch (error) {
      console.error('Error saving:', error);
    }
  };

  const handleDelete = async () => {
    if (!editingItem || !token) return;
    
    if (!confirm('Biztosan törölni szeretnéd ezt az elemet?')) return;

    try {
      const baseUrl = `http://${window.location.hostname}:8000`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      let response;
      
      if (modalType === 'shift') {
        response = await fetch(`${baseUrl}/api/time-management/shifts/${editingItem.id}`, {
          method: 'DELETE',
          headers
        });
      } else if (modalType === 'event') {
        response = await fetch(`${baseUrl}/api/time-management/events/${editingItem.id}`, {
          method: 'DELETE',
          headers
        });
      }

      if (response && response.ok) {
        await fetchData();
        closeModal();
      } else {
        console.error('Failed to delete:', response?.status);
      }
    } catch (error) {
      console.error('Error deleting:', error);
    }
  };

  const handleEventClick = (event) => {
    setEditingItem(event);
    setModalType('event');
    setFormData({
      title: event.title || '',
      description: event.description || '',
      event_type: event.event_type || 'family',
      start_time_datetime: event.start_time ? new Date(event.start_time).toISOString().slice(0, 16) : '',
      end_time_datetime: event.end_time ? new Date(event.end_time).toISOString().slice(0, 16) : '',
      location: event.location || '',
      color: event.color || '#10b981',
      is_recurring: event.is_recurring || false,
      recurrence_pattern: event.recurrence_pattern || '',
      involves_members: event.involves_members ? event.involves_members.split(',').map(id => parseInt(id.trim())) : []
    });
    setShowModal(true);
  };

  const handleShiftClick = (shift) => {
    setEditingItem(shift);
    setModalType('shift');
    setFormData({
      name: shift.name || '',
      start_time: shift.start_time || '',
      end_time: shift.end_time || '',
      days_of_week: shift.days_of_week ? shift.days_of_week.split(',').map(d => parseInt(d.trim())) : [],
      color: shift.color || '#3b82f6',
      is_active: shift.is_active !== false
    });
    setShowModal(true);
  };

  const handleDayClick = (date) => {
    setEditingItem(null);
    setModalType('event');
    const dateStr = date.toISOString().slice(0, 10);
    setFormData({
      title: '',
      description: '',
      event_type: 'family',
      start_time_datetime: `${dateStr}T09:00`,
      end_time_datetime: `${dateStr}T10:00`,
      location: '',
      color: '#10b981',
      is_recurring: false,
      recurrence_pattern: '',
      involves_members: []
    });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="timemanager-loading-container">
        <div className="timemanager-loading-spinner"></div>
        <p>Adatok betöltése...</p>
      </div>
    );
  }

  return (
    <div className={`timemanager-container ${darkMode ? 'dark-mode' : ''}`}>
      <div className="timemanager-wrapper">
        {/* Header */}
        <div className="timemanager-header">
          <h2 className="timemanager-title">Időmenedzsment</h2>
          <div className="timemanager-actions">
            <button 
              className="timemanager-add-button timemanager-shift-button"
              onClick={() => openModal('shift')}
            >
              + Műszak
            </button>
            <button 
              className="timemanager-add-button timemanager-event-button"
              onClick={() => openModal('event')}
            >
              + Esemény
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="timemanager-stats-grid">
          <div className="timemanager-stat-card">
            <h4>Aktív Műszakok</h4>
            <p className="timemanager-stat-number">{stats.activeShifts}</p>
          </div>
          <div className="timemanager-stat-card">
            <h4>Összes Esemény</h4>
            <p className="timemanager-stat-number">{stats.totalEvents}</p>
          </div>
          <div className="timemanager-stat-card">
            <h4>Mai Műszakok</h4>
            <p className="timemanager-stat-number">{stats.todayShifts}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="timemanager-tab-navigation">
          <button
            className={`timemanager-tab-button ${activeTab === 'overview' ? 'timemanager-tab-active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Áttekintés
          </button>
          <button
            className={`timemanager-tab-button ${activeTab === 'shift-management' ? 'timemanager-tab-active' : ''}`}
            onClick={() => setActiveTab('shift-management')}
          >
            🏭 Műszakkezelés
          </button>
        </div>

        {/* Tab Content */}
        <div className="timemanager-tab-content-area">
          {activeTab === 'overview' && (
            <div className="overview-content">
              <FamilyCalendar 
                events={events}
                shifts={shifts}
                shiftTemplates={shiftTemplates}
                assignments={assignments}
                familyMembers={familyMembers}
                onNavigate={(date) => setCurrentDate(date)}
                currentDate={currentDate}
                onEventClick={handleEventClick}
                onShiftClick={handleShiftClick}
                onAssignmentClick={(assignment) => console.log('Assignment clicked:', assignment)}
                onDayClick={handleDayClick}
              />
            </div>
          )}
          {activeTab === 'shift-management' && (
            <ShiftManagementTab 
              shiftSubTab={shiftSubTab}
              setShiftSubTab={setShiftSubTab}
            />
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <ShiftEventModal
            modalType={modalType}
            editingItem={editingItem}
            formData={formData}
            onInputChange={handleInputChange}
            onSubmit={handleSubmit}
            onClose={closeModal}
            onDelete={handleDelete}
          />
        )}
      </div>
    </div>
  );
};

// Shift Management Tab Component (kombinált tab sub-tabokkal)
const ShiftManagementTab = ({ shiftSubTab, setShiftSubTab }) => {
  return (
    <div className="timemanager-shift-management-wrapper">
      {/* Sub-tab Navigation */}
      <div className="timemanager-subtab-navigation">
        <button
          className={`timemanager-subtab-button ${shiftSubTab === 'templates' ? 'timemanager-subtab-active' : ''}`}
          onClick={() => setShiftSubTab('templates')}
        >
          🏷️ Műszak Sablonok
        </button>
        <button
          className={`timemanager-subtab-button ${shiftSubTab === 'schedule' ? 'timemanager-subtab-active' : ''}`}
          onClick={() => setShiftSubTab('schedule')}
        >
          📅 Havi Beosztás
        </button>
      </div>

      {/* Sub-tab Content */}
      <div className="timemanager-subtab-content">
        {shiftSubTab === 'templates' && <ShiftTemplateManager />}
        {shiftSubTab === 'schedule' && <MonthlyScheduleManager />}
      </div>
    </div>
  );
};

// Shift Event Modal Component
const ShiftEventModal = ({ modalType, editingItem, formData, onInputChange, onSubmit, onClose, onDelete }) => {
  const weekDays = [
    { id: 1, name: 'Hétfő' },
    { id: 2, name: 'Kedd' },
    { id: 3, name: 'Szerda' },
    { id: 4, name: 'Csütörtök' },
    { id: 5, name: 'Péntek' },
    { id: 6, name: 'Szombat' },
    { id: 0, name: 'Vasárnap' }
  ];

  return (
    <div className="timemanager-modal-overlay" onClick={onClose}>
      <div className="timemanager-modal-content" onClick={(e) => e.stopPropagation()}>
        <h3 className="timemanager-modal-title">
          {editingItem ? 'Szerkesztés' : `Új ${modalType === 'shift' ? 'Műszak' : 'Esemény'}`}
        </h3>
        
        <form onSubmit={onSubmit} className="timemanager-modal-form">
          {modalType === 'shift' && (
            <>
              <div className="timemanager-form-group">
                <label>Műszak neve:</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onInputChange}
                  required
                />
              </div>
              
              <div className="timemanager-form-row">
                <div className="timemanager-form-group">
                  <label>Kezdés:</label>
                  <input
                    type="time"
                    name="start_time"
                    value={formData.start_time}
                    onChange={onInputChange}
                    required
                  />
                </div>
                <div className="timemanager-form-group">
                  <label>Befejezés:</label>
                  <input
                    type="time"
                    name="end_time"
                    value={formData.end_time}
                    onChange={onInputChange}
                    required
                  />
                </div>
              </div>

              <div className="timemanager-form-group">
                <label>Hét napjai:</label>
                <div className="timemanager-weekdays-selection">
                  {weekDays.map(day => (
                    <label key={day.id} className="timemanager-weekday-checkbox">
                      <input
                        type="checkbox"
                        name="days_of_week"
                        value={day.id}
                        checked={formData.days_of_week.includes(day.id)}
                        onChange={onInputChange}
                      />
                      {day.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="timemanager-form-row">
                <div className="timemanager-form-group">
                  <label>Szín:</label>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={onInputChange}
                  />
                </div>
                <div className="timemanager-form-group">
                  <label className="timemanager-checkbox-label">
                    <input
                      type="checkbox"
                      name="is_active"
                      checked={formData.is_active}
                      onChange={onInputChange}
                    />
                    Aktív
                  </label>
                </div>
              </div>
            </>
          )}

          {modalType === 'event' && (
            <>
              <div className="timemanager-form-group">
                <label>Esemény címe:</label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={onInputChange}
                  required
                />
              </div>
              
              <div className="timemanager-form-group">
                <label>Leírás:</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={onInputChange}
                  rows="3"
                />
              </div>

              <div className="timemanager-form-row">
                <div className="timemanager-form-group">
                  <label>Kezdés:</label>
                  <input
                    type="datetime-local"
                    name="start_time_datetime"
                    value={formData.start_time_datetime}
                    onChange={onInputChange}
                    required
                  />
                </div>
                <div className="timemanager-form-group">
                  <label>Befejezés:</label>
                  <input
                    type="datetime-local"
                    name="end_time_datetime"
                    value={formData.end_time_datetime}
                    onChange={onInputChange}
                  />
                </div>
              </div>

              <div className="timemanager-form-group">
                <label>Helyszín:</label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={onInputChange}
                />
              </div>

              <div className="timemanager-form-row">
                <div className="timemanager-form-group">
                  <label>Szín:</label>
                  <input
                    type="color"
                    name="color"
                    value={formData.color}
                    onChange={onInputChange}
                  />
                </div>
                <div className="timemanager-form-group">
                  <label className="timemanager-checkbox-label">
                    <input
                      type="checkbox"
                      name="is_recurring"
                      checked={formData.is_recurring}
                      onChange={onInputChange}
                    />
                    Ismétlődő esemény
                  </label>
                </div>
              </div>

              {formData.is_recurring && (
                <div className="timemanager-form-group">
                  <label>Ismétlődési minta:</label>
                  <select
                    name="recurrence_pattern"
                    value={formData.recurrence_pattern}
                    onChange={onInputChange}
                  >
                    <option value="">Válassz mintát</option>
                    <option value="daily">Naponta</option>
                    <option value="weekly">Hetente</option>
                    <option value="monthly">Havonta</option>
                    <option value="yearly">Évente</option>
                  </select>
                </div>
              )}
            </>
          )}
          
          <div className="timemanager-modal-actions">
            <button type="button" onClick={onClose} className="timemanager-cancel-button">
              Mégse
            </button>
            {editingItem && (
              <button type="button" onClick={onDelete} className="timemanager-delete-button">
                Törlés
              </button>
            )}
            <button type="submit" className="timemanager-save-button">
              {editingItem ? 'Frissítés' : 'Mentés'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TimeManagement;
