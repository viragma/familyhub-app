import React, { useState, useEffect, useMemo } from 'react';
import { useTheme } from '../context/ThemeContext';
import CalendarModal from './CalendarModal';
import './FamilyCalendar.css';

const FamilyCalendar = ({ 
  events = [], 
  shifts = [], 
  shiftTemplates = [],
  assignments = [], 
  familyMembers = [],
  onNavigate,
  currentDate = new Date(),
  onEventClick,
  onShiftClick,
  onAssignmentClick,
  onDayClick
}) => {
  const { darkMode } = useTheme();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month'); // month, week, day
  const [filteredMembers, setFilteredMembers] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  
  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('event'); // 'event', 'shift', 'assignment'
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalSelectedDate, setModalSelectedDate] = useState(new Date());
  const [showDayOptions, setShowDayOptions] = useState(false);
  const [dayOptionsPosition, setDayOptionsPosition] = useState({ x: 0, y: 0 });
  
  // Advanced filtering options
  const [filters, setFilters] = useState({
    showShifts: true,
    showEvents: true,
    showAssignments: true,
    showPersonalEvents: true,
    showFamilyEvents: true,
    selectedMemberId: null // null = my calendar, number = specific member's calendar
  });

  // Debug: log filter state
  useEffect(() => {
    console.log('Current filters:', filters);
  }, [filters]);

  // Modal handlers
  const openModal = (type, item = null, date = new Date()) => {
    setModalType(type);
    setSelectedItem(item);
    setModalSelectedDate(date);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const handleModalSave = async (data, itemId = null) => {
    // Itt hívhatjuk meg a megfelelő API végpontokat
    console.log('Saving data:', data, 'Type:', modalType, 'ID:', itemId);
    
    // Ideiglenesen csak console log, később API hívások
    if (modalType === 'event' && onEventClick) {
      // onEventClick(data);
    } else if (modalType === 'shift' && onShiftClick) {
      // onShiftClick(data);
    } else if (modalType === 'assignment' && onAssignmentClick) {
      // onAssignmentClick(data);
    }
  };

  const handleModalDelete = async (itemId) => {
    console.log('Deleting item:', itemId, 'Type:', modalType);
    // Itt hívhatjuk meg a DELETE API végpontokat
  };

  // Handle day click with options
  const handleDayClick = (day, event) => {
    const items = getItemsForDate(day);
    const hasItems = items.shifts.length > 0 || items.events.length > 0 || items.assignments.length > 0;
    
    if (hasItems) {
      // Ha vannak elemek, akkor napi nézetre váltunk
      if (onDayClick) {
        onDayClick(day);
      } else {
        setSelectedDate(day);
        setViewMode('day');
      }
    } else {
      // Ha nincs elem, akkor kontextmenu-t mutatunk
      if (event.type === 'contextmenu') {
        event.preventDefault();
        setModalSelectedDate(day);
        setDayOptionsPosition({ x: event.clientX, y: event.clientY });
        setShowDayOptions(true);
      } else {
        // Bal kattintásnál alapértelmezett esemény modal
        openModal('event', null, day);
      }
    }
  };

  // Close day options when clicking elsewhere
  useEffect(() => {
    const handleClickOutside = () => setShowDayOptions(false);
    if (showDayOptions) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showDayOptions]);

  // Set current date when view mode changes
  useEffect(() => {
    if (currentDate && currentDate !== selectedDate) {
      setSelectedDate(new Date(currentDate));
    }
  }, [viewMode, currentDate]);

  // Responsive handler
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Generate calendar days for month view
  const generateMonthDays = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday (European style)
    const startDate = new Date(firstDay);
    const startDayOfWeek = (firstDay.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
    startDate.setDate(startDate.getDate() - startDayOfWeek);
    
    const days = [];
    const current = new Date(startDate);
    
    // Generate 6 weeks (42 days) to ensure full grid
    for (let i = 0; i < 42; i++) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  // Generate week days for week view
  const generateWeekDays = (date) => {
    const startOfWeek = new Date(date);
    const dayOfWeek = (date.getDay() + 6) % 7; // Convert to Monday = 0
    startOfWeek.setDate(date.getDate() - dayOfWeek);
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Filter items by selected family members and other criteria
  const filterByMembers = (items) => {
    return items.filter(item => {
      // If no specific member selected (common calendar), show all items
      if (filters.selectedMemberId === null) {
        return true;
      }
      
      // If specific member is selected, show only their items
      // Check if item belongs to the selected member
      if (item.user_id === filters.selectedMemberId) {
        return true;
      }
      
      // For events: check involves_members field
      if (item.involves_members) {
        const memberIds = Array.isArray(item.involves_members) 
          ? item.involves_members 
          : [item.involves_members];
        return memberIds.includes(filters.selectedMemberId);
      }
      
      return false;
    });
  };

  // Apply all filters
  const applyFilters = (items, type) => {
    // Re-enable filtering now that debugging is done
    if (type === 'shifts' && !filters.showShifts) {
      return [];
    }
    if (type === 'events' && !filters.showEvents) {
      return [];
    }
    if (type === 'assignments' && !filters.showAssignments) {
      return [];
    }
    
    let filtered = filterByMembers(items);
    
    // Event type filtering
    if (type === 'events') {
      filtered = filtered.filter(event => {
        if (event.event_type === 'family' && !filters.showFamilyEvents) return false;
        if (event.event_type !== 'family' && !filters.showPersonalEvents) return false;
        return true;
      });
    }
    
    return filtered;
  };

  // Get all items for a specific date
  const getItemsForDate = (date) => {
    // Lokális dátum string készítése timezone problémák elkerülésére
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // Events from FamilyEvent API
    const dayEvents = events.filter(event => {
      if (!event.start_time) return false;
      
      const eventStartDate = new Date(event.start_time);
      const eventStartStr = `${eventStartDate.getFullYear()}-${String(eventStartDate.getMonth() + 1).padStart(2, '0')}-${String(eventStartDate.getDate()).padStart(2, '0')}`;
      
      const eventEndDate = event.end_time ? new Date(event.end_time) : eventStartDate;
      const eventEndStr = `${eventEndDate.getFullYear()}-${String(eventEndDate.getMonth() + 1).padStart(2, '0')}-${String(eventEndDate.getDate()).padStart(2, '0')}`;
      
      return dateStr >= eventStartStr && dateStr <= eventEndStr;
    });

    // HELYES MEGKÖZELÍTÉS: Shift assignments alapján kell dolgozni!
    // Shift assignments (konkrét napra kiosztott beosztások)
    const dayShiftAssignments = assignments.filter(assignment => {
      if (assignment.date) {
        const assignmentDate = new Date(assignment.date);
        const assignmentDateStr = `${assignmentDate.getFullYear()}-${String(assignmentDate.getMonth() + 1).padStart(2, '0')}-${String(assignmentDate.getDate()).padStart(2, '0')}`;
        return assignmentDateStr === dateStr;
      }
      // Ha nincs date, akkor a due_date alapján próbáljuk (backward compatibility)
      if (assignment.due_date) {
        const assignmentDate = new Date(assignment.due_date);
        const assignmentDateStr = `${assignmentDate.getFullYear()}-${String(assignmentDate.getMonth() + 1).padStart(2, '0')}-${String(assignmentDate.getDate()).padStart(2, '0')}`;
        return assignmentDateStr === dateStr;
      }
      return false;
    });

    // Kombináljuk a shift assignment-eket a megfelelő template adatokkal
    const dayShifts = dayShiftAssignments
      .filter(assignment => assignment.template_id || assignment.shift_template_id) // Csak shift assignment-ek
      .map(assignment => {
        // Keressük meg a megfelelő template-et
        const template = shiftTemplates.find(t => 
          t.id === assignment.template_id || 
          t.id === assignment.shift_template_id ||
          (assignment.template && t.id === assignment.template.id)
        );
        
        // Ha az assignment-ben van beágyazott template
        const templateData = template || assignment.template;
        
        if (templateData) {
          const shiftData = {
            id: `assignment-${assignment.id}`,
            assignment_id: assignment.id,
            template_id: templateData.id,
            name: templateData.name,
            start_time: templateData.start_time,
            end_time: templateData.end_time,
            color: templateData.color || '#3b82f6',
            location: templateData.location,
            location_details: templateData.location_details,
            description: templateData.description,
            user_id: assignment.user_id,
            status: assignment.status || 'scheduled',
            notes: assignment.notes,
            type: 'shift_assignment'
          };
          return shiftData;
        }
        
        // Ha nincs template, akkor alapértelmezett adatokkal
        return {
          id: `assignment-${assignment.id}`,
          assignment_id: assignment.id,
          name: 'Beosztás',
          start_time: '08:00',
          end_time: '16:00',
          color: '#3b82f6',
          user_id: assignment.user_id,
          status: assignment.status || 'scheduled',
          notes: assignment.notes,
          type: 'shift_assignment'
        };
      });

    // Régi WorkShift rendszer támogatása (heti ismétlődő műszakok)
    const recurringShifts = shifts.filter(shift => {
      if (!shift.days_of_week || !shift.is_active) return false;
      const dayOfWeek = date.getDay();
      const shiftDays = shift.days_of_week.split(',').map(d => parseInt(d.trim()));
      return shiftDays.includes(dayOfWeek);
    }).map(shift => ({
      ...shift,
      type: 'recurring_shift'
    }));

    // Kombináljuk az összes műszakot
    const allShiftItems = [...dayShifts, ...recurringShifts];

    // Egyéb feladatok szűrése (nem shift related)
    const dayTasks = assignments.filter(assignment => {
      // Csak azokat a feladatokat, amelyek NEM shift assignment-ek
      if (assignment.shift_template_id || assignment.template_id) return false;
      
      if (assignment.due_date) {
        const taskDate = new Date(assignment.due_date).toISOString().split('T')[0];
        return taskDate === dateStr;
      }
      return false;
    });
    
    console.log(`Date: ${dateStr}`);
    console.log('Raw assignments:', assignments);
    console.log('Raw shiftTemplates:', shiftTemplates);
    console.log('- Shift assignments found:', dayShiftAssignments.length);
    console.log('- Combined shifts:', allShiftItems.length);
    console.log('- Events:', dayEvents.length);
    console.log('- Tasks:', dayTasks.length);
    
    if (dayShiftAssignments.length > 0) {
      console.log('Detailed shift assignments:', dayShiftAssignments);
      console.log('Mapped dayShifts:', dayShifts);
    }
    
    // Apply filters
    const filteredShifts = applyFilters(allShiftItems, 'shifts');
    const filteredEvents = applyFilters(dayEvents, 'events');
    const filteredAssignments = applyFilters(dayTasks, 'assignments');
    
    return {
      shifts: filteredShifts,
      events: filteredEvents,
      assignments: filteredAssignments
    };
  };

  // Navigation functions
  const navigateMonth = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setMonth(newDate.getMonth() + direction);
    setSelectedDate(newDate);
    onNavigate?.(newDate);
  };

  const navigateWeek = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction * 7));
    setSelectedDate(newDate);
    onNavigate?.(newDate);
  };

  const navigateDay = (direction) => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + direction);
    setSelectedDate(newDate);
    onNavigate?.(newDate);
  };

  const navigate = (direction) => {
    switch (viewMode) {
      case 'month': navigateMonth(direction); break;
      case 'week': navigateWeek(direction); break;
      case 'day': navigateDay(direction); break;
    }
  };

  // Format date for display
  const formatDate = (date, format = 'short') => {
    const options = {
      short: { month: 'short', day: 'numeric' },
      long: { year: 'numeric', month: 'long', day: 'numeric' },
      weekday: { weekday: 'short', day: 'numeric' }
    };
    return date.toLocaleDateString('hu-HU', options[format]);
  };

  const formatTime = (timeStr) => {
    // Ha már formázott idő string (pl. "08:00"), akkor azt adjuk vissza
    if (typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}$/)) {
      return timeStr;
    }
    
    // Ha Date objektum vagy datetime string
    try {
      return new Date(timeStr).toLocaleTimeString('hu-HU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (error) {
      // Ha nem tudunk valid dátumot készíteni, adjuk vissza az eredeti string-et
      return timeStr || '';
    }
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Check if date is in current month
  const isCurrentMonth = (date) => {
    return date.getMonth() === selectedDate.getMonth();
  };

  // Toggle family member filter
  const toggleMemberFilter = (memberId) => {
    const newFiltered = new Set(filteredMembers);
    if (newFiltered.has(memberId)) {
      newFiltered.delete(memberId);
    } else {
      newFiltered.add(memberId);
    }
    setFilteredMembers(newFiltered);
  };

  // Get member name by ID
  const getMemberName = (memberId) => {
    if (!memberId) return '';
    const member = familyMembers.find(m => m.id === memberId);
    return member ? (member.full_name || member.name || member.username) : 'Ismeretlen';
  };

  // Render calendar header
  const renderHeader = () => (
    <div className="family-calendar-header">
      <div className="calendar-navigation">
        <button 
          className="nav-btn"
          onClick={() => navigate(-1)}
          aria-label="Előző"
        >
          ←
        </button>
        
        <div className="current-date">
          {viewMode === 'month' && (
            <h3>{selectedDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}</h3>
          )}
          {viewMode === 'week' && (
            <h3>{formatDate(generateWeekDays(selectedDate)[0], 'short')} - {formatDate(generateWeekDays(selectedDate)[6], 'short')}</h3>
          )}
          {viewMode === 'day' && (
            <h3>{formatDate(selectedDate, 'long')}</h3>
          )}
        </div>
        
        <button 
          className="nav-btn"
          onClick={() => navigate(1)}
          aria-label="Következő"
        >
          →
        </button>
      </div>

      <div className="calendar-controls">
        <div className="view-modes">
          <button 
            className={`view-btn ${viewMode === 'month' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('month');
              setSelectedDate(new Date());
            }}
          >
            Hónap
          </button>
          <button 
            className={`view-btn ${viewMode === 'week' ? 'active' : ''}`}
            onClick={() => {
              setViewMode('week');
              setSelectedDate(new Date());
            }}
          >
            Hét
          </button>
          {!isMobile && (
            <button 
              className={`view-btn ${viewMode === 'day' ? 'active' : ''}`}
              onClick={() => {
                setViewMode('day');
                setSelectedDate(new Date());
              }}
            >
              Nap
            </button>
          )}
        </div>

        <div className="filter-controls">
          <button 
            className="filter-btn quick-action"
            onClick={() => openModal('event', null, selectedDate)}
            title="Új esemény hozzáadása"
          >
            <span className="filter-icon">📅</span>
            Esemény
          </button>
          
          <button 
            className="filter-btn quick-action shift"
            onClick={() => openModal('shift', null, selectedDate)}
            title="Új beosztás hozzáadása"
          >
            <span className="filter-icon">⏰</span>
            Beosztás
          </button>
          
          <button 
            className={`filter-btn ${showFilters ? 'active' : ''}`}
            onClick={() => setShowFilters(!showFilters)}
            title="Szűrők megjelenítése/elrejtése"
          >
            <span className="filter-icon">🔍</span>
            Szűrők
            {(filteredMembers.size > 0 || !Object.values(filters).every(v => v)) && (
              <span className="filter-badge">{filteredMembers.size || '!'}</span>
            )}
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-section">
            <h4>Típus szerint</h4>
            <div className="filter-checkboxes">
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.showShifts}
                  onChange={(e) => setFilters(prev => ({...prev, showShifts: e.target.checked}))}
                />
                <span className="checkmark shift"></span>
                Beosztások
              </label>
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.showEvents}
                  onChange={(e) => setFilters(prev => ({...prev, showEvents: e.target.checked}))}
                />
                <span className="checkmark event"></span>
                Események
              </label>
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.showAssignments}
                  onChange={(e) => setFilters(prev => ({...prev, showAssignments: e.target.checked}))}
                />
                <span className="checkmark assignment"></span>
                Feladatok
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h4>Esemény típus</h4>
            <div className="filter-checkboxes">
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.showFamilyEvents}
                  onChange={(e) => setFilters(prev => ({...prev, showFamilyEvents: e.target.checked}))}
                />
                <span className="checkmark family"></span>
                Családi események
              </label>
              <label className="filter-checkbox">
                <input 
                  type="checkbox" 
                  checked={filters.showPersonalEvents}
                  onChange={(e) => setFilters(prev => ({...prev, showPersonalEvents: e.target.checked}))}
                />
                <span className="checkmark personal"></span>
                Személyes események
              </label>
            </div>
          </div>

          <div className="filter-section">
            <h4>Naptár nézet</h4>
            <div className="member-calendar-selector">
              <button
                className={`member-calendar-option ${filters.selectedMemberId === null ? 'active' : ''}`}
                onClick={() => setFilters(prev => ({...prev, selectedMemberId: null}))}
              >
                <div className="member-calendar-avatar all-members">
                  👥
                </div>
                <span>Közös naptár</span>
              </button>
              
              {console.log('FamilyMembers in render:', familyMembers)}
              {familyMembers && familyMembers.length > 0 ? familyMembers.map(member => {
                console.log('Rendering member:', member);
                return (
                  <button
                    key={member.id}
                    className={`member-calendar-option ${filters.selectedMemberId === member.id ? 'active' : ''}`}
                    onClick={() => setFilters(prev => ({...prev, selectedMemberId: member.id}))}
                  >
                    <div className="member-calendar-avatar">
                      {member.avatar_url ? (
                        <img 
                          src={member.avatar_url} 
                          alt={member.full_name || member.name || member.username}
                          className="member-avatar-image"
                        />
                      ) : (
                        <span className="member-avatar-initial">
                          {(member.full_name || member.name || member.username || '?').charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <span style={{display: 'block', visibility: 'visible'}}>
                      {member.full_name || member.name || member.username || 'Ismeretlen'}
                    </span>
                  </button>
                );
              }) : (
                <div style={{padding: '1rem', color: 'red'}}>
                  Nincsenek családtagok betöltve (familyMembers: {JSON.stringify(familyMembers)})
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // Render month view
  const renderMonthView = () => {
    const days = generateMonthDays(selectedDate);
    const weekDays = ['H', 'K', 'Sze', 'Cs', 'P', 'Szo', 'V'];

    return (
      <div className="month-view">
        <div className="weekday-headers">
          {weekDays.map((day, index) => (
            <div key={`weekday-${index}`} className="weekday-header">{day}</div>
          ))}
        </div>
        <div className="month-grid">
          {days.map((day, index) => {
            const items = getItemsForDate(day);
            const totalItems = items.events.length + items.shifts.length + items.assignments.length;
            
            return (
              <div 
                key={index}
                className={`calendar-day ${isToday(day) ? 'today' : ''} ${!isCurrentMonth(day) ? 'other-month' : ''}`}
                onClick={(e) => handleDayClick(day, e)}
                onContextMenu={(e) => handleDayClick(day, e)}
              >
                <div className="day-number">{day.getDate()}</div>
                {totalItems > 0 && (
                  <div className="day-items">
                    {items.shifts.map((shift, idx) => (
                      <div 
                        key={`shift-${idx}`}
                        className={`item-indicator shift ${shift.isTemplate ? 'template' : ''}`}
                        style={{ backgroundColor: shift.color || '#3b82f6' }}
                        title={`${shift.name || 'Beosztás'} - ${getMemberName(shift.user_id)}${shift.isTemplate ? ' (Sablon)' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('shift', shift, day);
                        }}
                      />
                    ))}
                    {items.events.map((event, idx) => (
                      <div 
                        key={`event-${idx}`}
                        className="item-indicator event" 
                        style={{ backgroundColor: event.color || '#10b981' }}
                        title={`${event.title} - ${event.event_type}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('event', event, day);
                        }}
                      />
                    ))}
                    {items.assignments.map((assignment, idx) => (
                      <div 
                        key={`assignment-${idx}`}
                        className="item-indicator assignment" 
                        style={{ backgroundColor: assignment.color || '#f59e0b' }}
                        title={`${assignment.title || 'Feladat'} - ${getMemberName(assignment.user_id)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          openModal('assignment', assignment, day);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render week view
  const renderWeekView = () => {
    const days = generateWeekDays(selectedDate);
    
    return (
      <div className="week-view">
        <div className="week-headers">
          {days.map(day => (
            <div key={day.toISOString()} className="week-day-header">
              <div className="weekday-name">
                {day.toLocaleDateString('hu-HU', { weekday: 'short' })}
              </div>
              <div className={`day-number ${isToday(day) ? 'today' : ''}`}>
                {day.getDate()}
              </div>
            </div>
          ))}
        </div>
        <div className="week-content">
          {days.map(day => {
            const items = getItemsForDate(day);
            return (
              <div 
                key={day.toISOString()} 
                className="week-day"
                onClick={(e) => handleDayClick(day, e)}
                onContextMenu={(e) => handleDayClick(day, e)}
              >
                {items.shifts.map((shift, idx) => (
                  <div 
                    key={`shift-${idx}`}
                    className={`week-item shift ${shift.isTemplate ? 'template-shift' : ''}`}
                    style={{ borderLeft: `4px solid ${shift.color || '#3b82f6'}` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal('shift', shift, day);
                    }}
                    title={shift.isTemplate ? 'Műszaksablon' : 'Beosztás'}
                  >
                    <div className="item-time">
                      {shift.start_time && shift.end_time 
                        ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
                        : 'Egész nap'
                      }
                    </div>
                    <div className="item-title">{shift.name || 'Beosztás'}</div>
                    <div className="item-person">{getMemberName(shift.user_id)}</div>
                  </div>
                ))}
                {items.events.map((event, idx) => (
                  <div 
                    key={`event-${idx}`}
                    className="week-item event"
                    style={{ borderLeft: `4px solid ${event.color || '#10b981'}` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal('event', event, day);
                    }}
                  >
                    <div className="item-time">
                      {event.start_time && event.end_time 
                        ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
                        : formatTime(event.start_time)
                      }
                    </div>
                    <div className="item-title">{event.title}</div>
                    {event.location && (
                      <div className="item-location">📍 {event.location}</div>
                    )}
                  </div>
                ))}
                {items.assignments.map((assignment, idx) => (
                  <div 
                    key={`assignment-${idx}`}
                    className="week-item assignment"
                    style={{ borderLeft: `4px solid ${assignment.color || '#f59e0b'}` }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssignmentClick?.(assignment);
                    }}
                  >
                    <div className="item-title">{assignment.title || 'Feladat'}</div>
                    <div className="item-person">{getMemberName(assignment.user_id)}</div>
                    {assignment.notes && (
                      <div className="item-description">{assignment.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const items = getItemsForDate(selectedDate);
    
    return (
      <div className="day-view">
        <div className="day-header">
          <h4>{formatDate(selectedDate, 'long')}</h4>
        </div>
        <div className="day-content">
          {items.shifts.length > 0 && (
            <div className="day-section">
              <h5>Beosztások</h5>
              {items.shifts.map((shift, idx) => (
                <div 
                  key={idx}
                  className={`day-item shift ${shift.isTemplate ? 'template-shift' : ''}`}
                  onClick={() => onShiftClick?.(shift)}
                  style={{ borderLeft: `4px solid ${shift.color || '#3b82f6'}` }}
                  title={shift.isTemplate ? 'Műszaksablon' : 'Beosztás'}
                >
                  <div className="item-time">
                    {shift.start_time && shift.end_time 
                      ? `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`
                      : 'Egész nap'
                    }
                  </div>
                  <div className="item-details">
                    <div className="item-title">{shift.name || 'Beosztás'}</div>
                    <div className="item-person">{getMemberName(shift.user_id)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {items.events.length > 0 && (
            <div className="day-section">
              <h5>Események</h5>
              {items.events.map((event, idx) => (
                <div 
                  key={idx}
                  className="day-item event"
                  onClick={() => openModal('event', event, selectedDate)}
                  style={{ borderLeft: `4px solid ${event.color || '#10b981'}` }}
                >
                  <div className="item-time">
                    {event.start_time && event.end_time 
                      ? `${formatTime(event.start_time)} - ${formatTime(event.end_time)}`
                      : formatTime(event.start_time)
                    }
                  </div>
                  <div className="item-details">
                    <div className="item-title">{event.title}</div>
                    {event.description && (
                      <div className="item-description">{event.description}</div>
                    )}
                    {event.location && (
                      <div className="item-location">📍 {event.location}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {items.assignments.length > 0 && (
            <div className="day-section">
              <h5>Feladatok</h5>
              {items.assignments.map((assignment, idx) => (
                <div 
                  key={idx}
                  className="day-item assignment"
                  onClick={() => onAssignmentClick?.(assignment)}
                  style={{ borderLeft: `4px solid ${assignment.color || '#f59e0b'}` }}
                >
                  <div className="item-details">
                    <div className="item-title">{assignment.title || 'Feladat'}</div>
                    <div className="item-person">{getMemberName(assignment.user_id)}</div>
                    {assignment.notes && (
                      <div className="item-description">{assignment.notes}</div>
                    )}
                    {assignment.shift_template_id && (
                      <div className="item-template">Template: {assignment.shift_template_id}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {items.shifts.length === 0 && items.events.length === 0 && items.assignments.length === 0 && (
            <div className="no-items">
              Nincs esemény ezen a napon
            </div>
          )}
        </div>
      </div>
    );
  };

  // Helper function to get the currently viewed member's name
  const getCurrentCalendarTitle = () => {
    if (filters.selectedMemberId === null) {
      return "Közös családi naptár";
    }
    const member = familyMembers.find(m => m.id === filters.selectedMemberId);
    return member ? `${member.full_name || member.name || member.username} naptára` : "Naptár";
  };

  return (
    <div className={`family-calendar ${darkMode ? 'dark-mode' : ''}`}>
      {/* Calendar Title Header */}
      <div className="calendar-title-header">
        <div className="calendar-title-content">
          <div className="current-calendar-info">
            <div className="current-calendar-avatar">
              {filters.selectedMemberId === null ? (
                <span className="all-members-icon">👥</span>
              ) : (
                (() => {
                  const member = familyMembers.find(m => m.id === filters.selectedMemberId);
                  return member?.avatar_url ? (
                    <img 
                      src={member.avatar_url} 
                      alt={member.full_name || member.name || member.username}
                      className="current-member-avatar"
                    />
                  ) : (
                    <span className="current-member-initial">
                      {(member?.full_name || member?.name || member?.username || '?').charAt(0).toUpperCase()}
                    </span>
                  );
                })()
              )}
            </div>
            <div className="current-calendar-text">
              <h2>{getCurrentCalendarTitle()}</h2>
              <p className="calendar-subtitle">
                {filters.selectedMemberId === null 
                  ? "Minden családtag eseményei és beosztásai" 
                  : "Személyes események és beosztások"
                }
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="calendar-navigation">
        {renderHeader()}
      </div>

      <div className="calendar-content">
        {viewMode === 'month' && renderMonthView()}
        {viewMode === 'week' && renderWeekView()}
        {viewMode === 'day' && renderDayView()}
      </div>
      
      {/* Modern Calendar Modal */}
      <CalendarModal
        isOpen={showModal}
        onClose={closeModal}
        onSave={handleModalSave}
        onDelete={handleModalDelete}
        item={selectedItem}
        type={modalType}
        selectedDate={modalSelectedDate}
        familyMembers={familyMembers}
        shiftTemplates={shiftTemplates}
      />

      {/* Day Options Context Menu */}
      {showDayOptions && (
        <div 
          className={`day-options-menu ${darkMode ? 'dark-mode' : ''}`}
          style={{
            left: `${dayOptionsPosition.x}px`,
            top: `${dayOptionsPosition.y}px`
          }}
        >
          <button 
            className="day-option"
            onClick={() => {
              openModal('event', null, modalSelectedDate);
              setShowDayOptions(false);
            }}
          >
            <span className="day-option-icon">📅</span>
            Új esemény
          </button>
          <button 
            className="day-option"
            onClick={() => {
              openModal('shift', null, modalSelectedDate);
              setShowDayOptions(false);
            }}
          >
            <span className="day-option-icon">⏰</span>
            Új beosztás
          </button>
          <button 
            className="day-option"
            onClick={() => {
              openModal('assignment', null, modalSelectedDate);
              setShowDayOptions(false);
            }}
          >
            <span className="day-option-icon">📝</span>
            Új feladat
          </button>
        </div>
      )}
    </div>
  );
};

export default FamilyCalendar;
