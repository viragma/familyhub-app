import React from 'react';
import { useTheme } from '../context/ThemeContext';

export default function DailyTimelineView({ 
  familyMembers, 
  selectedMembers, 
  selectedEventTypes, 
  currentDate 
}) {
  const { darkMode } = useTheme();

  // Sample events data for demo
  const getEventsForMember = (memberId, hour) => {
    const events = {
      1: { // Apa
        8: { text: '🔴 Munka', type: 'work' },
        9: { text: '🔴 Munka', type: 'work' },
        10: { text: '🔴 Munka', type: 'work' },
        11: { text: '🔴 Munka', type: 'work' },
        12: { text: '🍽️ Ebéd', type: 'family' },
        13: { text: '🔴 Munka', type: 'work' },
        14: { text: '🔴 Munka', type: 'work' },
        15: { text: '🔴 Munka', type: 'work' }
      },
      2: { // Anya
        8: { text: '🟡 Home Office', type: 'home-office' },
        9: { text: '🟡 Home Office', type: 'home-office' },
        10: { text: '🟡 Home Office', type: 'home-office' },
        11: { text: '🟡 Home Office', type: 'home-office' },
        12: { text: '🍽️ Ebéd', type: 'family' },
        13: { text: '🟡 Home Office', type: 'home-office' },
        14: { text: '🩺 Orvos', type: 'health' },
        15: { text: '🛒 Bevásárlás', type: 'family' }
      },
      3: { // Zoé
        8: { text: '🟢 Iskola', type: 'school' },
        9: { text: '🟢 Iskola', type: 'school' },
        10: { text: '🟢 Iskola', type: 'school' },
        11: { text: '🟢 Iskola', type: 'school' },
        12: { text: '🍽️ Ebéd', type: 'school' },
        13: { text: '🟢 Iskola', type: 'school' },
        14: { text: '⚽ Foci', type: 'family' }
      },
      4: { // Luca
        8: { text: '🟢 Iskola', type: 'school' },
        9: { text: '🟢 Iskola', type: 'school' },
        10: { text: '🟢 Iskola', type: 'school' },
        11: { text: '🟢 Iskola', type: 'school' },
        12: { text: '🍽️ Ebéd', type: 'school' },
        13: { text: '🎨 Rajz', type: 'family' }
      }
    };
    
    return events[memberId] ? events[memberId][hour] : null;
  };

  const getEventBarStyling = (event, hour) => {
    if (!event) {
      return darkMode 
        ? 'bg-gray-700 text-gray-400 border-gray-600' 
        : 'bg-gray-100 text-gray-600 border-gray-300';
    }

    const styleMap = {
      work: darkMode 
        ? 'bg-red-900/30 text-red-300 border-red-700' 
        : 'bg-red-200 text-red-800 border-red-300',
      'home-office': darkMode 
        ? 'bg-yellow-900/30 text-yellow-300 border-yellow-700' 
        : 'bg-yellow-200 text-yellow-800 border-yellow-300',
      school: darkMode 
        ? 'bg-green-900/30 text-green-300 border-green-700' 
        : 'bg-green-200 text-green-800 border-green-300',
      family: darkMode 
        ? 'bg-purple-900/30 text-purple-300 border-purple-700' 
        : 'bg-purple-200 text-purple-800 border-purple-300',
      health: darkMode 
        ? 'bg-blue-900/30 text-blue-300 border-blue-700' 
        : 'bg-blue-200 text-blue-800 border-blue-300'
    };

    return styleMap[event.type] || (darkMode 
      ? 'bg-gray-700 text-gray-400 border-gray-600' 
      : 'bg-gray-100 text-gray-600 border-gray-300');
  };

  // Hours to display - Desktop: 6-17, Mobile: 8-15
  const desktopHours = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const mobileHours = [8, 9, 10, 11, 12, 13, 14, 15];

  const filteredMembers = familyMembers.filter(member => 
    selectedMembers.includes(member.id)
  );

  return (
    <div className="space-y-4">
      {/* Time Headers */}
      <div className="sticky top-0 z-10">
        {/* Desktop Header */}
        <div className="hidden xl:grid xl:grid-cols-13 gap-1 items-center mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-24 text-sm font-bold text-gray-600 dark:text-gray-400">
            Családtag
          </div>
          {desktopHours.map(hour => (
            <div key={hour} className="text-center text-sm font-bold text-gray-600 dark:text-gray-400">
              {hour}:00
            </div>
          ))}
        </div>

        {/* Mobile Header */}
        <div className="xl:hidden grid grid-cols-9 gap-1 items-center mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="w-24 text-xs font-bold text-gray-600 dark:text-gray-400">
            Tag
          </div>
          {mobileHours.map(hour => (
            <div key={hour} className="text-center text-xs font-bold text-gray-600 dark:text-gray-400">
              {hour}
            </div>
          ))}
        </div>
      </div>

      {/* Member Timelines */}
      <div className="space-y-3">
        {filteredMembers.map(member => (
          <div key={member.id} className={`${
            darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
          } border rounded-xl p-4 transition-all duration-200 hover:shadow-lg`}>
            
            {/* Desktop Timeline */}
            <div className="hidden xl:grid xl:grid-cols-13 gap-1 items-center">
              {/* Member Info Column */}
              <div className="w-24 flex items-center gap-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 bg-${member.statusColor}-500 rounded-full border-2 border-white dark:border-gray-800 animate-pulse`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{member.name}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {member.currentActivity}
                  </div>
                </div>
              </div>

              {/* Hourly Event Bars */}
              {desktopHours.map(hour => {
                const event = getEventsForMember(member.id, hour);
                const isFiltered = event && selectedEventTypes.includes(event.type);
                
                return (
                  <div 
                    key={hour} 
                    className={`h-12 rounded-lg border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-md ${
                      getEventBarStyling(event, hour)
                    } ${!isFiltered && event ? 'opacity-30' : ''}`}
                    title={event ? `${hour}:00 - ${event.text}` : `${hour}:00 - Szabad`}
                  >
                    <span className="text-center leading-tight">
                      {event ? event.text : '—'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Mobile Timeline */}
            <div className="xl:hidden grid grid-cols-9 gap-1 items-center">
              {/* Member Info Column */}
              <div className="w-20 flex items-center gap-2">
                <div className="relative">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xs">
                    {member.name.charAt(0)}
                  </div>
                  <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-${member.statusColor}-500 rounded-full border border-white dark:border-gray-800 animate-pulse`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-xs truncate">{member.name}</div>
                </div>
              </div>

              {/* Hourly Event Bars */}
              {mobileHours.map(hour => {
                const event = getEventsForMember(member.id, hour);
                const isFiltered = event && selectedEventTypes.includes(event.type);
                
                return (
                  <div 
                    key={hour} 
                    className={`h-10 rounded border-2 flex items-center justify-center text-xs font-medium cursor-pointer transition-all duration-200 hover:scale-105 ${
                      getEventBarStyling(event, hour)
                    } ${!isFiltered && event ? 'opacity-30' : ''}`}
                    title={event ? `${hour}:00 - ${event.text}` : `${hour}:00 - Szabad`}
                  >
                    <span className="text-center leading-tight text-xs">
                      {event ? event.text.split(' ')[0] : '—'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className={`${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      } border rounded-xl p-4 mt-6`}>
        <h4 className="font-semibold mb-3 text-sm">Jelmagyarázat</h4>
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm">Munka</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-sm">Home Office</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm">Iskola</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-purple-500 rounded"></div>
            <span className="text-sm">Családi</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm">Egészségügy</span>
          </div>
        </div>
      </div>
    </div>
  );
}
