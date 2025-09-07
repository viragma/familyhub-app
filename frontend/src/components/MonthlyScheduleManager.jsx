import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const MonthlyScheduleManager = () => {
  const { user, token } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [monthlySchedule, setMonthlySchedule] = useState(null);
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar', 'list', 'week'

  // Automatikus responsive nézet
  const getInitialViewMode = () => {
    const width = window.innerWidth;
    if (width < 480) {
      return { compact: true, ultraCompact: true, mode: 'list' };
    } else if (width < 768) {
      return { compact: true, ultraCompact: false, mode: 'week' };
    } else {
      return { compact: false, ultraCompact: false, mode: 'calendar' };
    }
  };
  
  const initialView = getInitialViewMode();
  const [compactView, setCompactView] = useState(initialView.compact);
  const [ultraCompactView, setUltraCompactView] = useState(initialView.ultraCompact);

  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  const dayNames = ['Hét', 'Ked', 'Sze', 'Csü', 'Pén', 'Szo', 'Vas'];

  // Helper függvények
  const isToday = (dateStr) => {
    const today = new Date();
    const date = new Date(dateStr);
    return date.toDateString() === today.toDateString();
  };

  const isWeekend = (dateStr) => {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 || day === 6; // vasárnap vagy szombat
  };

  const getWeeksInMonth = (entries) => {
    const weeks = [];
    let currentWeek = [];
    
    // Első nap hétfővel való kezdéséhez
    const firstEntry = entries[0];
    if (firstEntry) {
      const firstDate = new Date(firstEntry.date);
      const firstDayOfWeek = (firstDate.getDay() + 6) % 7; // Hétfő = 0
      
      // Üres cellák hozzáadása a hét elejéhez
      for (let i = 0; i < firstDayOfWeek; i++) {
        currentWeek.push(null);
      }
    }
    
    entries.forEach((entry, index) => {
      currentWeek.push(entry);
      
      // Ha a hét vége (vasárnap) vagy az utolsó nap
      const date = new Date(entry.date);
      const dayOfWeek = (date.getDay() + 6) % 7; // Hétfő = 0, Vasárnap = 6
      
      if (dayOfWeek === 6 || index === entries.length - 1) {
        // Üres cellák hozzáadása a hét végéhez
        while (currentWeek.length < 7) {
          currentWeek.push(null);
        }
        weeks.push([...currentWeek]);
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const getWeekDays = (weekOffset = 0) => {
    const today = new Date();
    const currentWeekStart = new Date(today);
    currentWeekStart.setDate(today.getDate() - (today.getDay() + 6) % 7 + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      weekDays.push(day);
    }
    return weekDays;
  };

  useEffect(() => {
    fetchTemplates();
    fetchMonthlySchedule();
  }, [currentMonth, currentYear]);

  // Automatikus responsive nézet váltás
  useEffect(() => {
    const updateViewMode = () => {
      const width = window.innerWidth;
      
      if (width < 480) {
        setUltraCompactView(true);
        setCompactView(true);
        setViewMode('list');
      } else if (width < 768) {
        setUltraCompactView(false);
        setCompactView(true);
        setViewMode('week');
      } else {
        setUltraCompactView(false);
        setCompactView(false);
        setViewMode('calendar');
      }
    };

    updateViewMode();
    window.addEventListener('resize', updateViewMode);
    return () => window.removeEventListener('resize', updateViewMode);
  }, []);

  const fetchTemplates = async () => {
    if (!token) return;
    
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
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
    }
  };

  const fetchMonthlySchedule = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/time-management/monthly-schedule/${currentMonth}/${currentYear}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMonthlySchedule(data);
        console.log('Monthly schedule loaded:', data);
      } else {
        console.error('Failed to fetch monthly schedule:', response.status);
      }
    } catch (error) {
      console.error('Error fetching monthly schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const assignShiftToDate = async (templateId, date) => {
    if (!token) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/time-management/shift-assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: templateId,
          date: date,
          status: 'scheduled'
        })
      });

      if (response.ok) {
        console.log('Shift assigned successfully');
        await fetchMonthlySchedule();
        setShowAssignModal(false);
      } else {
        console.error('Failed to assign shift:', response.status);
      }
    } catch (error) {
      console.error('Error assigning shift:', error);
    }
  };

  const removeAssignment = async (assignmentId) => {
    if (!token || !window.confirm('Biztosan eltávolítod ezt a beosztást?')) return;

    try {
      const response = await fetch(`http://${window.location.hostname}:8000/api/time-management/shift-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        console.log('Assignment removed successfully');
        await fetchMonthlySchedule();
      } else {
        console.error('Failed to remove assignment:', response.status);
      }
    } catch (error) {
      console.error('Error removing assignment:', error);
    }
  };

  const navigateMonth = (direction) => {
    if (direction === 'prev') {
      if (currentMonth === 1) {
        setCurrentMonth(12);
        setCurrentYear(currentYear - 1);
      } else {
        setCurrentMonth(currentMonth - 1);
      }
    } else {
      if (currentMonth === 12) {
        setCurrentMonth(1);
        setCurrentYear(currentYear + 1);
      } else {
        setCurrentMonth(currentMonth + 1);
      }
    }
  };

  const openAssignModal = (date) => {
    setSelectedDate(date);
    setShowAssignModal(true);
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDate();
  };

  const formatTime = (time) => {
    return time.substring(0, 5);
  };

  const getLocationIcon = (location) => {
    const icons = {
      'office': '🏢',
      'home': '🏠',
      'field': '🚗',
      'other': '📍'
    };
    return icons[location] || '📍';
  };

  // Lista nézet (mobil)
  const renderListView = () => (
    <div className="timemanager-list-view">
      {monthlySchedule.entries.map((entry, index) => (
        <div
          key={index}
          className={`timemanager-list-item ${isToday(entry.date) ? 'timemanager-item-today' : ''} ${isWeekend(entry.date) ? 'timemanager-item-weekend' : ''}`}
          onClick={() => openAssignModal(entry.date)}
        >
          <div className="timemanager-list-date">
            <div className="timemanager-list-day">{formatDate(entry.date)}</div>
            <div className="timemanager-list-weekday">
              {new Date(entry.date).toLocaleDateString('hu-HU', { weekday: 'short' })}
            </div>
          </div>
          
          <div className="timemanager-list-content">
            {entry.assignment && entry.template ? (
              <div className="timemanager-list-assignment">
                <div className="timemanager-list-assignment-main">
                  <span className="timemanager-list-location">
                    {getLocationIcon(entry.template.location)}
                  </span>
                  <span className="timemanager-list-name">{entry.template.name}</span>
                  <button 
                    className="timemanager-list-remove"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeAssignment(entry.assignment.id);
                    }}
                    title="Eltávolítás"
                  >
                    ×
                  </button>
                </div>
                <div className="timemanager-list-time">
                  {formatTime(entry.template.start_time)} - {formatTime(entry.template.end_time)}
                </div>
              </div>
            ) : (
              <div className="timemanager-list-empty">
                <span className="timemanager-list-add">+ Műszak hozzáadása</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  // Heti nézet (tablet)
  const renderWeekView = () => {
    const weeks = getWeeksInMonth(monthlySchedule.entries);
    
    return (
      <div className="timemanager-week-view">
        <div className="timemanager-week-headers">
          {dayNames.map(day => (
            <div key={day} className="timemanager-week-header">
              {day}
            </div>
          ))}
        </div>
        
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="timemanager-week-row">
            {week.map((entry, dayIndex) => (
              <div
                key={dayIndex}
                className={`timemanager-week-day ${entry ? (isToday(entry.date) ? 'timemanager-day-today' : '') : 'timemanager-day-empty'} ${entry && isWeekend(entry.date) ? 'timemanager-day-weekend' : ''}`}
                onClick={() => entry && openAssignModal(entry.date)}
              >
                {entry ? (
                  <>
                    <div className="timemanager-week-date">{formatDate(entry.date)}</div>
                    {entry.assignment && entry.template && (
                      <div 
                        className="timemanager-week-assignment"
                        style={{ backgroundColor: entry.template.color }}
                      >
                        <div className="timemanager-week-assignment-content">
                          <span className="timemanager-week-location">
                            {getLocationIcon(entry.template.location)}
                          </span>
                          <span className="timemanager-week-name">{entry.template.name.substring(0, 8)}...</span>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="timemanager-week-empty-cell"></div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    );
  };

  // Hagyományos naptár nézet (desktop)
  const renderCalendarView = () => {
    const weeks = getWeeksInMonth(monthlySchedule.entries);
    
    return (
      <div className="timemanager-calendar-view">
        <div className="timemanager-calendar-day-headers">
          {dayNames.map(day => (
            <div key={day} className="timemanager-calendar-day-header">
              {day}
            </div>
          ))}
        </div>

        <div className="timemanager-calendar-grid">
          {weeks.map((week, weekIndex) => (
            week.map((entry, dayIndex) => (
              <div
                key={`${weekIndex}-${dayIndex}`}
                className={`timemanager-calendar-day ${entry ? (isToday(entry.date) ? 'timemanager-day-today' : '') : 'timemanager-day-outside'} ${entry && isWeekend(entry.date) ? 'timemanager-day-weekend' : ''}`}
                onClick={() => entry && openAssignModal(entry.date)}
              >
                {entry ? (
                  <>
                    <div className="timemanager-day-number">
                      {formatDate(entry.date)}
                    </div>
                    
                    {entry.assignment && entry.template && (
                      <div 
                        className="timemanager-day-assignment"
                        style={{ backgroundColor: entry.template.color }}
                      >
                        <div className="timemanager-assignment-header">
                          <span className="timemanager-assignment-location">
                            {getLocationIcon(entry.template.location)}
                          </span>
                          <button 
                            className="timemanager-assignment-remove"
                            onClick={(e) => {
                              e.stopPropagation();
                              removeAssignment(entry.assignment.id);
                            }}
                            title="Eltávolítás"
                          >
                            ×
                          </button>
                        </div>
                        <div className="timemanager-assignment-name">
                          {entry.template.name}
                        </div>
                        <div className="timemanager-assignment-time">
                          {formatTime(entry.template.start_time)} - {formatTime(entry.template.end_time)}
                        </div>
                      </div>
                    )}

                    {!entry.assignment && (
                      <div className="timemanager-day-empty">
                        <span className="timemanager-add-icon">+</span>
                        <span className="timemanager-add-text">Műszak</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="timemanager-calendar-empty-cell"></div>
                )}
              </div>
            ))
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="timemanager-loading-state">
        <div className="timemanager-loading-spinner"></div>
        <p className="timemanager-loading-text">Havi beosztás betöltése...</p>
      </div>
    );
  }

  return (
    <div className="timemanager-monthly-schedule">
      <div className="timemanager-schedule-header">
        <div className="timemanager-schedule-title-section">
          <h2 className="timemanager-schedule-title">📅 Havi Beosztás</h2>
          <p className="timemanager-schedule-subtitle">Kezeld a műszakokat és tervezd meg a hónapot</p>
        </div>
        
        <div className="timemanager-schedule-navigation">
          <button 
            className="timemanager-nav-button timemanager-nav-prev" 
            onClick={() => navigateMonth('prev')}
          >
            <span className="timemanager-nav-arrow">←</span>
            Előző
          </button>
          
          <div className="timemanager-current-month">
            <span className="timemanager-month-name">{monthNames[currentMonth - 1]}</span>
            <span className="timemanager-year-name">{currentYear}</span>
          </div>
          
          <button 
            className="timemanager-nav-button timemanager-nav-next" 
            onClick={() => navigateMonth('next')}
          >
            Következő
            <span className="timemanager-nav-arrow">→</span>
          </button>
        </div>
      </div>

      {monthlySchedule && (
        <div className="timemanager-schedule-content">
          {viewMode === 'list' && renderListView()}
          {viewMode === 'week' && renderWeekView()}
          {viewMode === 'calendar' && renderCalendarView()}
        </div>
      )}

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="timemanager-modal-backdrop" onClick={() => setShowAssignModal(false)}>
          <div className="timemanager-modal-container" onClick={e => e.stopPropagation()}>
            <div className="timemanager-modal-header">
              <h3 className="timemanager-modal-title">🏭 Műszak Kiválasztása</h3>
              <button className="timemanager-modal-close" onClick={() => setShowAssignModal(false)}>×</button>
            </div>

            <div className="timemanager-assignment-date">
              <div className="timemanager-date-badge">
                📅 {selectedDate && new Date(selectedDate).toLocaleDateString('hu-HU', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  weekday: 'long'
                })}
              </div>
            </div>

            <div className="timemanager-template-selection">
              <div className="timemanager-selection-title">Válassz egy műszak sablont:</div>
              <div className="timemanager-template-list">
                {templates.map(template => (
                  <div 
                    key={template.id} 
                    className="timemanager-template-option"
                    onClick={() => assignShiftToDate(template.id, selectedDate)}
                  >
                    <div className="timemanager-template-option-header">
                      <div className="timemanager-template-color-indicator" style={{ backgroundColor: template.color }}></div>
                      <div className="timemanager-template-option-info">
                        <div className="timemanager-template-option-name">{template.name}</div>
                        <div className="timemanager-template-option-details">
                          <span className="timemanager-template-location">
                            {getLocationIcon(template.location)}
                          </span>
                          <span className="timemanager-template-time">
                            {formatTime(template.start_time)} - {formatTime(template.end_time)}
                          </span>
                        </div>
                      </div>
                      <div className="timemanager-template-option-arrow">→</div>
                    </div>
                    {template.description && (
                      <div className="timemanager-template-option-description">{template.description}</div>
                    )}
                  </div>
                ))}

                {templates.length === 0 && (
                  <div className="timemanager-empty-templates">
                    <div className="timemanager-empty-icon">🏭</div>
                    <h4 className="timemanager-empty-title">Nincsenek elérhető sablonok</h4>
                    <p className="timemanager-empty-description">
                      Először hozz létre műszak sablonokat a "Műszak Sablonok" tabon!
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="timemanager-form-actions">
              <button className="timemanager-button-secondary" onClick={() => setShowAssignModal(false)}>
                Mégse
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MonthlyScheduleManager;
