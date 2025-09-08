import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import CreateAssignmentModal from './modals/CreateAssignmentModal';
import CreateTemplateModal from './modals/CreateTemplateModal';
import AssignmentStatusModal from './modals/AssignmentStatusModal';
import './NewTimeManagement.css';

const NewTimeManagement = () => {
  const { token, apiUrl } = useAuth();
  const { darkMode, toggleDarkMode } = useTheme();
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [scheduleData, setScheduleData] = useState([]);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [shiftTemplates, setShiftTemplates] = useState([]);
  const [events, setEvents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showCreateAssignment, setShowCreateAssignment] = useState(false);
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [showAssignmentStatus, setShowAssignmentStatus] = useState(false);
  const [selectedModalDate, setSelectedModalDate] = useState(null);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  // Load initial data
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      if (!token) {
        console.error('No auth token found');
        setError('Nincs érvényes bejelentkezési token');
        setLoading(false);
        return;
      }

      // Load all data in parallel
      const [familyResponse, templatesResponse, eventsResponse, assignmentsResponse] = await Promise.all([
        fetch(`${apiUrl}/api/users/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/time-management/shift-templates/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/family-events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${apiUrl}/api/time-management/shift-assignments/family`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);      if (familyResponse.ok) {
        const familyData = await familyResponse.json();
        setFamilyMembers(familyData);
      }

      if (templatesResponse.ok) {
        const templatesData = await templatesResponse.json();
        setShiftTemplates(templatesData);
      }

      if (eventsResponse.ok) {
        const eventsData = await eventsResponse.json();
        setEvents(eventsData);
      }

      if (assignmentsResponse.ok) {
        const assignmentsData = await assignmentsResponse.json();
        setAssignments(assignmentsData);
      }

    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  // CRUD operations
  const handleCreateAssignment = (newAssignment) => {
    setAssignments(prev => [...prev, newAssignment]);
  };

  const handleCreateTemplate = (newTemplate) => {
    setShiftTemplates(prev => [...prev, newTemplate]);
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
      }
    } catch (error) {
      console.error('Error deleting assignment:', error);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    if (!window.confirm('Biztosan törölni szeretnéd ezt a sablont? Ez törli az összes kapcsolódó beosztást is!')) return;

    try {
      const response = await fetch(`${apiUrl}/api/time-management/shift-templates/${templateId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setShiftTemplates(prev => prev.filter(t => t.id !== templateId));
        // Remove assignments using this template
        setAssignments(prev => prev.filter(a => a.template_id !== templateId));
      }
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const openCreateAssignmentModal = (date = null) => {
    setSelectedModalDate(date);
    setShowCreateAssignment(true);
  };

  const openCreateTemplateModal = () => {
    setShowCreateTemplate(true);
  };

  const openAssignmentStatusModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowAssignmentStatus(true);
  };

  const handleUpdateAssignmentFromModal = (updatedAssignment) => {
    setAssignments(prev => prev.map(a => a.id === updatedAssignment.id ? updatedAssignment : a));
    setShowAssignmentStatus(false);
    setSelectedAssignment(null);
  };

  // Utility functions
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

  const getMonthDates = (date) => {
    const month = [];
    const year = date.getFullYear();
    const monthIndex = date.getMonth();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      month.push(new Date(year, monthIndex, i));
    }
    return month;
  };

  // Statistics calculations
  const dashboardMetrics = useMemo(() => {
    const today = new Date();
    const thisWeek = getWeekDates(today);
    const thisMonth = getMonthDates(today);

    const todayShifts = assignments.filter(a => 
      new Date(a.date).toDateString() === today.toDateString()
    );

    const weekShifts = assignments.filter(a => 
      thisWeek.some(date => new Date(a.date).toDateString() === date.toDateString())
    );

    const monthShifts = assignments.filter(a => 
      thisMonth.some(date => new Date(a.date).toDateString() === date.toDateString())
    );

    const todayEvents = events.filter(e => 
      new Date(e.start_time).toDateString() === today.toDateString()
    );

    return {
      todayShifts: todayShifts.length,
      weekShifts: weekShifts.length,
      monthShifts: monthShifts.length,
      todayEvents: todayEvents.length,
      totalMembers: familyMembers.length,
      todaySchedule: [...todayShifts, ...todayEvents].sort((a, b) => 
        (a.start_time || a.time_from) < (b.start_time || b.time_from) ? -1 : 1
      )
    };
  }, [assignments, events, familyMembers]);

  const formatTime = (timeString) => {
    if (!timeString) return '';
    return timeString.slice(0, 5);
  };

  const getMemberName = (userId) => {
    const member = familyMembers.find(m => m.id === userId);
    return member ? (member.full_name || member.name || member.username) : 'Ismeretlen';
  };

  // Calendar view component  
  const CalendarView = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState('month'); // month, week, day

    const getDaysInMonth = (date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday
      
      const days = [];
      for (let i = 0; i < 42; i++) { // 6 weeks * 7 days
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
      return days;
    };

    const getAssignmentsForDate = (date) => {
      return assignments.filter(a => 
        new Date(a.date).toDateString() === date.toDateString()
      );
    };

    const getEventsForDate = (date) => {
      return events.filter(e => 
        new Date(e.start_time).toDateString() === date.toDateString()
      );
    };

    const navigateMonth = (direction) => {
      const newDate = new Date(currentDate);
      newDate.setMonth(currentDate.getMonth() + direction);
      setCurrentDate(newDate);
    };

    const isToday = (date) => {
      return date.toDateString() === new Date().toDateString();
    };

    const isCurrentMonth = (date) => {
      return date.getMonth() === currentDate.getMonth();
    };

    return (
      <div className="calendar-view">
        {/* Calendar Header */}
        <div className="calendar-header">
          <div className="calendar-navigation">
            <button className="btn-ghost" onClick={() => navigateMonth(-1)}>
              ‹
            </button>
            <h2 className="calendar-title">
              {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
            </h2>
            <button className="btn-ghost" onClick={() => navigateMonth(1)}>
              ›
            </button>
          </div>
          
          <div className="calendar-view-modes">
            <button 
              className={`view-mode-btn ${viewMode === 'month' ? 'active' : ''}`}
              onClick={() => setViewMode('month')}
            >
              Hónap
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'week' ? 'active' : ''}`}
              onClick={() => setViewMode('week')}
            >
              Hét
            </button>
            <button 
              className={`view-mode-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => setViewMode('day')}
            >
              Nap
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="calendar-grid">
          {/* Week days header */}
          <div className="calendar-weekdays">
            {['Vas', 'Hét', 'Kedd', 'Szer', 'Csüt', 'Pén', 'Szo'].map(day => (
              <div key={day} className="weekday-header">{day}</div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="calendar-days">
            {getDaysInMonth(currentDate).map((date, index) => {
              const dayAssignments = getAssignmentsForDate(date);
              const dayEvents = getEventsForDate(date);
              
              return (
                <div 
                  key={index} 
                  className={`calendar-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonth(date) ? 'other-month' : ''}`}
                  onClick={() => openCreateAssignmentModal(date)}
                >
                  <div className="day-number">{date.getDate()}</div>
                  
                  <div className="day-content">
                    {/* Assignments */}
                    {dayAssignments.slice(0, 2).map(assignment => {
                      const template = shiftTemplates.find(t => t.id === assignment.template_id);
                      const member = familyMembers.find(m => m.id === assignment.user_id);
                      
                      return (
                        <div key={assignment.id} className="calendar-item assignment">
                          <div className="item-time">
                            {template ? `${formatTime(template.start_time)}-${formatTime(template.end_time)}` : ''}
                          </div>
                          <div className="item-title">
                            {template?.name} - {member?.full_name || member?.name}
                          </div>
                        </div>
                      );
                    })}
                    
                    {/* Events */}
                    {dayEvents.slice(0, 2).map(event => (
                      <div key={event.id} className="calendar-item event">
                        <div className="item-time">
                          {formatTime(event.start_time)}
                        </div>
                        <div className="item-title">{event.title}</div>
                      </div>
                    ))}
                    
                    {/* Show more indicator */}
                    {(dayAssignments.length + dayEvents.length) > 2 && (
                      <div className="more-items">
                        +{(dayAssignments.length + dayEvents.length) - 2} további
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Shifts view component
  const ShiftsView = () => {
    const [selectedWeek, setSelectedWeek] = useState(new Date());
    const [selectedMember, setSelectedMember] = useState(null);

    const getWeekStart = (date) => {
      const start = new Date(date);
      start.setDate(date.getDate() - date.getDay() + 1); // Monday
      return start;
    };

    const getWeekDays = (startDate) => {
      const days = [];
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
      return days;
    };

    const getAssignmentsForDay = (date, memberId = null) => {
      return assignments.filter(a => {
        const assignmentDate = new Date(a.date).toDateString() === date.toDateString();
        const memberMatch = !memberId || a.user_id === memberId;
        return assignmentDate && memberMatch;
      });
    };

    const navigateWeek = (direction) => {
      const newDate = new Date(selectedWeek);
      newDate.setDate(selectedWeek.getDate() + (direction * 7));
      setSelectedWeek(newDate);
    };

    const weekStart = getWeekStart(selectedWeek);
    const weekDays = getWeekDays(weekStart);

    return (
      <div className="shifts-view">
        {/* Shifts Header */}
        <div className="shifts-header">
          <div className="week-navigation">
            <button className="btn-ghost" onClick={() => navigateWeek(-1)}>
              ‹ Előző hét
            </button>
            <h2 className="week-title">
              {weekStart.toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })} - 
              {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('hu-HU', { month: 'long', day: 'numeric' })}
            </h2>
            <button className="btn-ghost" onClick={() => navigateWeek(1)}>
              Következő hét ›
            </button>
          </div>

          <div className="shifts-actions">
            <button className="btn-primary" onClick={() => openCreateAssignmentModal()}>
              + Új beosztás
            </button>
          </div>
        </div>

        {/* Member Filter */}
        <div className="member-filter">
          <button 
            className={`filter-btn ${!selectedMember ? 'active' : ''}`}
            onClick={() => setSelectedMember(null)}
          >
            Mindenki
          </button>
          {familyMembers.map(member => (
            <button 
              key={member.id}
              className={`filter-btn ${selectedMember === member.id ? 'active' : ''}`}
              onClick={() => setSelectedMember(member.id)}
            >
              <div className="filter-avatar">
                {member.avatar_url ? (
                  <img 
                    src={(() => {
                      if (member.avatar_url.includes('/uploads/avatars/')) {
                        const filename = member.avatar_url.split('/uploads/avatars/')[1];
                        return `${apiUrl}/uploads/avatars/${filename}`;
                      }
                      return member.avatar_url.startsWith('http') ? member.avatar_url : `${apiUrl}${member.avatar_url}`;
                    })()} 
                    alt={member.full_name || member.name} 
                  />
                ) : (
                  <span>{(member.full_name || member.name || '?').charAt(0).toUpperCase()}</span>
                )}
              </div>
              {member.full_name || member.name}
            </button>
          ))}
        </div>

        {/* Weekly Schedule Grid */}
        <div className="weekly-schedule">
          <div className="schedule-grid">
            {/* Time column */}
            <div className="time-column">
              <div className="time-header">Idő</div>
              {Array.from({length: 24}, (_, i) => (
                <div key={i} className="time-slot">
                  {i.toString().padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDays.map((day, dayIndex) => {
              const dayAssignments = getAssignmentsForDay(day, selectedMember);
              
              return (
                <div key={dayIndex} className="day-column">
                  <div className="day-header">
                    <div className="day-name">
                      {day.toLocaleDateString('hu-HU', { weekday: 'short' })}
                    </div>
                    <div className="day-date">
                      {day.getDate()}
                    </div>
                  </div>
                  
                  <div className="day-schedule">
                    {dayAssignments.map(assignment => {
                      const template = shiftTemplates.find(t => t.id === assignment.template_id);
                      const member = familyMembers.find(m => m.id === assignment.user_id);
                      
                      if (!template) return null;
                      
                      const startHour = parseInt(template.start_time.split(':')[0]);
                      const endHour = parseInt(template.end_time.split(':')[0]);
                      const duration = endHour - startHour;
                      
                      return (
                        <div 
                          key={assignment.id}
                          className="schedule-assignment"
                          style={{
                            top: `${startHour * 60}px`,
                            height: `${duration * 60}px`
                          }}
                          onClick={() => openAssignmentStatusModal(assignment)}
                        >
                          <div className="assignment-header">
                            <span className="assignment-title">{template.name}</span>
                            <span className="assignment-time">
                              {formatTime(template.start_time)}-{formatTime(template.end_time)}
                            </span>
                          </div>
                          <div className="assignment-member">
                            {member?.full_name || member?.name}
                          </div>
                          <div className="assignment-status">
                            {assignment.status === 'scheduled' && '📅'}
                            {assignment.status === 'in_progress' && '⏳'}
                            {assignment.status === 'completed' && '✅'}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Templates view component
  const TemplatesView = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');

    const filteredTemplates = shiftTemplates.filter(template => {
      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    const categories = [...new Set(shiftTemplates.map(t => t.category).filter(Boolean))];

    return (
      <div className="templates-view">
        {/* Templates Header */}
        <div className="templates-header">
          <h2>Műszak sablonok</h2>
          <button className="btn-primary" onClick={openCreateTemplateModal}>
            + Új sablon
          </button>
        </div>

        {/* Search and Filter */}
        <div className="templates-filters">
          <div className="search-box">
            <input 
              type="text"
              placeholder="Sablon keresése..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
          
          <div className="category-filters">
            <button 
              className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('all')}
            >
              Összes
            </button>
            {categories.map(category => (
              <button 
                key={category}
                className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                onClick={() => setSelectedCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="templates-grid">
          {filteredTemplates.map(template => (
            <div key={template.id} className="template-card">
              <div className="template-header">
                <h3 className="template-name">{template.name}</h3>
                <div className="template-actions">
                  <button className="btn-ghost" title="Szerkesztés">✏️</button>
                  <button 
                    className="btn-ghost" 
                    title="Beosztás létrehozása"
                    onClick={() => openCreateAssignmentModal()}
                  >
                    📋
                  </button>
                  <button 
                    className="btn-ghost" 
                    title="Törlés"
                    onClick={() => handleDeleteTemplate(template.id)}
                  >
                    🗑️
                  </button>
                </div>
              </div>
              
              <div className="template-details">
                <div className="detail-row">
                  <span className="detail-label">Időpont:</span>
                  <span className="detail-value">
                    {formatTime(template.start_time)} - {formatTime(template.end_time)}
                  </span>
                </div>
                
                {template.location && (
                  <div className="detail-row">
                    <span className="detail-label">Helyszín:</span>
                    <span className="detail-value">{template.location}</span>
                  </div>
                )}
                
                {template.category && (
                  <div className="detail-row">
                    <span className="detail-label">Kategória:</span>
                    <span className="detail-value">{template.category}</span>
                  </div>
                )}
                
                {template.description && (
                  <div className="template-description">
                    {template.description}
                  </div>
                )}
              </div>
              
              <div className="template-footer">
                <div className="usage-stats">
                  Használva: {assignments.filter(a => a.template_id === template.id).length}x
                </div>
                <button 
                  className="btn-secondary btn-sm"
                  onClick={() => openCreateAssignmentModal()}
                >
                  Új beosztás létrehozása
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Analytics view component
  const AnalyticsView = () => {
    const [analyticsTimeRange, setAnalyticsTimeRange] = useState('month'); // week, month, quarter
    
    const getAnalyticsData = () => {
      const now = new Date();
      let startDate;
      
      switch(analyticsTimeRange) {
        case 'week':
          startDate = getWeekDates(now)[0];
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        default: // month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }
      
      const relevantAssignments = assignments.filter(a => new Date(a.date) >= startDate);
      
      // Member workload statistics
      const memberStats = familyMembers.map(member => {
        const memberAssignments = relevantAssignments.filter(a => a.user_id === member.id);
        const totalHours = memberAssignments.reduce((sum, assignment) => {
          const template = shiftTemplates.find(t => t.id === assignment.template_id);
          if (template) {
            const start = new Date(`2000-01-01T${template.start_time}`);
            const end = new Date(`2000-01-01T${template.end_time}`);
            return sum + (end - start) / (1000 * 60 * 60); // hours
          }
          return sum;
        }, 0);
        
        return {
          member,
          assignments: memberAssignments.length,
          hours: totalHours,
          completedRate: memberAssignments.filter(a => a.status === 'completed').length / memberAssignments.length || 0
        };
      });
      
      // Template usage statistics
      const templateStats = shiftTemplates.map(template => {
        const usage = relevantAssignments.filter(a => a.template_id === template.id);
        return {
          template,
          usage: usage.length,
          completionRate: usage.filter(a => a.status === 'completed').length / usage.length || 0
        };
      }).sort((a, b) => b.usage - a.usage);
      
      return { memberStats, templateStats };
    };
    
    const { memberStats, templateStats } = getAnalyticsData();
    
    return (
      <div className="analytics-view">
        {/* Analytics Header */}
        <div className="analytics-header">
          <h2>Elemzések</h2>
          <div className="time-range-selector">
            <button 
              className={`range-btn ${analyticsTimeRange === 'week' ? 'active' : ''}`}
              onClick={() => setAnalyticsTimeRange('week')}
            >
              Hét
            </button>
            <button 
              className={`range-btn ${analyticsTimeRange === 'month' ? 'active' : ''}`}
              onClick={() => setAnalyticsTimeRange('month')}
            >
              Hónap
            </button>
            <button 
              className={`range-btn ${analyticsTimeRange === 'quarter' ? 'active' : ''}`}
              onClick={() => setAnalyticsTimeRange('quarter')}
            >
              Negyedév
            </button>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="analytics-content">
          {/* Member Statistics */}
          <div className="analytics-section">
            <h3>Családtag statisztikák</h3>
            <div className="member-stats-grid">
              {memberStats.map(stat => (
                <div key={stat.member.id} className="member-stat-card">
                  <div className="stat-member-info">
                    <div className="stat-avatar">
                      {stat.member.avatar_url ? (
                        <img 
                          src={(() => {
                            if (stat.member.avatar_url.includes('/uploads/avatars/')) {
                              const filename = stat.member.avatar_url.split('/uploads/avatars/')[1];
                              return `${apiUrl}/uploads/avatars/${filename}`;
                            }
                            return stat.member.avatar_url.startsWith('http') ? stat.member.avatar_url : `${apiUrl}${stat.member.avatar_url}`;
                          })()} 
                          alt={stat.member.full_name || stat.member.name} 
                        />
                      ) : (
                        <span>{(stat.member.full_name || stat.member.name || '?').charAt(0).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="stat-name">{stat.member.full_name || stat.member.name}</div>
                  </div>
                  
                  <div className="stat-metrics">
                    <div className="metric">
                      <span className="metric-value">{stat.assignments}</span>
                      <span className="metric-label">Beosztás</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{stat.hours.toFixed(1)}</span>
                      <span className="metric-label">Óra</span>
                    </div>
                    <div className="metric">
                      <span className="metric-value">{(stat.completedRate * 100).toFixed(0)}%</span>
                      <span className="metric-label">Teljesítés</span>
                    </div>
                  </div>
                  
                  <div className="completion-bar">
                    <div 
                      className="completion-fill"
                      style={{ width: `${stat.completedRate * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Template Usage */}
          <div className="analytics-section">
            <h3>Sablon használat</h3>
            <div className="template-usage-list">
              {templateStats.slice(0, 10).map(stat => (
                <div key={stat.template.id} className="usage-item">
                  <div className="usage-info">
                    <span className="usage-name">{stat.template.name}</span>
                    <span className="usage-category">{stat.template.category}</span>
                  </div>
                  <div className="usage-stats">
                    <span className="usage-count">{stat.usage}x használat</span>
                    <span className="usage-rate">{(stat.completionRate * 100).toFixed(0)}% teljesítés</span>
                  </div>
                  <div className="usage-bar">
                    <div 
                      className="usage-fill"
                      style={{ width: `${(stat.usage / templateStats[0]?.usage || 1) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Dashboard view component
  const DashboardView = () => (
    <div className="dashboard-view">
      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-icon">📅</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardMetrics.todayShifts}</div>
            <div className="stat-label">Mai beosztások</div>
          </div>
        </div>
        
        <div className="stat-card success">
          <div className="stat-icon">🗓️</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardMetrics.weekShifts}</div>
            <div className="stat-label">Heti beosztások</div>
          </div>
        </div>
        
        <div className="stat-card warning">
          <div className="stat-icon">🎯</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardMetrics.todayEvents}</div>
            <div className="stat-label">Mai események</div>
          </div>
        </div>
        
        <div className="stat-card info">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <div className="stat-number">{dashboardMetrics.totalMembers}</div>
            <div className="stat-label">Családtagok</div>
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Mai program</h3>
          <button className="btn-secondary btn-sm">
            Összes megtekintése →
          </button>
        </div>
        <div className="today-schedule">
          {assignments
            .filter(a => new Date(a.date).toDateString() === new Date().toDateString())
            .map(assignment => {
              const template = shiftTemplates.find(t => t.id === assignment.template_id);
              if (!template) return null;
              
              return (
                <div 
                  key={assignment.id} 
                  className="schedule-item"
                  onClick={() => openAssignmentStatusModal(assignment)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="schedule-time">
                    {formatTime(template.start_time)} - {formatTime(template.end_time)}
                  </div>
                  <div className="schedule-content">
                    <div className="schedule-title">{template.name}</div>
                    <div className="schedule-member">{getMemberName(assignment.user_id)}</div>
                    <div className="schedule-location">{template.location}</div>
                  </div>
                  <div className="schedule-status">
                    <span className={`status-badge ${assignment.status}`}>
                      {assignment.status === 'scheduled' ? 'Tervezett' : 
                       assignment.status === 'in_progress' ? 'Folyamatban' : 
                       assignment.status === 'completed' ? 'Befejezett' : assignment.status}
                    </span>
                  </div>
                </div>
              );
            })}
          
          {events
            .filter(e => new Date(e.start_time).toDateString() === new Date().toDateString())
            .map(event => (
              <div key={event.id} className="schedule-item event">
                <div className="schedule-time">
                  {formatTime(event.start_time)}
                  {event.end_time && ` - ${formatTime(event.end_time)}`}
                </div>
                <div className="schedule-content">
                  <div className="schedule-title">{event.title}</div>
                  <div className="schedule-member">Esemény</div>
                  {event.location && <div className="schedule-location">{event.location}</div>}
                </div>
                <div className="schedule-status">
                  <span className="status-badge event">
                    {event.event_type === 'family' ? 'Családi' : 'Személyes'}
                  </span>
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Gyors műveletek</h3>
        </div>
        <div className="quick-actions">
          <button className="quick-action-btn primary" onClick={() => openCreateAssignmentModal()}>
            <div className="quick-action-icon">➕</div>
            <div className="quick-action-text">
              <div className="quick-action-title">Új beosztás</div>
              <div className="quick-action-desc">Beosztás hozzáadása</div>
            </div>
          </button>
          
          <button className="quick-action-btn success" onClick={openCreateTemplateModal}>
            <div className="quick-action-icon">📋</div>
            <div className="quick-action-text">
              <div className="quick-action-title">Műszaksablon</div>
              <div className="quick-action-desc">Sablon létrehozása</div>
            </div>
          </button>
          
          <button className="quick-action-btn warning" onClick={() => setActiveView('analytics')}>
            <div className="quick-action-icon">📊</div>
            <div className="quick-action-text">
              <div className="quick-action-title">Riportok</div>
              <div className="quick-action-desc">Statisztikák megtekintése</div>
            </div>
          </button>
          
          <button className="quick-action-btn info">
            <div className="quick-action-icon">⚙️</div>
            <div className="quick-action-text">
              <div className="quick-action-title">Beállítások</div>
              <div className="quick-action-desc">Rendszer konfigurálása</div>
            </div>
          </button>
        </div>
      </div>

      {/* Team Overview */}
      <div className="dashboard-section">
        <div className="section-header">
          <h3>Csapat áttekintés</h3>
        </div>
        <div className="team-overview">
          {familyMembers.map(member => {
            const memberShifts = assignments.filter(a => 
              a.user_id === member.id && 
              getWeekDates(new Date()).some(date => 
                new Date(a.date).toDateString() === date.toDateString()
              )
            );
            
            return (
              <div key={member.id} className="team-member-card">
                <div className="member-avatar">
                  {member.avatar_url ? (
                    <img 
                      src={(() => {
                        // Mindig a current apiUrl-t használjuk, extraktáljuk a fájlnevet
                        if (member.avatar_url.includes('/uploads/avatars/')) {
                          const filename = member.avatar_url.split('/uploads/avatars/')[1];
                          return `${apiUrl}/uploads/avatars/${filename}`;
                        }
                        return member.avatar_url.startsWith('http') ? member.avatar_url : `${apiUrl}${member.avatar_url}`;
                      })()} 
                      alt={member.full_name || member.name} 
                    />
                  ) : (
                    <div className="avatar-initial">
                      {(member.full_name || member.name || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="member-info">
                  <div className="member-name">{member.full_name || member.name || member.username}</div>
                  <div className="member-stats">
                    <span className="member-stat">
                      {memberShifts.length} beosztás ezen a héten
                    </span>
                  </div>
                </div>
                <div className="member-status online">
                  <div className="status-dot"></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="time-management-loading">
        <div className="loading-spinner"></div>
        <div className="loading-text">Adatok betöltése...</div>
      </div>
    );
  }

  return (
    <div className={`new-time-management ${darkMode ? 'dark-mode' : ''}`}>
      {/* Header */}
      <div className="time-management-header">
        <div className="header-content">
          <div className="header-left">
            <h1 className="page-title">Időmenedzsment</h1>
            <p className="page-subtitle">Családi beosztások és események kezelése</p>
          </div>
          <div className="header-right">
            <button 
              className="btn-ghost"
              onClick={toggleDarkMode}
            >
              {darkMode ? '☀️' : '🌙'}
            </button>
            <button className="btn-primary">
              ➕ Új beosztás
            </button>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="time-management-nav">
        <div className="nav-items">
          <button 
            className={`nav-item ${activeView === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveView('dashboard')}
          >
            <span className="nav-icon">🏠</span>
            <span className="nav-label">Áttekintés</span>
          </button>
          
          <button 
            className={`nav-item ${activeView === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveView('calendar')}
          >
            <span className="nav-icon">📅</span>
            <span className="nav-label">Naptár</span>
          </button>
          
          <button 
            className={`nav-item ${activeView === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveView('shifts')}
          >
            <span className="nav-icon">⏰</span>
            <span className="nav-label">Beosztások</span>
          </button>
          
          <button 
            className={`nav-item ${activeView === 'templates' ? 'active' : ''}`}
            onClick={() => setActiveView('templates')}
          >
            <span className="nav-icon">📋</span>
            <span className="nav-label">Sablonok</span>
          </button>
          
          <button 
            className={`nav-item ${activeView === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveView('analytics')}
          >
            <span className="nav-icon">📊</span>
            <span className="nav-label">Statisztikák</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="time-management-content">
        {activeView === 'dashboard' && <DashboardView />}
        {activeView === 'calendar' && <CalendarView />}
        {activeView === 'shifts' && <ShiftsView />}
        {activeView === 'templates' && <TemplatesView />}
        {activeView === 'analytics' && <AnalyticsView />}
      </div>

      {/* Modals */}
      <CreateAssignmentModal
        isOpen={showCreateAssignment}
        onClose={() => setShowCreateAssignment(false)}
        onSuccess={handleCreateAssignment}
        familyMembers={familyMembers}
        shiftTemplates={shiftTemplates}
        selectedDate={selectedModalDate}
      />

      <CreateTemplateModal
        isOpen={showCreateTemplate}
        onClose={() => setShowCreateTemplate(false)}
        onSuccess={handleCreateTemplate}
      />

      <AssignmentStatusModal
        isOpen={showAssignmentStatus}
        onClose={() => {
          setShowAssignmentStatus(false);
          setSelectedAssignment(null);
        }}
        assignment={selectedAssignment}
        template={selectedAssignment ? shiftTemplates.find(t => t.id === selectedAssignment.template_id) : null}
        member={selectedAssignment ? familyMembers.find(m => m.id === selectedAssignment.user_id) : null}
        onUpdate={handleUpdateAssignmentFromModal}
      />
    </div>
  );
};

export default NewTimeManagement;
