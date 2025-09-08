import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import './ModernTimeManagement.css';

const ModernTimeManagement = () => {
  const { token, apiUrl, user } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  
  // State management
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState('month'); // month, week, day, manage
  const [assignments, setAssignments] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [error, setError] = useState(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  // Load data when user changes
  useEffect(() => {
    if (user?.family_id) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (!token || !user?.family_id) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [assignmentsRes, templatesRes, familyRes, eventsRes] = await Promise.all([
        fetch(`${apiUrl}/api/time-management/shift-assignments/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/time-management/shift-templates/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/families/${user.family_id}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/time-management/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (assignmentsRes.ok) {
        const assignmentsData = await assignmentsRes.json();
        setAssignments(assignmentsData);
      } else {
        console.error('Failed to load assignments:', assignmentsRes.status);
      }
      
      if (templatesRes.ok) {
        const templatesData = await templatesRes.json();
        setTemplates(templatesData);
      } else {
        console.error('Failed to load templates:', templatesRes.status);
      }
      
      if (familyRes.ok) {
        const familyData = await familyRes.json();
        setFamilyMembers(familyData);
      } else {
        console.error('Failed to load family members:', familyRes.status);
      }

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData);
      } else {
        console.error('Failed to load events:', eventsRes.status);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      setError('Hiba történt az adatok betöltésekor');
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const handleAddAssignment = () => {
    setShowAddModal(true);
  };

  const handleAssignmentClick = (assignment) => {
    setSelectedAssignment(assignment);
    setShowDetailModal(true);
  };

  const quickAddAssignment = async (templateId) => {
    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: parseInt(templateId),
          user_id: user.id,
          date: selectedDate.toISOString().split('T')[0],
          status: 'scheduled'
        })
      });

      if (response.ok) {
        const newAssignment = await response.json();
        setAssignments(prev => [...prev, newAssignment]);
      }
    } catch (error) {
      console.error('Error quick adding assignment:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'scheduled': return '#3b82f6';
      case 'in-progress': return '#f59e0b';
      case 'completed': return '#10b981';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'scheduled': return '📅';
      case 'in-progress': return '⏳';
      case 'completed': return '✅';
      case 'cancelled': return '❌';
      default: return '📝';
    }
  };

  // Enhanced CRUD operations
  const handleCreateAssignment = (newAssignment) => {
    setAssignments(prev => [...prev, newAssignment]);
    setShowAddModal(false);
  };

  const handleUpdateAssignment = async (assignmentId, updates) => {
    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        const updatedAssignment = await response.json();
        setAssignments(prev => prev.map(a => a.id === assignmentId ? updatedAssignment : a));
        return updatedAssignment;
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Hiba történt a frissítés során');
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a beosztást?')) return;

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments/${assignmentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
        setShowDetailModal(false);
        setSelectedAssignment(null);
      } else {
        setError('Hiba történt a törlés során');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Hálózati hiba történt');
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a sablont? Ez az összes kapcsolódó beosztást is törölni fogja.')) return;

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setTemplates(prev => prev.filter(t => t.id !== templateId));
        // Remove related assignments as well
        setAssignments(prev => prev.filter(a => a.template_id !== templateId));
      } else {
        setError('Hiba történt a sablon törlése során');
      }
    } catch (error) {
      console.error('Error deleting template:', error);
      setError('Hálózati hiba történt');
    }
  };

  // Utility functions from NewTimeManagement
  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const getMemberName = (userId) => {
    const member = familyMembers.find(m => m.id === userId);
    if (!member) return null; // Return null instead of 'Ismeretlen'
    return member.full_name || member.name || member.username || null;
  };

  const getEventsForDate = (date) => {
    return events.filter(e => 
      new Date(e.start_time).toDateString() === date.toDateString()
    );
  };

  // Enhanced date calculations
  const getWeekDates = (date) => {
    const week = [];
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay() + 1); // Monday
    
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      week.push(day);
    }
    return week;
  };

  // Dashboard metrics calculation
  const dashboardMetrics = React.useMemo(() => {
    const today = new Date();
    const thisWeek = getWeekDates(today);
    
    const todayAssignments = assignments.filter(a => 
      new Date(a.date).toDateString() === today.toDateString()
    );

    const weekAssignments = assignments.filter(a => 
      thisWeek.some(date => new Date(a.date).toDateString() === date.toDateString())
    );

    const todayEvents = events.filter(e => 
      new Date(e.start_time).toDateString() === today.toDateString()
    );

    const completedToday = todayAssignments.filter(a => a.status === 'completed').length;
    const inProgressToday = todayAssignments.filter(a => a.status === 'in-progress').length;

    return {
      todayAssignments: todayAssignments.length,
      weekAssignments: weekAssignments.length,
      todayEvents: todayEvents.length,
      completedToday,
      inProgressToday,
      totalMembers: familyMembers.length,
      todaySchedule: [...todayAssignments, ...todayEvents].sort((a, b) => 
        (a.start_time || a.time_from) < (b.start_time || b.time_from) ? -1 : 1
      )
    };
  }, [assignments, events, familyMembers]);

  // Enhanced date navigation
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    switch (view) {
      case 'month':
        newDate.setMonth(currentDate.getMonth() + direction);
        break;
      case 'week':
        newDate.setDate(currentDate.getDate() + (direction * 7));
        break;
      case 'day':
        newDate.setDate(currentDate.getDate() + direction);
        break;
    }
    setCurrentDate(newDate);
  };

  // Calendar utilities
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
    
    const days = [];
    for (let i = 0; i < 42; i++) { // 6 weeks
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getWeekDays = (date) => {
    const startOfWeek = new Date(date);
    startOfWeek.setDate(date.getDate() - date.getDay()); // Sunday start
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getAssignmentsForDate = (date) => {
    return assignments.filter(assignment => {
      const assignmentDate = new Date(assignment.date);
      return assignmentDate.toDateString() === date.toDateString();
    });
  };

  const isToday = (date) => {
    return date.toDateString() === new Date().toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction * 7));
    setCurrentDate(newDate);
  };

  const handleDateClick = (date) => {
    setSelectedDate(date);
    if (view === 'month') {
      setShowAddModal(true);
    }
  };

  if (loading) {
    return (
      <div className="modern-time-loading">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p className="loading-text">Időbeosztás betöltése...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`modern-time-management ${darkMode ? 'dark' : 'light'}`}>
      {/* Animated Background */}
      <div className="animated-bg">
        <div className="bg-gradient-1"></div>
        <div className="bg-gradient-2"></div>
        <div className="bg-gradient-3"></div>
      </div>

      {/* Header */}
      <div className="time-header glass-container">
        <div className="time-header-content">
          <div className="title-container">
            <span className="title-icon">📅</span>
            <div>
              <h1 className="time-title">Időbeosztás</h1>
              <div className="current-date">
                {new Date().toLocaleDateString('hu-HU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </div>
            </div>
          </div>
          <div className="header-actions">
            <button 
              onClick={toggleDarkMode} 
              className="glass-btn theme-toggle"
              title="Téma váltás"
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={handleAddAssignment} 
              className="glass-btn primary add-btn"
            >
              ✨ <span className="add-text">Új feladat</span>
            </button>
          </div>
        </div>
      </div>

      {/* View Controls */}
      <div className="view-controls glass-container">
        <div className="view-nav">
          <button 
            className="nav-btn glass-btn"
            onClick={() => navigateDate(-1)}
          >
            <span className="nav-icon">‹</span>
          </button>
          
          <div className="nav-center">
            <div className="current-period">
              {view === 'month' ? 
                currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' }) :
                view === 'week' ?
                `${getWeekDates(currentDate)[0].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })} - ${getWeekDates(currentDate)[6].toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}` :
                currentDate.toLocaleDateString('hu-HU', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
              }
            </div>
            <button 
              className="today-btn glass-btn accent"
              onClick={() => setCurrentDate(new Date())}
            >
              <span className="today-icon">🎯</span>
              <span>Ma</span>
            </button>
          </div>
          
          <button 
            className="nav-btn glass-btn"
            onClick={() => navigateDate(1)}
          >
            <span className="nav-icon">›</span>
          </button>
        </div>

        <div className="view-tabs">
          <button 
            className={`view-tab glass-btn ${view === 'month' ? 'active' : ''}`}
            onClick={() => setView('month')}
          >
            <span className="tab-icon">📊</span>
            <span>Hónap</span>
          </button>
          <button 
            className={`view-tab glass-btn ${view === 'week' ? 'active' : ''}`}
            onClick={() => setView('week')}
          >
            <span className="tab-icon">📋</span>
            <span>Hét</span>
          </button>
          <button 
            className={`view-tab glass-btn ${view === 'day' ? 'active' : ''}`}
            onClick={() => setView('day')}
          >
            <span className="tab-icon">📝</span>
            <span>Nap</span>
          </button>
          <button 
            className={`view-tab glass-btn ${view === 'manage' ? 'active' : ''}`}
            onClick={() => setView('manage')}
          >
            <span className="tab-icon">⚙️</span>
            <span>Kezelés</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-banner glass-container">
          <div className="error-content">
            <span className="error-icon">⚠️</span>
            <span className="error-text">{error}</span>
            <button 
              className="error-close glass-btn"
              onClick={() => setError(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="calendar-container">
        {view === 'month' ? (
          <MonthView 
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onAssignmentClick={handleAssignmentClick}
            getAssignmentsForDate={getAssignmentsForDate}
            getEventsForDate={getEventsForDate}
            getDaysInMonth={getDaysInMonth}
            isToday={isToday}
            isCurrentMonth={isCurrentMonth}
            templates={templates}
            familyMembers={familyMembers}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getMemberName={getMemberName}
          />
        ) : view === 'week' ? (
          <WeekView 
            currentDate={currentDate}
            selectedDate={selectedDate}
            onDateClick={handleDateClick}
            onAssignmentClick={handleAssignmentClick}
            getAssignmentsForDate={getAssignmentsForDate}
            getWeekDays={getWeekDays}
            isToday={isToday}
            templates={templates}
            familyMembers={familyMembers}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getMemberName={getMemberName}
          />
        ) : view === 'day' ? (
          <DayView 
            selectedDate={selectedDate}
            onAssignmentClick={handleAssignmentClick}
            getAssignmentsForDate={getAssignmentsForDate}
            templates={templates}
            familyMembers={familyMembers}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getMemberName={getMemberName}
          />
        ) : view === 'manage' ? (
          <ManageView 
            assignments={assignments}
            templates={templates}
            familyMembers={familyMembers}
            onUpdateAssignment={handleUpdateAssignment}
            onDeleteAssignment={handleDeleteAssignment}
            onCreateTemplate={() => setShowCreateTemplate(true)}
            onDeleteTemplate={handleDeleteTemplate}
            getStatusColor={getStatusColor}
            getStatusIcon={getStatusIcon}
            getMemberName={getMemberName}
            formatTime={formatTime}
          />
        ) : null}
      </div>

      {/* Dashboard Metrics */}
      <div className="dashboard-metrics glass-container">
        <div className="metrics-header">
          <h3>📊 Mai áttekintés</h3>
          <div className="metrics-date">
            {new Date().toLocaleDateString('hu-HU', { 
              weekday: 'long', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <div className="metrics-grid">
          <div className="metric-card glass-chip">
            <div className="metric-icon">📅</div>
            <div className="metric-info">
              <span className="metric-value">{dashboardMetrics.todayAssignments}</span>
              <span className="metric-label">Mai beosztás</span>
            </div>
          </div>
          <div className="metric-card glass-chip">
            <div className="metric-icon">✅</div>
            <div className="metric-info">
              <span className="metric-value">{dashboardMetrics.completedToday}</span>
              <span className="metric-label">Befejezett</span>
            </div>
          </div>
          <div className="metric-card glass-chip">
            <div className="metric-icon">⏳</div>
            <div className="metric-info">
              <span className="metric-value">{dashboardMetrics.inProgressToday}</span>
              <span className="metric-label">Folyamatban</span>
            </div>
          </div>
          <div className="metric-card glass-chip">
            <div className="metric-icon">🎉</div>
            <div className="metric-info">
              <span className="metric-value">{dashboardMetrics.todayEvents}</span>
              <span className="metric-label">Események</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="quick-actions glass-container">
        <div className="quick-header">
          <h3>⚡ Gyors hozzáadás</h3>
          <div className="quick-date">
            {selectedDate.toLocaleDateString('hu-HU', { 
              weekday: 'short', 
              month: 'short', 
              day: 'numeric' 
            })}
          </div>
        </div>
        <div className="template-grid">
          {templates.slice(0, 6).map(template => (
            <button 
              key={template.id}
              className="template-card glass-btn"
              onClick={() => quickAddAssignment(template.id)}
            >
              <div className="template-icon">⚡</div>
              <div className="template-info">
                <span className="template-name">{template.name}</span>
                <span className="template-time">
                  {template.start_time} - {template.end_time}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <AddAssignmentModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          selectedDate={selectedDate}
          templates={templates}
          familyMembers={familyMembers}
          onAdd={(assignment) => {
            setAssignments(prev => [...prev, assignment]);
            setShowAddModal(false);
          }}
          apiUrl={apiUrl}
          token={token}
        />
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedAssignment && (
        <AssignmentDetailModal 
          isOpen={showDetailModal}
          onClose={() => {
            setShowDetailModal(false);
            setSelectedAssignment(null);
          }}
          assignment={selectedAssignment}
          template={templates.find(t => t.id === selectedAssignment.template_id)}
          member={familyMembers.find(m => m.id === selectedAssignment.user_id)}
          onUpdate={(updatedAssignment) => {
            setAssignments(prev => prev.map(a => 
              a.id === updatedAssignment.id ? updatedAssignment : a
            ));
            setShowDetailModal(false);
            setSelectedAssignment(null);
          }}
          onDelete={(deletedId) => {
            setAssignments(prev => prev.filter(a => a.id !== deletedId));
            setShowDetailModal(false);
            setSelectedAssignment(null);
          }}
          apiUrl={apiUrl}
          token={token}
          getStatusColor={getStatusColor}
          getStatusIcon={getStatusIcon}
        />
      )}

      {/* Create Template Modal */}
      {showCreateTemplate && (
        <CreateTemplateModal 
          isOpen={showCreateTemplate}
          onClose={() => setShowCreateTemplate(false)}
          onSave={(newTemplate) => {
            setTemplates(prev => [...prev, newTemplate]);
            setShowCreateTemplate(false);
          }}
          apiUrl={apiUrl}
          token={token}
        />
      )}
    </div>
  );
};

// Month View Component
const MonthView = ({ 
  currentDate, 
  selectedDate, 
  onDateClick, 
  onAssignmentClick,
  getAssignmentsForDate, 
  getEventsForDate,
  getDaysInMonth, 
  isToday, 
  isCurrentMonth, 
  templates, 
  familyMembers,
  getStatusColor,
  getStatusIcon,
  getMemberName
}) => {
  const days = getDaysInMonth(currentDate);
  const weekDays = ['Vas', 'Hét', 'Kedd', 'Szer', 'Csüt', 'Pén', 'Szo'];

  return (
    <div className="month-view glass-container">
      {/* Week headers */}
      <div className="week-header">
        {weekDays.map((day, index) => (
          <div key={index} className="week-day-header">
            <span className="day-name">{day}</span>
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="calendar-grid">
        {days.map((date, index) => {
          const dayAssignments = getAssignmentsForDate(date);
          const dayEvents = getEventsForDate(date);
          const allItems = [...dayAssignments, ...dayEvents];
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const isDayToday = isToday(date);
          
          return (
            <div 
              key={index}
              className={`calendar-day ${isDayToday ? 'today' : ''} ${
                !isCurrentMonth(date) ? 'other-month' : ''
              } ${isSelected ? 'selected' : ''} ${allItems.length > 0 ? 'has-assignments' : ''}`}
              onClick={() => onDateClick(date)}
            >
              <div className="day-content">
                <div className="day-number">
                  {isDayToday && <div className="today-indicator"></div>}
                  <span>{date.getDate()}</span>
                </div>
                
                <div className="day-assignments">
                  {/* Show assignments */}
                  {dayAssignments.slice(0, 2).map(assignment => {
                    const template = templates.find(t => t.id === assignment.template_id);
                    const member = familyMembers.find(m => m.id === assignment.user_id);
                    const memberName = getMemberName(assignment.user_id);
                    
                    // Only show if template exists and member name is available
                    if (!template || !memberName) return null;
                    
                    return (
                      <div 
                        key={`assignment-${assignment.id}`} 
                        className="assignment-chip"
                        style={{ 
                          '--status-color': getStatusColor(assignment.status),
                          backgroundColor: `${getStatusColor(assignment.status)}20`,
                          borderLeft: `3px solid ${getStatusColor(assignment.status)}`
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignmentClick(assignment);
                        }}
                      >
                        <span className="assignment-icon">{getStatusIcon(assignment.status)}</span>
                        <span className="assignment-text">
                          {template.name} - {memberName.split(' ')[0]}
                        </span>
                      </div>
                    );
                  }).filter(Boolean)}
                  
                  {/* Show events */}
                  {dayEvents.slice(0, Math.max(0, 3 - dayAssignments.length)).map(event => (
                    <div 
                      key={`event-${event.id}`} 
                      className="event-chip"
                      style={{ 
                        backgroundColor: '#8b5cf620',
                        borderLeft: '3px solid #8b5cf6'
                      }}
                    >
                      <span className="assignment-icon">🎉</span>
                      <span className="assignment-text">
                        {event.title}
                      </span>
                    </div>
                  ))}
                  
                  {allItems.length > 3 && (
                    <div className="more-assignments">
                      <span className="more-icon">⋯</span>
                      <span>+{allItems.length - 3} további</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Week View Component
const WeekView = ({ 
  currentDate, 
  selectedDate, 
  onDateClick, 
  onAssignmentClick,
  getAssignmentsForDate, 
  getWeekDays, 
  isToday, 
  templates, 
  familyMembers,
  getStatusColor,
  getStatusIcon,
  getMemberName
}) => {
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="week-view glass-container">
      <div className="week-grid">
        {weekDays.map((date, index) => {
          const dayAssignments = getAssignmentsForDate(date);
          const isSelected = selectedDate.toDateString() === date.toDateString();
          const isDayToday = isToday(date);
          
          return (
            <div 
              key={index}
              className={`week-day ${isDayToday ? 'today' : ''} ${
                isSelected ? 'selected' : ''
              }`}
              onClick={() => onDateClick(date)}
            >
              <div className="week-day-header">
                <div className="day-name">
                  {date.toLocaleDateString('hu-HU', { weekday: 'short' })}
                </div>
                <div className={`day-date ${isDayToday ? 'today-date' : ''}`}>
                  {isDayToday && <div className="today-dot"></div>}
                  {date.getDate()}
                </div>
              </div>
              
              <div className="week-assignments">
                {dayAssignments.map(assignment => {
                  const template = templates.find(t => t.id === assignment.template_id);
                  const memberName = getMemberName(assignment.user_id);
                  
                  // Only show if template exists and member name is available
                  if (!template || !memberName) return null;
                  
                  return (
                    <div 
                      key={assignment.id} 
                      className="week-assignment"
                      style={{ 
                        backgroundColor: `${getStatusColor(assignment.status)}20`,
                        borderLeft: `4px solid ${getStatusColor(assignment.status)}`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAssignmentClick(assignment);
                      }}
                    >
                      <div className="assignment-time">
                        <span className="time-icon">{getStatusIcon(assignment.status)}</span>
                        <span>{template?.start_time}</span>
                      </div>
                      <div className="assignment-details">
                        <div className="assignment-title">{template?.name}</div>
                        <div className="assignment-member">👤 {memberName}</div>
                      </div>
                    </div>
                  );
                }).filter(Boolean)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// Day View Component
const DayView = ({ 
  selectedDate, 
  onAssignmentClick,
  getAssignmentsForDate, 
  templates, 
  familyMembers,
  getStatusColor,
  getStatusIcon,
  getMemberName
}) => {
  const dayAssignments = getAssignmentsForDate(selectedDate);
  const hours = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div className="day-view glass-container">
      <div className="day-header">
        <h2 className="day-title">
          {selectedDate.toLocaleDateString('hu-HU', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
        <div className="day-stats">
          <span className="stat-item">
            <span className="stat-icon">📋</span>
            <span>{dayAssignments.length} beosztás</span>
          </span>
        </div>
      </div>

      <div className="day-timeline">
        <div className="timeline-grid">
          {hours.map(hour => {
            const hourAssignments = dayAssignments.filter(assignment => {
              const template = templates.find(t => t.id === assignment.template_id);
              if (!template) return false;
              const startHour = parseInt(template.start_time.split(':')[0]);
              return startHour === hour;
            });

            return (
              <div key={hour} className="timeline-hour">
                <div className="hour-label">
                  {hour.toString().padStart(2, '0')}:00
                </div>
                <div className="hour-content">
                  {hourAssignments.map(assignment => {
                    const template = templates.find(t => t.id === assignment.template_id);
                    const memberName = getMemberName(assignment.user_id);
                    
                    // Only show if template exists and member name is available
                    if (!template || !memberName) return null;
                    
                    return (
                      <div 
                        key={assignment.id}
                        className="timeline-assignment"
                        style={{ 
                          backgroundColor: getStatusColor(assignment.status),
                          color: 'white'
                        }}
                        onClick={() => onAssignmentClick(assignment)}
                      >
                        <div className="timeline-assignment-header">
                          <span className="assignment-icon">{getStatusIcon(assignment.status)}</span>
                          <span className="assignment-time">
                            {template?.start_time} - {template?.end_time}
                          </span>
                        </div>
                        <div className="assignment-title">{template?.name}</div>
                        <div className="assignment-member">👤 {memberName}</div>
                      </div>
                    );
                  }).filter(Boolean)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Enhanced Add Modal
const AddAssignmentModal = ({ 
  isOpen, 
  onClose, 
  selectedDate, 
  templates, 
  familyMembers, 
  onAdd, 
  apiUrl, 
  token 
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTemplate || !selectedMember) return;

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
          template_id: parseInt(selectedTemplate),
          user_id: parseInt(selectedMember),
          date: selectedDate.toISOString().split('T')[0],
          status: 'scheduled',
          notes: notes || null
        })
      });

      if (response.ok) {
        const newAssignment = await response.json();
        onAdd(newAssignment);
        setSelectedTemplate('');
        setSelectedMember('');
        setNotes('');
      } else {
        setError('Hiba történt a beosztás létrehozásakor');
      }
    } catch (error) {
      console.error('Error creating assignment:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedTemplateData = templates.find(t => t.id === parseInt(selectedTemplate));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modern-modal glass-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon">✨</span>
            <h3>Új beosztás</h3>
          </div>
          <button className="close-btn glass-btn" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        <div className="modal-date glass-chip">
          <span className="date-icon">📅</span>
          <span>
            {selectedDate.toLocaleDateString('hu-HU', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </span>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modern-form">
          <div className="form-group">
            <label>
              <span className="label-icon">📋</span>
              <span>Sablon</span>
            </label>
            <select 
              value={selectedTemplate} 
              onChange={(e) => setSelectedTemplate(e.target.value)}
              required
              className="modern-select glass-input"
            >
              <option value="">Válassz sablont...</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} ({template.start_time} - {template.end_time})
                </option>
              ))}
            </select>
          </div>

          {selectedTemplateData && (
            <div className="template-preview glass-chip">
              <div className="preview-header">
                <span className="preview-icon">⏰</span>
                <span>{selectedTemplateData.start_time} - {selectedTemplateData.end_time}</span>
              </div>
              {selectedTemplateData.location && (
                <div className="preview-location">
                  <span className="location-icon">📍</span>
                  <span>{selectedTemplateData.location}</span>
                </div>
              )}
            </div>
          )}

          <div className="form-group">
            <label>
              <span className="label-icon">👤</span>
              <span>Családtag</span>
            </label>
            <select 
              value={selectedMember} 
              onChange={(e) => setSelectedMember(e.target.value)}
              required
              className="modern-select glass-input"
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
            <label>
              <span className="label-icon">📝</span>
              <span>Megjegyzések (opcionális)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Esetleges megjegyzések..."
              className="modern-textarea glass-input"
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="cancel-btn glass-btn">
              <span className="btn-icon">✕</span>
              <span>Mégse</span>
            </button>
            <button type="submit" disabled={loading} className="submit-btn glass-btn primary">
              <span className="btn-icon">{loading ? '⏳' : '✨'}</span>
              <span>{loading ? 'Létrehozás...' : 'Létrehozás'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Assignment Detail Modal
const AssignmentDetailModal = ({ 
  isOpen, 
  onClose, 
  assignment, 
  template, 
  member, 
  onUpdate, 
  onDelete, 
  apiUrl, 
  token,
  getStatusColor,
  getStatusIcon
}) => {
  const [status, setStatus] = useState(assignment?.status || 'scheduled');
  const [notes, setNotes] = useState(assignment?.notes || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const statusOptions = [
    { value: 'scheduled', label: 'Tervezett', icon: '📅' },
    { value: 'in_progress', label: 'Folyamatban', icon: '⏳' },
    { value: 'completed', label: 'Befejezett', icon: '✓' },
    { value: 'cancelled', label: 'Törölve', icon: '✕' }
  ];

  const handleUpdate = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          notes: notes || null
        })
      });

      if (response.ok) {
        const updated = await response.json();
        onUpdate(updated);
      } else {
        setError('Hiba történt a frissítés során');
      }
    } catch (error) {
      console.error('Error updating assignment:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a beosztást?')) return;

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-assignments/${assignment.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        onDelete(assignment.id);
      } else {
        setError('Hiba történt a törlés során');
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !assignment) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modern-modal glass-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <span className="modal-icon" style={{ color: getStatusColor(assignment.status) }}>
              {getStatusIcon(assignment.status)}
            </span>
            <h3>Beosztás részletei</h3>
          </div>
          <button className="close-btn glass-btn" onClick={onClose}>
            <span>✕</span>
          </button>
        </div>

        <div className="assignment-details">
          <div className="detail-card glass-chip">
            <h4>{template?.name}</h4>
            <div className="detail-row">
              <span className="detail-icon">⏰</span>
              <span>{template?.start_time} - {template?.end_time}</span>
            </div>
            <div className="detail-row">
              <span className="detail-icon">👤</span>
              <span>{member?.full_name || member?.name}</span>
            </div>
            <div className="detail-row">
              <span className="detail-icon">📅</span>
              <span>
                {new Date(assignment.date).toLocaleDateString('hu-HU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {template?.location && (
              <div className="detail-row">
                <span className="detail-icon">📍</span>
                <span>{template.location}</span>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="modern-form">
          <div className="form-group">
            <label>
              <span className="label-icon">🎯</span>
              <span>Állapot</span>
            </label>
            <div className="status-grid">
              {statusOptions.map(option => (
                <button
                  key={option.value}
                  type="button"
                  className={`status-btn glass-btn ${status === option.value ? 'active' : ''}`}
                  onClick={() => setStatus(option.value)}
                  style={{ 
                    '--status-color': getStatusColor(option.value)
                  }}
                >
                  <span className="status-icon">{option.icon}</span>
                  <span>{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">📝</span>
              <span>Megjegyzések</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Megjegyzések a beosztáshoz..."
              className="modern-textarea glass-input"
              rows="3"
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={handleDelete} 
              className="delete-btn glass-btn danger"
              disabled={loading}
            >
              <span className="btn-icon">🗑️</span>
              <span>Törlés</span>
            </button>
            <button 
              type="button" 
              onClick={handleUpdate} 
              className="submit-btn glass-btn primary"
              disabled={loading}
            >
              <span className="btn-icon">{loading ? '⏳' : '💾'}</span>
              <span>{loading ? 'Mentés...' : 'Mentés'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ManageView komponens
const ManageView = ({ 
  assignments, 
  templates, 
  familyMembers, 
  onUpdateAssignment, 
  onDeleteAssignment, 
  onCreateTemplate, 
  onDeleteTemplate,
  getStatusColor,
  getStatusIcon,
  getMemberName,
  formatTime
}) => {
  const [activeTab, setActiveTab] = useState('templates');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState('all');

  const filteredTemplates = templates.filter(template =>
    template.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredAssignments = assignments.filter(assignment => {
    const memberName = getMemberName(assignment.assigned_to);
    const templateTitle = templates.find(t => t.id === assignment.template_id)?.title || '';
    
    const matchesSearch = 
      memberName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      templateTitle.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMember = selectedMember === 'all' || assignment.assigned_to === parseInt(selectedMember);
    
    return matchesSearch && matchesMember && memberName; // Only show assignments with valid members
  });

  return (
    <div className="manage-view glass-container">
      <div className="manage-header">
        <h2><i className="fas fa-cogs"></i> Beosztások kezelése</h2>
        
        <div className="manage-tabs">
          <button 
            className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveTab('templates')}
          >
            <i className="fas fa-clipboard-list"></i> Sablonok
          </button>
          <button 
            className={`tab-btn ${activeTab === 'assignments' ? 'active' : ''}`}
            onClick={() => setActiveTab('assignments')}
          >
            <i className="fas fa-tasks"></i> Beosztások
          </button>
        </div>
      </div>

      <div className="manage-filters glass-effect">
        <div className="search-container">
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Keresés..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        {activeTab === 'assignments' && (
          <select
            value={selectedMember}
            onChange={(e) => setSelectedMember(e.target.value)}
            className="member-filter"
          >
            <option value="all">Minden tag</option>
            {familyMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.first_name} {member.last_name}
              </option>
            ))}
          </select>
        )}
      </div>

      {activeTab === 'templates' ? (
        <div className="templates-section">
          <div className="section-header">
            <h3>Sablonok ({filteredTemplates.length})</h3>
            <button className="create-btn glass-effect" onClick={onCreateTemplate}>
              <i className="fas fa-plus"></i> Új sablon
            </button>
          </div>
          
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div key={template.id} className="template-card glass-effect">
                <div className="template-header">
                  <h4>{template.title}</h4>
                  <div className="template-actions">
                    <button 
                      className="action-btn edit"
                      title="Szerkesztés"
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="action-btn delete"
                      title="Törlés"
                      onClick={() => onDeleteTemplate(template.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
                
                {template.description && (
                  <p className="template-description">{template.description}</p>
                )}
                
                <div className="template-details">
                  {template.duration && (
                    <span className="detail-item">
                      <i className="fas fa-clock"></i> {formatTime(template.duration)}
                    </span>
                  )}
                  {template.points && (
                    <span className="detail-item">
                      <i className="fas fa-star"></i> {template.points} pont
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="assignments-section">
          <div className="section-header">
            <h3>Beosztások ({filteredAssignments.length})</h3>
          </div>
          
          <div className="assignments-list">
            {filteredAssignments.map(assignment => {
              const template = templates.find(t => t.id === assignment.template_id);
              const memberName = getMemberName(assignment.assigned_to);
              
              return (
                <div key={assignment.id} className="assignment-card glass-effect">
                  <div className="assignment-info">
                    <div className="assignment-title">
                      <span className={`status-indicator ${getStatusColor(assignment.status)}`}>
                        <i className={getStatusIcon(assignment.status)}></i>
                      </span>
                      <strong>{template?.title || 'Ismeretlen sablon'}</strong>
                    </div>
                    
                    <div className="assignment-details">
                      <span className="member-name">
                        <i className="fas fa-user"></i> {memberName}
                      </span>
                      <span className="due-date">
                        <i className="fas fa-calendar"></i> {new Date(assignment.due_date).toLocaleDateString('hu-HU')}
                      </span>
                      {assignment.completed_at && (
                        <span className="completed-date">
                          <i className="fas fa-check"></i> {new Date(assignment.completed_at).toLocaleDateString('hu-HU')}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="assignment-actions">
                    <button 
                      className="action-btn edit"
                      title="Szerkesztés"
                      onClick={() => onUpdateAssignment(assignment)}
                    >
                      <i className="fas fa-edit"></i>
                    </button>
                    <button 
                      className="action-btn delete"
                      title="Törlés"
                      onClick={() => onDeleteAssignment(assignment.id)}
                    >
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

// CreateTemplate Modal Component
const CreateTemplateModal = ({ isOpen, onClose, onSave, apiUrl, token }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [points, setPoints] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !startTime || !endTime) {
      setError('Kérjük töltse ki a kötelező mezőket!');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-templates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          description: description || null,
          start_time: startTime,
          end_time: endTime,
          points: points ? parseInt(points) : null
        })
      });

      if (response.ok) {
        const newTemplate = await response.json();
        onSave(newTemplate);
        setTitle('');
        setDescription('');
        setStartTime('');
        setEndTime('');
        setPoints('');
        onClose();
      } else {
        setError('Hiba történt a sablon létrehozásakor');
      }
    } catch (error) {
      console.error('Error creating template:', error);
      setError('Hálózati hiba történt');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-container glass-effect">
        <div className="modal-header">
          <h2>Új sablon létrehozása</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>

        <form onSubmit={handleSubmit} className="modal-content">
          {error && <div className="error-banner">{error}</div>}

          <div className="form-group">
            <label>
              <span className="label-icon">📋</span>
              <span>Cím *</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Sablon címe..."
              className="modern-input glass-input"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">📝</span>
              <span>Leírás</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Sablon leírása..."
              className="modern-textarea glass-input"
              rows="3"
            />
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">🕐</span>
              <span>Kezdő időpont *</span>
            </label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="modern-input glass-input"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">🕑</span>
              <span>Befejező időpont *</span>
            </label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="modern-input glass-input"
              required
            />
          </div>

          <div className="form-group">
            <label>
              <span className="label-icon">⭐</span>
              <span>Pontok</span>
            </label>
            <input
              type="number"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="Jutalom pontok..."
              className="modern-input glass-input"
              min="0"
            />
          </div>

          <div className="modal-actions">
            <button 
              type="button" 
              onClick={onClose} 
              className="cancel-btn glass-btn"
              disabled={loading}
            >
              <span className="btn-icon">❌</span>
              <span>Mégse</span>
            </button>
            <button 
              type="submit" 
              className="submit-btn glass-btn primary"
              disabled={loading}
            >
              <span className="btn-icon">{loading ? '⏳' : '💾'}</span>
              <span>{loading ? 'Mentés...' : 'Létrehozás'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModernTimeManagement;
