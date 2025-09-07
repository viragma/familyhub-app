import React from 'react';

// Egyszerű, újraírt naptár komponens
const SimpleCalendar = ({ 
  currentDate, 
  navigateMonth, 
  events, 
  assignments, 
  shifts, 
  templates,
  compactView, 
  ultraCompactView,
  getEventsForDate,
  getShiftsForDate,
  getAssignmentsForDate,
  getTemplateInfo,
  isToday,
  formatTime,
  formatDate 
}) => {
  
  // Naptár napjainak generálása - Egyszerű logika
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const startDay = firstDay.getDay();
    const mondayStart = startDay === 0 ? 6 : startDay - 1;
    
    const days = [];
    const startDate = new Date(firstDay);
    startDate.setDate(firstDay.getDate() - mondayStart);
    
    for (let i = 0; i < 42; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      
      days.push({
        date: date,
        isCurrentMonth: date.getMonth() === month
      });
    }
    
    return days;
  };

  // Többnapos esemény csíkok - Egyszerű logika
  const getMultiDayBars = () => {
    if (!events) return [];
    
    const bars = [];
    const calendarDays = generateCalendarDays();
    
    events.forEach((event, index) => {
      if (!event.end_time) return;
      
      const start = new Date(event.start_time);
      const end = new Date(event.end_time);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);
      
      if (start.getTime() === end.getTime()) return; // Egynapos
      
      console.log(`Processing multi-day event: ${event.title}`);
      console.log(`From: ${start.toDateString()} to ${end.toDateString()}`);
      
      // Keresem az esemény napjait a naptárban
      const eventDays = [];
      calendarDays.forEach((day, dayIndex) => {
        const dayTime = new Date(day.date);
        dayTime.setHours(0, 0, 0, 0);
        
        if (dayTime.getTime() >= start.getTime() && dayTime.getTime() <= end.getTime()) {
          eventDays.push({
            dayIndex,
            weekIndex: Math.floor(dayIndex / 7),
            dayInWeek: dayIndex % 7,
            date: day.date
          });
        }
      });
      
      console.log(`Event spans ${eventDays.length} days in calendar`);
      
      // Hetekre bontás
      const weeks = {};
      eventDays.forEach(day => {
        if (!weeks[day.weekIndex]) weeks[day.weekIndex] = [];
        weeks[day.weekIndex].push(day);
      });
      
      Object.keys(weeks).forEach(weekIndex => {
        const weekDays = weeks[weekIndex];
        const startDay = weekDays[0].dayInWeek;
        const endDay = weekDays[weekDays.length - 1].dayInWeek;
        
        console.log(`Week ${weekIndex}: days ${startDay}-${endDay}`);
        
        bars.push({
          event,
          weekIndex: parseInt(weekIndex),
          startDay,
          endDay,
          level: index % 3,
          id: `${event.id}-w${weekIndex}`
        });
      });
    });
    
    console.log(`Generated ${bars.length} multi-day bars`);
    return bars;
  };

  const monthNames = [
    'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
    'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
  ];

  const dayNames = ['Hét', 'Ked', 'Sze', 'Csü', 'Pén', 'Szo', 'Vas'];

  const calendarDays = generateCalendarDays();
  const multiDayBars = getMultiDayBars();

  return (
    <div className="timemanager-calendar-wrapper">
      <div className="timemanager-calendar-controls">
        <div className="timemanager-month-navigator">
          <button className="timemanager-nav-button" onClick={() => navigateMonth('prev')}>‹ Előző</button>
          <h3 className="timemanager-month-display">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</h3>
          <button className="timemanager-nav-button" onClick={() => navigateMonth('next')}>Következő ›</button>
        </div>
        <div className="timemanager-view-indicator">
          <span className={`timemanager-view-badge ${ultraCompactView ? 'timemanager-ultra-active' : compactView ? 'timemanager-compact-active' : 'timemanager-normal-active'}`}>
            {ultraCompactView ? '📱 Ultra' : compactView ? '📱 Kompakt' : '🖥️ Normál'}
          </span>
        </div>
      </div>

      <div className={`timemanager-calendar-layout ${compactView ? 'timemanager-calendar-compact' : ''} ${ultraCompactView ? 'timemanager-calendar-ultra-compact' : ''}`}>
        
        {/* Többnapos esemény csíkok */}
        <div className="timemanager-event-bars-container">
          {multiDayBars.map(bar => {
            const gridColumn = `${bar.startDay + 1} / ${bar.endDay + 2}`;
            const gridRow = bar.weekIndex + 2; // +2 a header miatt
            
            let marginTop = 25, height = 18, fontSize = 10;
            if (compactView && !ultraCompactView) {
              marginTop = 45; height = 16; fontSize = 9;
            } else if (ultraCompactView) {
              marginTop = 35; height = 14; fontSize = 8;
              if (bar.level > 0) return null;
            }
            
            console.log(`RENDER BAR: ${bar.event.title} at grid ${gridColumn}, row ${gridRow}`);
            
            return (
              <div
                key={bar.id}
                className="timemanager-event-bar"
                style={{
                  backgroundColor: bar.event.color || '#3b82f6',
                  gridColumn, 
                  gridRow,
                  height: `${height}px`,
                  marginTop: `${marginTop + bar.level * 15}px`,
                  margin: '2px',
                  borderRadius: `${height / 2}px`,
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0 6px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.2)',
                  pointerEvents: 'auto', 
                  cursor: 'pointer',
                  fontSize: `${fontSize}px`, 
                  fontWeight: '500',
                  color: 'white', 
                  textShadow: '0 1px 1px rgba(0, 0, 0, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  whiteSpace: 'nowrap', 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  zIndex: 10 + bar.level
                }}
                title={`${bar.event.title}\n${formatDate(bar.event.start_time)} - ${formatDate(bar.event.end_time)}`}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {bar.event.title}
                </span>
              </div>
            );
          })}
        </div>

        {/* Nap fejlécek */}
        {dayNames.map(day => (
          <div key={day} className="timemanager-day-header">{day}</div>
        ))}

        {/* Naptár cellák */}
        {calendarDays.map((dayInfo, index) => {
          const { date, isCurrentMonth } = dayInfo;
          const dayEvents = getEventsForDate(date).filter(event => 
            !event.end_time || new Date(event.start_time).toDateString() === new Date(event.end_time).toDateString()
          );
          const dayShifts = getShiftsForDate(date);
          const dayAssignments = getAssignmentsForDate(date);

          return (
            <div 
              key={index} 
              className={`timemanager-calendar-cell ${!isCurrentMonth ? 'timemanager-other-month' : ''} ${isToday(date) ? 'timemanager-today' : ''}`}
            >
              <div className="timemanager-date-number">{date.getDate()}</div>
              <div className="timemanager-events-list">
                
                {/* Műszakbeosztások */}
                {dayAssignments.map(assignment => {
                  const template = getTemplateInfo(assignment.template_id);
                  if (!template) return null;
                  
                  if (ultraCompactView) {
                    return (
                      <div key={`assignment-${assignment.id}`} className="timemanager-assignment-dot" 
                        style={{ backgroundColor: template.color }}
                        title={`${template.name} - ${formatTime(template.start_time)}`}>
                        {formatTime(template.start_time).substring(0, 2)}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={`assignment-${assignment.id}`} className="timemanager-assignment-item" 
                      style={{ backgroundColor: template.color }}
                      title={`${template.name} - ${formatTime(template.start_time)} - ${formatTime(template.end_time)}`}>
                      <div className="timemanager-assignment-content">
                        <span className="timemanager-assignment-icon">🏭</span>
                        <span className="timemanager-assignment-name">{template.name.substring(0, 8)}</span>
                        <span className="timemanager-assignment-time">{formatTime(template.start_time).substring(0, 5)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Automata műszakok */}
                {dayShifts.map(shift => {
                  if (ultraCompactView) {
                    return (
                      <div key={`shift-${shift.id}`} className="timemanager-shift-dot" 
                        style={{ backgroundColor: shift.color }}
                        title={`${shift.name} - ${formatTime(shift.start_time)}`}>
                        {formatTime(shift.start_time).substring(0, 2)}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={`shift-${shift.id}`} className="timemanager-shift-item" 
                      style={{ backgroundColor: shift.color }}
                      title={`${shift.name} - ${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`}>
                      <div className="timemanager-shift-content">
                        <span className="timemanager-shift-icon">⚙️</span>
                        <span className="timemanager-shift-name">{shift.name.substring(0, 8)}</span>
                        <span className="timemanager-shift-time">{formatTime(shift.start_time).substring(0, 5)}</span>
                      </div>
                    </div>
                  );
                })}

                {/* Egynapos események */}
                {dayEvents.map(event => {
                  if (ultraCompactView) {
                    return (
                      <div key={`event-${event.id}`} className="timemanager-event-dot" 
                        style={{ backgroundColor: event.color || '#3b82f6' }}
                        title={`${event.title} - ${formatTime(event.start_time)}`}>
                        {formatTime(event.start_time).substring(0, 2)}
                      </div>
                    );
                  }
                  
                  return (
                    <div key={`event-${event.id}`} className="timemanager-event-item" 
                      style={{ backgroundColor: event.color || '#3b82f6' }}
                      title={`${event.title} - ${formatTime(event.start_time)}`}>
                      <div className="timemanager-event-content">
                        <span className="timemanager-event-icon">📅</span>
                        <span className="timemanager-event-name">{event.title.substring(0, 8)}</span>
                        <span className="timemanager-event-time">{formatTime(event.start_time).substring(0, 5)}</span>
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
  );
};

export default SimpleCalendar;
