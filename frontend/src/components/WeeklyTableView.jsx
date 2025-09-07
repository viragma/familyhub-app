import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function WeeklyTableView({ 
  familyMembers, 
  selectedMembers, 
  selectedEventTypes, 
  currentDate 
}) {
  const { darkMode } = useTheme();

  // Generate week dates
  const getWeekDates = () => {
    const start = new Date(currentDate);
    start.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Monday
    
    const week = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      week.push(date);
    }
    return week;
  };

  const weekDates = getWeekDates();
  const dayNames = ['Hétfő', 'Kedd', 'Szerda', 'Csütörtök', 'Péntek', 'Szombat', 'Vasárnap'];

  // Sample weekly events
  const getEventsForDay = (memberId, dayIndex) => {
    const events = {
      1: { // Apa
        0: [{ text: '🔴 Reggeli műszak', time: '7:00-15:00', type: 'work' }],
        1: [{ text: '🔴 Reggeli műszak', time: '7:00-15:00', type: 'work' }],
        2: [{ text: '🔴 Reggeli műszak', time: '7:00-15:00', type: 'work' }],
        3: [{ text: '🔴 Reggeli műszak', time: '7:00-15:00', type: 'work' }],
        4: [{ text: '🔴 Reggeli műszak', time: '7:00-15:00', type: 'work' }],
        5: [{ text: '🏠 Családi nap', time: 'Egész nap', type: 'family' }],
        6: [{ text: '🏠 Pihenő', time: 'Egész nap', type: 'family' }]
      },
      2: { // Anya
        0: [{ text: '🟡 Home Office', time: '9:00-17:00', type: 'home-office' }],
        1: [
          { text: '🟡 Home Office', time: '9:00-14:00', type: 'home-office' },
          { text: '🩺 Orvos', time: '15:00-16:00', type: 'health' }
        ],
        2: [{ text: '🟡 Home Office', time: '9:00-17:00', type: 'home-office' }],
        3: [{ text: '🟡 Home Office', time: '9:00-17:00', type: 'home-office' }],
        4: [
          { text: '🟡 Home Office', time: '9:00-15:00', type: 'home-office' },
          { text: '🛒 Bevásárlás', time: '16:00-17:00', type: 'family' }
        ],
        5: [{ text: '🏠 Családi nap', time: 'Egész nap', type: 'family' }],
        6: [{ text: '🧘 Jóga', time: '10:00-11:00', type: 'family' }]
      },
      3: { // Zoé
        0: [
          { text: '🟢 Iskola', time: '8:00-14:00', type: 'school' },
          { text: '⚽ Foci edzés', time: '15:00-16:30', type: 'family' }
        ],
        1: [{ text: '🟢 Iskola', time: '8:00-14:00', type: 'school' }],
        2: [
          { text: '🟢 Iskola', time: '8:00-14:00', type: 'school' },
          { text: '🎵 Zeneóra', time: '15:00-16:00', type: 'family' }
        ],
        3: [
          { text: '🟢 Iskola', time: '8:00-14:00', type: 'school' },
          { text: '⚽ Foci edzés', time: '15:00-16:30', type: 'family' }
        ],
        4: [{ text: '🟢 Iskola', time: '8:00-14:00', type: 'school' }],
        5: [{ text: '🎊 Szabadidő', time: 'Egész nap', type: 'family' }],
        6: [{ text: '🏠 Családi nap', time: 'Egész nap', type: 'family' }]
      },
      4: { // Luca
        0: [
          { text: '🟢 Iskola', time: '8:00-13:00', type: 'school' },
          { text: '🎨 Rajzóra', time: '14:00-15:00', type: 'family' }
        ],
        1: [{ text: '🟢 Iskola', time: '8:00-13:00', type: 'school' }],
        2: [{ text: '🟢 Iskola', time: '8:00-13:00', type: 'school' }],
        3: [
          { text: '🟢 Iskola', time: '8:00-13:00', type: 'school' },
          { text: '🏊 Úszás', time: '14:00-15:00', type: 'family' }
        ],
        4: [{ text: '🟢 Iskola', time: '8:00-13:00', type: 'school' }],
        5: [{ text: '🎊 Szabadidő', time: 'Egész nap', type: 'family' }],
        6: [{ text: '🏠 Családi nap', time: 'Egész nap', type: 'family' }]
      }
    };
    
    return events[memberId] ? events[memberId][dayIndex] || [] : [];
  };

  const getEventStyling = (eventType) => {
    const styleMap = {
      work: darkMode 
        ? 'bg-red-900/30 text-red-300 border-red-700' 
        : 'bg-red-100 text-red-800 border-red-300',
      'home-office': darkMode 
        ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' 
        : 'bg-yellow-100 text-yellow-800 border-yellow-300',
      school: darkMode 
        ? 'bg-green-900/30 text-green-300 border-green-700' 
        : 'bg-green-100 text-green-800 border-green-300',
      family: darkMode 
        ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
        : 'bg-purple-100 text-purple-800 border-purple-300',
      health: darkMode 
        ? 'bg-blue-900/30 text-blue-300 border-blue-700' 
        : 'bg-blue-100 text-blue-800 border-blue-300'
    };

    return styleMap[eventType] || (darkMode 
      ? 'bg-gray-700 text-gray-400 border-gray-600' 
      : 'bg-gray-100 text-gray-600 border-gray-300');
  };

  const filteredMembers = familyMembers.filter(member => 
    selectedMembers.includes(member.id)
  );

  return (
    <div className="space-y-4">
      {/* Responsive Table Container */}
      <div className="overflow-x-auto">
        <table className={`w-full min-w-[800px] ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        } rounded-xl border ${
          darkMode ? 'border-gray-700' : 'border-gray-200'
        }`}>
          {/* Table Header */}
          <thead className={`${
            darkMode ? 'bg-gray-700' : 'bg-gray-50'
          }`}>
            <tr>
              <th className={`px-6 py-4 text-left text-sm font-semibold ${
                darkMode ? 'text-gray-200' : 'text-gray-900'
              } border-b ${
                darkMode ? 'border-gray-600' : 'border-gray-200'
              }`}>
                Családtag
              </th>
              {weekDates.map((date, index) => (
                <th key={index} className={`px-4 py-4 text-center text-sm font-semibold ${
                  darkMode ? 'text-gray-200' : 'text-gray-900'
                } border-b ${
                  darkMode ? 'border-gray-600' : 'border-gray-200'
                } ${index === new Date().getDay() - 1 ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                  <div>{dayNames[index]}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-gray-200 dark:divide-gray-600">
            {filteredMembers.map((member, memberIndex) => (
              <tr key={member.id} className={`transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-700/50`}>
                {/* Member Info Cell */}
                <td className={`px-6 py-6 whitespace-nowrap border-r ${
                  darkMode ? 'border-gray-600' : 'border-gray-200'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                        {member.name.charAt(0)}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 bg-${member.statusColor}-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse`}></div>
                    </div>
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">{member.role}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {member.currentActivity}
                      </div>
                    </div>
                  </div>
                </td>

                {/* Day Cells */}
                {weekDates.map((date, dayIndex) => {
                  const dayEvents = getEventsForDay(member.id, dayIndex);
                  const today = new Date();
                  const isToday = date.toDateString() === today.toDateString();
                  
                  return (
                    <td key={dayIndex} className={`px-3 py-4 align-top ${
                      isToday ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''
                    }`}>
                      <div className="space-y-2 min-h-[80px]">
                        {dayEvents.map((event, eventIndex) => {
                          const isFiltered = selectedEventTypes.includes(event.type);
                          
                          return (
                            <div 
                              key={eventIndex}
                              className={`px-3 py-2 rounded-lg border text-xs font-medium text-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                                getEventStyling(event.type)
                              } ${!isFiltered ? 'opacity-30' : ''}`}
                              title={`${event.text} - ${event.time}`}
                            >
                              <div className="font-semibold leading-tight">
                                {event.text}
                              </div>
                              <div className="text-xs opacity-75 mt-1">
                                {event.time}
                              </div>
                            </div>
                          );
                        })}
                        
                        {dayEvents.length === 0 && (
                          <div className={`px-3 py-4 rounded-lg border-2 border-dashed text-xs text-center ${
                            darkMode 
                              ? 'border-gray-600 text-gray-500' 
                              : 'border-gray-300 text-gray-400'
                          }`}>
                            Nincs program
                          </div>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View - Alternative for very small screens */}
      <div className="md:hidden space-y-4">
        <h3 className="font-semibold text-lg mb-4">Heti áttekintő (kártya nézet)</h3>
        {filteredMembers.map(member => (
          <div key={member.id} className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border rounded-xl p-4`}>
            {/* Member Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {member.name.charAt(0)}
                </div>
                <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-${member.statusColor}-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse`}></div>
              </div>
              <div>
                <div className="font-medium">{member.name}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{member.role}</div>
              </div>
            </div>

            {/* Days */}
            <div className="space-y-3">
              {weekDates.map((date, dayIndex) => {
                const dayEvents = getEventsForDay(member.id, dayIndex);
                const isToday = date.toDateString() === new Date().toDateString();
                
                return (
                  <div key={dayIndex} className={`p-3 rounded-lg ${
                    isToday 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700' 
                      : darkMode ? 'bg-gray-700' : 'bg-gray-50'
                  }`}>
                    <div className="font-medium text-sm mb-2">
                      {dayNames[dayIndex]} - {date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' })}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.map((event, eventIndex) => {
                        const isFiltered = selectedEventTypes.includes(event.type);
                        
                        return (
                          <div 
                            key={eventIndex}
                            className={`px-2 py-1 rounded text-xs ${
                              getEventStyling(event.type)
                            } ${!isFiltered ? 'opacity-30' : ''}`}
                          >
                            {event.text} - {event.time}
                          </div>
                        );
                      })}
                      {dayEvents.length === 0 && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                          Nincs program
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Week Summary Statistics */}
      <div className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-6 mt-6`}>
        <h4 className="font-semibold mb-4">Heti összesítő</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">
              {filteredMembers.reduce((acc, member) => 
                acc + weekDates.reduce((weekAcc, _, dayIndex) => 
                  weekAcc + getEventsForDay(member.id, dayIndex).filter(e => e.type === 'work').length, 0), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Munka</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-yellow-500">
              {filteredMembers.reduce((acc, member) => 
                acc + weekDates.reduce((weekAcc, _, dayIndex) => 
                  weekAcc + getEventsForDay(member.id, dayIndex).filter(e => e.type === 'home-office').length, 0), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Home Office</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">
              {filteredMembers.reduce((acc, member) => 
                acc + weekDates.reduce((weekAcc, _, dayIndex) => 
                  weekAcc + getEventsForDay(member.id, dayIndex).filter(e => e.type === 'school').length, 0), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Iskola</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-500">
              {filteredMembers.reduce((acc, member) => 
                acc + weekDates.reduce((weekAcc, _, dayIndex) => 
                  weekAcc + getEventsForDay(member.id, dayIndex).filter(e => e.type === 'family').length, 0), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Családi</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-500">
              {filteredMembers.reduce((acc, member) => 
                acc + weekDates.reduce((weekAcc, _, dayIndex) => 
                  weekAcc + getEventsForDay(member.id, dayIndex).filter(e => e.type === 'health').length, 0), 0)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Egészségügy</div>
          </div>
        </div>
      </div>
    </div>
  );
}
