import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function MonthlyCalendarView({ 
  familyMembers, 
  selectedMembers, 
  selectedEventTypes, 
  currentDate 
}) {
  const { darkMode } = useTheme();

  // Generate calendar days for the month
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    
    // Start from Monday of the week containing the first day
    const startDate = new Date(firstDay);
    const dayOfWeek = firstDay.getDay();
    startDate.setDate(firstDay.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
    
    // Generate 42 days (6 weeks) to fill the calendar grid
    const days = [];
    const currentDay = new Date(startDate);
    
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDay));
      currentDay.setDate(currentDay.getDate() + 1);
    }
    
    return { days, currentMonth: month, currentYear: year };
  };

  const { days, currentMonth, currentYear } = generateCalendarDays();
  const dayNames = ['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'];
  const today = new Date();

  // Sample monthly events
  const getEventsForDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth();
    
    // Only show events for current month
    if (month !== currentMonth) return [];
    
    const events = {
      1: [{ member: 'Apa', text: 'Munka', type: 'work' }],
      3: [
        { member: 'Zoé', text: 'Foci', type: 'family' },
        { member: 'Anya', text: 'Orvos', type: 'health' }
      ],
      5: [
        { member: 'Család', text: 'Családi kirándulás', type: 'family' },
        { member: 'Apa', text: 'Szabadság', type: 'family' }
      ],
      8: [{ member: 'Luca', text: 'Úszás', type: 'family' }],
      10: [
        { member: 'Anya', text: 'Home Office projekt', type: 'home-office' },
        { member: 'Zoé', text: 'Zeneóra', type: 'family' }
      ],
      12: [{ member: 'Család', text: 'Orvos - Luca', type: 'health' }],
      15: [
        { member: 'Apa', text: 'Munka - extra műszak', type: 'work' },
        { member: 'Anya', text: 'Fontos meeting', type: 'home-office' },
        { member: 'Zoé', text: 'Iskolai rendezvény', type: 'school' },
        { member: 'Luca', text: 'Rajzverseny', type: 'family' }
      ],
      18: [{ member: 'Család', text: 'Nagymamaék látogatása', type: 'family' }],
      20: [
        { member: 'Zoé', text: 'Foci meccs', type: 'family' },
        { member: 'Luca', text: 'Rajzóra', type: 'family' }
      ],
      22: [{ member: 'Anya', text: 'Fogász', type: 'health' }],
      25: [
        { member: 'Család', text: 'Születésnap - Zoé', type: 'family' },
        { member: 'Apa', text: 'Szabadság', type: 'family' }
      ],
      28: [{ member: 'Család', text: 'Bevásárlás', type: 'family' }],
      30: [{ member: 'Luca', text: 'Úszóverseny', type: 'family' }]
    };
    
    return events[day] || [];
  };

  const getEventStyling = (eventType) => {
    const styleMap = {
      work: darkMode 
        ? 'bg-red-900/40 text-red-300' 
        : 'bg-red-100 text-red-700',
      'home-office': darkMode 
        ? 'bg-yellow-900/40 text-yellow-300' 
        : 'bg-yellow-100 text-yellow-700',
      school: darkMode 
        ? 'bg-green-900/40 text-green-300' 
        : 'bg-green-100 text-green-700',
      family: darkMode 
        ? 'bg-purple-900/40 text-purple-300' 
        : 'bg-purple-100 text-purple-700',
      health: darkMode 
        ? 'bg-blue-900/40 text-blue-300' 
        : 'bg-blue-100 text-blue-700'
    };

    return styleMap[eventType] || (darkMode 
      ? 'bg-gray-700 text-gray-400' 
      : 'bg-gray-100 text-gray-600');
  };

  const isToday = (date) => {
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date) => {
    return date.getMonth() === currentMonth;
  };

  const isWeekend = (date) => {
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday or Saturday
  };

  return (
    <div className="space-y-6">
      {/* Month Statistics */}
      <div className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-6`}>
        <h3 className="font-semibold text-lg mb-4">
          {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })} összesítő
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { type: 'work', label: 'Munka', color: 'text-red-500', count: 12 },
            { type: 'home-office', label: 'Home Office', color: 'text-yellow-500', count: 8 },
            { type: 'school', label: 'Iskola', color: 'text-green-500', count: 20 },
            { type: 'family', label: 'Családi', color: 'text-purple-500', count: 15 },
            { type: 'health', label: 'Egészségügy', color: 'text-blue-500', count: 4 }
          ].map((stat) => (
            <div key={stat.type} className="text-center">
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.count}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-6`}>
        
        {/* Day Headers */}
        <div className="grid grid-cols-7 gap-2 mb-4">
          {dayNames.map((dayName, index) => (
            <div key={index} className={`text-center font-semibold py-3 text-sm ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              <span className="hidden sm:inline">
                {['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'][index]}
              </span>
              <span className="sm:hidden">{dayName}</span>
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-2">
          {days.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            const filteredEvents = dayEvents.filter(event => 
              selectedEventTypes.includes(event.type)
            );
            
            return (
              <div
                key={index}
                className={`min-h-[100px] sm:min-h-[120px] p-2 border rounded-lg transition-all duration-200 hover:shadow-md cursor-pointer ${
                  isToday(date)
                    ? 'bg-blue-500/10 border-blue-500/30 ring-2 ring-blue-500/20'
                    : isCurrentMonth(date)
                      ? darkMode
                        ? 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                      : darkMode
                        ? 'bg-gray-900 border-gray-800 text-gray-600'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                } ${
                  isWeekend(date) && isCurrentMonth(date)
                    ? darkMode
                      ? 'bg-indigo-900/20 border-indigo-700/30'
                      : 'bg-indigo-50 border-indigo-200'
                    : ''
                }`}
              >
                {/* Day Number */}
                <div className={`font-bold text-sm mb-2 ${
                  isToday(date)
                    ? 'text-blue-600 dark:text-blue-400'
                    : isCurrentMonth(date)
                      ? darkMode ? 'text-gray-200' : 'text-gray-900'
                      : 'text-gray-400'
                }`}>
                  {date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {filteredEvents.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={`px-1 py-0.5 rounded text-xs font-medium truncate ${
                        getEventStyling(event.type)
                      }`}
                      title={`${event.member}: ${event.text}`}
                    >
                      <span className="hidden sm:inline">{event.member}: </span>
                      {event.text}
                    </div>
                  ))}
                  
                  {/* More events indicator */}
                  {filteredEvents.length > 3 && (
                    <div className={`text-xs text-center font-medium ${
                      darkMode ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      +{filteredEvents.length - 3} több
                    </div>
                  )}
                  
                  {/* Hidden events indicator */}
                  {dayEvents.length > filteredEvents.length && (
                    <div className={`text-xs text-center font-medium opacity-50 ${
                      darkMode ? 'text-gray-500' : 'text-gray-400'
                    }`}>
                      ⦁⦁⦁
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Event List - Alternative view for small screens */}
      <div className="sm:hidden space-y-4">
        <h3 className="font-semibold text-lg">Havi események (lista nézet)</h3>
        <div className="space-y-3">
          {days
            .filter(date => isCurrentMonth(date) && getEventsForDate(date).length > 0)
            .map((date, index) => {
              const dayEvents = getEventsForDate(date);
              const filteredEvents = dayEvents.filter(event => 
                selectedEventTypes.includes(event.type)
              );
              
              if (filteredEvents.length === 0) return null;
              
              return (
                <div key={index} className={`${
                  darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                } border rounded-lg p-4 ${
                  isToday(date) ? 'ring-2 ring-blue-500/20 border-blue-500/30' : ''
                }`}>
                  <div className="font-semibold mb-2">
                    {date.toLocaleDateString('hu-HU', { 
                      month: 'long', 
                      day: 'numeric',
                      weekday: 'long'
                    })}
                    {isToday(date) && (
                      <span className="ml-2 px-2 py-1 bg-blue-500 text-white text-xs rounded-full">
                        MA
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    {filteredEvents.map((event, eventIndex) => (
                      <div key={eventIndex} className={`px-3 py-2 rounded ${
                        getEventStyling(event.type)
                      }`}>
                        <div className="font-medium">{event.member}</div>
                        <div className="text-sm">{event.text}</div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Quick Actions */}
      <div className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-6`}>
        <h4 className="font-semibold mb-4">Gyors műveletek</h4>
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium">
            ➕ Új esemény
          </button>
          <button className={`px-4 py-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium ${
            darkMode 
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}>
            📅 Naptár export
          </button>
          <button className={`px-4 py-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium ${
            darkMode 
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}>
            🔄 Szinkronizálás
          </button>
          <button className={`px-4 py-2 rounded-lg border transition-all duration-200 hover:scale-105 active:scale-95 text-sm font-medium ${
            darkMode 
              ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
              : 'border-gray-300 text-gray-700 hover:bg-gray-100'
          }`}>
            📊 Jelentés
          </button>
        </div>
      </div>
    </div>
  );
}
