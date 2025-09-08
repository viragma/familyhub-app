import React, { useState, useEffect, useContext, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './FamilyScheduler.css';

const FamilyScheduler = () => {
  const { user, token, apiUrl } = useAuth();
  const { darkMode: isDarkMode } = useTheme();

  // States
  const [schedules, setSchedules] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [view, setView] = useState('week'); // 'day', 'week', 'month'
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedMember, setSelectedMember] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);

  // Beosztás típusok színekkel
  const SCHEDULE_TYPES = {
    morning_shift: { 
      label: 'Reggeli műszak', 
      color: '#FF6B35', 
      icon: '🌅',
      textColor: '#FFFFFF'
    },
    afternoon_shift: { 
      label: 'Délutáni műszak', 
      color: '#4A90E2', 
      icon: '🌞',
      textColor: '#FFFFFF'
    },
    home_office: { 
      label: 'Home office', 
      color: '#7ED321', 
      icon: '🏠',
      textColor: '#FFFFFF'
    },
    school: { 
      label: 'Iskola', 
      color: '#9013FE', 
      icon: '🏫',
      textColor: '#FFFFFF'
    },
    medical: { 
      label: 'Orvos/Fontos', 
      color: '#F5A623', 
      icon: '🏥',
      textColor: '#FFFFFF'
    },
    personal: { 
      label: 'Egyéb/Hobby', 
      color: '#50E3C2', 
      icon: '⚽',
      textColor: '#FFFFFF'
    }
  };

  // Adatok betöltése
  useEffect(() => {
    if (user && token) {
      loadData();
    }
  }, [user, token]);

  const loadData = async () => {
    if (!user || !user.family_id || !token) {
      console.warn('User data or token not available yet');
      return;
    }
    
    try {
      setLoading(true);
      
      const [schedulesRes, membersRes] = await Promise.all([
        fetch(`${apiUrl}/api/time-management/shift-assignments/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/families/${user.family_id}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (schedulesRes.ok) {
        const schedulesData = await schedulesRes.json();
        setSchedules(schedulesData);
      } else {
        console.error('Failed to load schedules:', schedulesRes.status);
      }

      if (membersRes.ok) {
        const membersData = await membersRes.json();
        setFamilyMembers(membersData);
      } else {
        console.error('Failed to load family members:', membersRes.status);
      }
    } catch (err) {
      setError('Hiba az adatok betöltése során');
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper függvény a schedule type meghatározásához
  const getScheduleType = (schedule) => {
    if (schedule.template?.name) {
      // Próbáljuk meg a template name alapján meghatározni a típust
      const name = schedule.template.name.toLowerCase();
      if (name.includes('reggeli') || name.includes('morning')) return 'morning_shift';
      if (name.includes('délutáni') || name.includes('afternoon')) return 'afternoon_shift';
      if (name.includes('home') || name.includes('otthon')) return 'home_office';
      if (name.includes('iskola') || name.includes('school')) return 'school';
      if (name.includes('orvos') || name.includes('doctor')) return 'doctor_visit';
      if (name.includes('sport') || name.includes('training')) return 'sport_training';
      if (name.includes('szabadság') || name.includes('vacation')) return 'vacation';
      if (name.includes('beteg') || name.includes('sick')) return 'sick_leave';
      if (name.includes('egyéb') || name.includes('other')) return 'other';
    }
    return 'morning_shift'; // default
  };

  // Helper függvények
  const getMemberName = (memberId) => {
    const member = familyMembers.find(m => m.id === memberId);
    return member ? (member.display_name || member.name) : null;
  };

  const getMemberColor = (memberId) => {
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
    return colors[memberId % colors.length];
  };

  const formatTime = (timeString) => {
    return timeString?.slice(0, 5) || '';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('hu-HU');
  };

  // Szűrt beosztások
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      if (selectedMember === 'all') return true;
      return schedule.user_id === parseInt(selectedMember);
    });
  }, [schedules, selectedMember]);

  // Dátum navigáció
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + direction);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (view === 'month') {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  // Mai beosztások
  const todaySchedules = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return filteredSchedules.filter(schedule => schedule.date === today);
  }, [filteredSchedules]);

  if (loading) {
    return (
      <div className="family-scheduler">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Beosztások betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`family-scheduler ${isDarkMode ? 'dark' : 'light'}`}>
      {/* Header */}
      <div className="scheduler-header">
        <div className="header-title">
          <h1>📅 Családi Beosztások</h1>
          <p className="header-subtitle">
            {todaySchedules.length > 0 
              ? `${todaySchedules.length} beosztás ma`
              : 'Nincs beosztás ma'
            }
            {familyMembers.length > 0 && ` • ${familyMembers.length} családtag`}
          </p>
        </div>

        {/* Gyors hozzáadás gomb */}
        <button 
          className="quick-add-btn"
          onClick={() => setShowAddModal(true)}
        >
          <span className="btn-icon">➕</span>
          <span>Új beosztás</span>
        </button>
      </div>

      {/* Szűrők és nézet váltás */}
      <div className="scheduler-controls">
        {/* Családtag szűrő */}
        <div className="member-filter">
          <select 
            value={selectedMember} 
            onChange={(e) => setSelectedMember(e.target.value)}
            className="member-select"
          >
            <option value="all">👥 Mindenki</option>
            {familyMembers.length > 0 ? (
              familyMembers.map(member => (
                <option key={member.id} value={member.id}>
                  {member.display_name || member.name}
                </option>
              ))
            ) : (
              <option disabled>Családtagok betöltése...</option>
            )}
          </select>
        </div>

        {/* Nézet váltás */}
        <div className="view-toggle">
          {['day', 'week', 'month'].map(viewType => (
            <button
              key={viewType}
              className={`view-btn ${view === viewType ? 'active' : ''}`}
              onClick={() => setView(viewType)}
            >
              {viewType === 'day' && '📅'}
              {viewType === 'week' && '🗓️'}
              {viewType === 'month' && '📆'}
              <span>
                {viewType === 'day' && 'Nap'}
                {viewType === 'week' && 'Hét'}
                {viewType === 'month' && 'Hónap'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Dátum navigáció */}
      <div className="date-navigation">
        <button className="nav-btn" onClick={() => navigateDate(-1)}>
          ◀️
        </button>
        
        <div className="current-date">
          {view === 'day' && currentDate.toLocaleDateString('hu-HU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
          {view === 'week' && `${currentDate.toLocaleDateString('hu-HU')} hete`}
          {view === 'month' && currentDate.toLocaleDateString('hu-HU', { 
            year: 'numeric', 
            month: 'long' 
          })}
        </div>

        <button className="nav-btn" onClick={() => navigateDate(1)}>
          ▶️
        </button>
      </div>

      {/* Hiba megjelenítés */}
      {error && (
        <div className="error-banner">
          <span>⚠️ {error}</span>
          <button onClick={() => setError('')}>✕</button>
        </div>
      )}

      {/* Nézetek */}
      <div className="scheduler-content">
        {view === 'day' && (
          <DayView 
            currentDate={currentDate}
            schedules={filteredSchedules}
            scheduleTypes={SCHEDULE_TYPES}
            getMemberName={getMemberName}
            getMemberColor={getMemberColor}
            formatTime={formatTime}
            getScheduleType={getScheduleType}
          />
        )}
        
        {view === 'week' && (
          <WeekView 
            currentDate={currentDate}
            schedules={filteredSchedules}
            scheduleTypes={SCHEDULE_TYPES}
            getMemberName={getMemberName}
            getMemberColor={getMemberColor}
            formatTime={formatTime}
            getScheduleType={getScheduleType}
          />
        )}
        
        {view === 'month' && (
          <MonthView 
            currentDate={currentDate}
            schedules={filteredSchedules}
            scheduleTypes={SCHEDULE_TYPES}
            getMemberName={getMemberName}
            getMemberColor={getMemberColor}
            formatTime={formatTime}
            getScheduleType={getScheduleType}
          />
        )}
      </div>

      {/* Hozzáadás Modal */}
      {showAddModal && (
        <AddScheduleModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          scheduleTypes={SCHEDULE_TYPES}
          familyMembers={familyMembers}
          onAdd={(newSchedule) => {
            setSchedules(prev => [...prev, newSchedule]);
            setShowAddModal(false);
          }}
          apiUrl={apiUrl}
          token={token}
        />
      )}
    </div>
  );
};

// Napi nézet komponens
const DayView = ({ currentDate, schedules, scheduleTypes, getMemberName, getMemberColor, formatTime, getScheduleType }) => {
  const daySchedules = schedules.filter(schedule => 
    schedule.date === currentDate.toISOString().split('T')[0]
  );

  return (
    <div className="day-view">
      <div className="day-header">
        <h3>📅 {currentDate.toLocaleDateString('hu-HU', { weekday: 'long' })}</h3>
        <span className="schedule-count">{daySchedules.length} beosztás</span>
      </div>

      <div className="day-schedules">
        {daySchedules.length === 0 ? (
          <div className="no-schedules">
            <span className="empty-icon">📭</span>
            <p>Nincs beosztás erre a napra</p>
          </div>
        ) : (
          daySchedules.map(schedule => (
            <ScheduleCard
              key={schedule.id}
              schedule={schedule}
              scheduleTypes={scheduleTypes}
              getMemberName={getMemberName}
              getMemberColor={getMemberColor}
              formatTime={formatTime}
              getScheduleType={getScheduleType}
            />
          ))
        )}
      </div>
    </div>
  );
};

// Heti nézet komponens
const WeekView = ({ currentDate, schedules, scheduleTypes, getMemberName, getMemberColor, formatTime, getScheduleType }) => {
  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      return day;
    });
  };

  const weekDays = getWeekDays(currentDate);

  return (
    <div className="week-view">
      <div className="week-grid">
        {weekDays.map((day, index) => {
          const daySchedules = schedules.filter(schedule => 
            schedule.date === day.toISOString().split('T')[0]
          );

          return (
            <div key={index} className="week-day">
              <div className="week-day-header">
                <span className="day-name">
                  {day.toLocaleDateString('hu-HU', { weekday: 'short' })}
                </span>
                <span className="day-date">{day.getDate()}</span>
              </div>
              
              <div className="week-day-schedules">
                {daySchedules.slice(0, 3).map(schedule => (
                  <div
                    key={schedule.id}
                    className="week-schedule-item"
                    style={{ 
                      backgroundColor: scheduleTypes[getScheduleType(schedule)]?.color,
                      color: scheduleTypes[getScheduleType(schedule)]?.textColor
                    }}
                  >
                    <span className="schedule-time">
                      {schedule.template?.start_time || '08:00'}
                    </span>
                    <span className="schedule-title">
                      {scheduleTypes[getScheduleType(schedule)]?.icon} {getMemberName(schedule.user_id)}
                    </span>
                  </div>
                ))}
                {daySchedules.length > 3 && (
                  <div className="more-schedules">
                    +{daySchedules.length - 3} további
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Havi nézet komponens
const MonthView = ({ currentDate, schedules, scheduleTypes, getMemberName, getMemberColor, formatTime, getScheduleType }) => {
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    const days = [];
    const startDay = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
    
    // Előző hónap utolsó napjai
    for (let i = startDay - 1; i >= 0; i--) {
      const day = new Date(year, month, -i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    // Aktuális hónap napjai
    for (let i = 1; i <= daysInMonth; i++) {
      const day = new Date(year, month, i);
      days.push({ date: day, isCurrentMonth: true });
    }
    
    // Következő hónap első napjai
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const day = new Date(year, month + 1, i);
      days.push({ date: day, isCurrentMonth: false });
    }
    
    return days;
  };

  const monthDays = getDaysInMonth(currentDate);

  return (
    <div className="month-view">
      <div className="month-header">
        <div className="weekday-labels">
          {['H', 'K', 'Sz', 'Cs', 'P', 'Szo', 'V'].map(day => (
            <div key={day} className="weekday-label">{day}</div>
          ))}
        </div>
      </div>

      <div className="month-grid">
        {monthDays.map((dayObj, index) => {
          const daySchedules = schedules.filter(schedule => 
            schedule.date === dayObj.date.toISOString().split('T')[0]
          );

          return (
            <div 
              key={index} 
              className={`month-day ${!dayObj.isCurrentMonth ? 'other-month' : ''}`}
            >
              <div className="month-day-header">
                <span className="day-number">{dayObj.date.getDate()}</span>
              </div>
              
              <div className="month-day-schedules">
                {daySchedules.slice(0, 2).map(schedule => (
                  <div
                    key={schedule.id}
                    className="month-schedule-dot"
                    style={{ backgroundColor: scheduleTypes[getScheduleType(schedule)]?.color }}
                    title={`${getMemberName(schedule.user_id)} - ${scheduleTypes[getScheduleType(schedule)]?.label}`}
                  />
                ))}
                {daySchedules.length > 2 && (
                  <div className="more-dot" title={`+${daySchedules.length - 2} további`}>
                    •••
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Beosztás kártya komponens
const ScheduleCard = ({ schedule, scheduleTypes, getMemberName, getMemberColor, formatTime, getScheduleType }) => {
  const scheduleType = scheduleTypes[getScheduleType(schedule)];
  
  return (
    <div className="schedule-card">
      <div 
        className="schedule-header"
        style={{ 
          backgroundColor: scheduleType?.color,
          color: scheduleType?.textColor
        }}
      >
        <span className="schedule-icon">{scheduleType?.icon}</span>
        <span className="schedule-type">{scheduleType?.label}</span>
      </div>
      
      <div className="schedule-body">
        <div className="schedule-member">
          <span className="member-icon">👤</span>
          <span>{getMemberName(schedule.user_id)}</span>
        </div>
        
        <div className="schedule-time">
          <span className="time-icon">⏰</span>
          <span>
            {schedule.template?.start_time || '08:00'} - {schedule.template?.end_time || '16:00'}
          </span>
        </div>
        
        {schedule.notes && (
          <div className="schedule-notes">
            <span className="notes-icon">📝</span>
            <span>{schedule.notes}</span>
          </div>
        )}
        
        <div className="schedule-status">
          <span className="status-icon">�</span>
          <span>{schedule.status === 'completed' ? 'Befejezett' : 
                 schedule.status === 'in_progress' ? 'Folyamatban' : 'Tervezett'}</span>
        </div>
      </div>
    </div>
  );
};

// Hozzáadás Modal komponens
const AddScheduleModal = ({ isOpen, onClose, scheduleTypes, familyMembers, onAdd, apiUrl, token }) => {
  const [formData, setFormData] = useState({
    assigned_to: '',
    schedule_type: 'morning_shift',
    due_date: new Date().toISOString().split('T')[0],
    start_time: '08:00',
    end_time: '16:00',
    notes: '',
    status: 'scheduled'
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.assigned_to) return;

    setLoading(true);
    try {
      // Step 1: Create a shift template first
      const templateResponse = await fetch(`${apiUrl}/api/time-management/shift-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: scheduleTypes[formData.schedule_type]?.label || formData.schedule_type,
          start_time: formData.start_time,
          end_time: formData.end_time,
          location: "office",
          color: scheduleTypes[formData.schedule_type]?.color || "#3b82f6",
          description: formData.notes || null,
          is_active: true
        })
      });

      if (!templateResponse.ok) {
        throw new Error('Failed to create template');
      }

      const template = await templateResponse.json();

      // Step 2: Create shift assignment with the template ID
      const assignmentResponse = await fetch(`${apiUrl}/api/time-management/shift-assignments?assigned_to=${parseInt(formData.assigned_to)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          template_id: template.id,
          date: formData.due_date,
          status: formData.status,
          notes: formData.notes
        })
      });

      if (assignmentResponse.ok) {
        const newSchedule = await assignmentResponse.json();
        onAdd(newSchedule);
        onClose();
      } else {
        console.error('Failed to create assignment:', await assignmentResponse.text());
      }
    } catch (err) {
      console.error('Error adding schedule:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>➕ Új beosztás hozzáadása</h3>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={handleSubmit} className="schedule-form">
          <div className="form-group">
            <label>👤 Családtag</label>
            <select
              value={formData.assigned_to}
              onChange={(e) => setFormData(prev => ({ ...prev, assigned_to: e.target.value }))}
              required
            >
              <option value="">Válassz családtagot</option>
              {familyMembers.length > 0 ? (
                familyMembers.map(member => (
                  <option key={member.id} value={member.id}>
                    {member.display_name || member.name}
                  </option>
                ))
              ) : (
                <option disabled>Családtagok betöltése...</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label>🎨 Beosztás típusa</label>
            <div className="type-buttons">
              {Object.entries(scheduleTypes).map(([key, type]) => (
                <button
                  key={key}
                  type="button"
                  className={`type-btn ${formData.schedule_type === key ? 'active' : ''}`}
                  style={{ 
                    backgroundColor: formData.schedule_type === key ? type.color : 'transparent',
                    color: formData.schedule_type === key ? type.textColor : type.color,
                    borderColor: type.color
                  }}
                  onClick={() => setFormData(prev => ({ ...prev, schedule_type: key }))}
                >
                  {type.icon} {type.label}
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>📅 Dátum</label>
            <input
              type="date"
              value={formData.due_date}
              onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>⏰ Kezdés</label>
              <input
                type="time"
                value={formData.start_time}
                onChange={(e) => setFormData(prev => ({ ...prev, start_time: e.target.value }))}
                required
              />
            </div>
            <div className="form-group">
              <label>⏰ Befejezés</label>
              <input
                type="time"
                value={formData.end_time}
                onChange={(e) => setFormData(prev => ({ ...prev, end_time: e.target.value }))}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>📝 Megjegyzés (opcionális)</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="pl. Péterrel egyeztetett, változhat..."
              rows="2"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn">
              Mégse
            </button>
            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? '💾 Mentés...' : '✅ Hozzáadás'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default FamilyScheduler;
