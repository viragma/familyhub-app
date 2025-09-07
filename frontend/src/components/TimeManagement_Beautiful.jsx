import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './TimeManagement_New.css';

const TimeManagement = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState([]);
  const [events, setEvents] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('shift');

  // API hívások
  const fetchData = async () => {
    if (!user?.token) return;
    
    setLoading(true);
    try {
      const headers = {
        'Authorization': `Bearer ${user.token}`,
        'Content-Type': 'application/json'
      };

      const [shiftsRes, eventsRes, conflictsRes] = await Promise.all([
        fetch('/api/time-management/shifts', { headers }),
        fetch('/api/time-management/events', { headers }),
        fetch('/api/time-management/conflicts', { headers })
      ]);

      if (shiftsRes.ok) setShifts(await shiftsRes.json());
      if (eventsRes.ok) setEvents(await eventsRes.json());
      if (conflictsRes.ok) setConflicts(await conflictsRes.json());
    } catch (error) {
      console.error('Hiba az adatok betöltésekor:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Dátum navigáció
  const navigateDate = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + direction);
    setCurrentDate(newDate);
  };

  // Modal nyitás
  const openModal = (type) => {
    setModalType(type);
    setShowModal(true);
  };

  // Mai események szűrése
  const todaysEvents = events.filter(event => {
    const eventDate = new Date(event.start_time);
    return eventDate.toDateString() === currentDate.toDateString();
  });

  const todaysShifts = shifts.filter(shift => {
    const shiftDate = new Date(shift.start_time);
    return shiftDate.toDateString() === currentDate.toDateString();
  });

  if (loading) {
    return (
      <div className="time-management">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Betöltés...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="time-management">
      {/* Header */}
      <header className="tm-header">
        <div className="tm-header-content">
          <div className="tm-title">
            <h1>📅 Időkezelés</h1>
            <p>Család naptár és műszakok</p>
          </div>
          <div className="tm-actions">
            <button className="refresh-btn" onClick={fetchData}>
              🔄 Frissítés
            </button>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="tm-nav">
        <div className="tm-tabs">
          <button 
            className={`tm-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            📊 Áttekintés
          </button>
          <button 
            className={`tm-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Naptár
          </button>
          <button 
            className={`tm-tab ${activeTab === 'shifts' ? 'active' : ''}`}
            onClick={() => setActiveTab('shifts')}
          >
            ⏰ Műszakok
            {shifts.length > 0 && <span className="badge">{shifts.length}</span>}
          </button>
          <button 
            className={`tm-tab ${activeTab === 'conflicts' ? 'active' : ''}`}
            onClick={() => setActiveTab('conflicts')}
          >
            ⚠️ Ütközések
            {conflicts.length > 0 && <span className="badge error">{conflicts.length}</span>}
          </button>
        </div>
      </nav>

      {/* Content */}
      <main className="tm-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            {/* Gyors statisztikák */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">📅</div>
                <div className="stat-info">
                  <h3>{todaysEvents.length}</h3>
                  <p>Mai események</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⏰</div>
                <div className="stat-info">
                  <h3>{todaysShifts.length}</h3>
                  <p>Mai műszakok</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">⚠️</div>
                <div className="stat-info">
                  <h3>{conflicts.length}</h3>
                  <p>Ütközések</p>
                </div>
              </div>
              <div className="stat-card">
                <div className="stat-icon">👥</div>
                <div className="stat-info">
                  <h3>{shifts.length}</h3>
                  <p>Összes műszak</p>
                </div>
              </div>
            </div>

            {/* Mai nap részletei */}
            <div className="today-section">
              <div className="section-header">
                <h2>📅 Ma - {currentDate.toLocaleDateString('hu-HU', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</h2>
                <div className="date-nav">
                  <button onClick={() => navigateDate(-1)}>←</button>
                  <button onClick={() => setCurrentDate(new Date())}>Ma</button>
                  <button onClick={() => navigateDate(1)}>→</button>
                </div>
              </div>

              <div className="today-content">
                {/* Mai események */}
                <div className="today-card">
                  <h3>🎯 Mai események</h3>
                  {todaysEvents.length > 0 ? (
                    <div className="event-list">
                      {todaysEvents.map(event => (
                        <div key={event.id} className="event-item">
                          <div className="event-time">
                            {new Date(event.start_time).toLocaleTimeString('hu-HU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className="event-details">
                            <h4>{event.title}</h4>
                            <p>{event.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>Nincs esemény ma</p>
                    </div>
                  )}
                </div>

                {/* Mai műszakok */}
                <div className="today-card">
                  <h3>⏰ Mai műszakok</h3>
                  {todaysShifts.length > 0 ? (
                    <div className="shift-list">
                      {todaysShifts.map(shift => (
                        <div key={shift.id} className="shift-item">
                          <div className="shift-time">
                            {new Date(shift.start_time).toLocaleTimeString('hu-HU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} - {new Date(shift.end_time).toLocaleTimeString('hu-HU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                          <div className="shift-details">
                            <h4>{shift.title}</h4>
                            <p>{shift.location}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-state">
                      <p>Nincs műszak ma</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'calendar' && (
          <div className="calendar-section">
            <div className="section-header">
              <h2>📅 Havi naptár</h2>
              <div className="calendar-nav">
                <button onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() - 1);
                  setCurrentDate(newDate);
                }}>←</button>
                <span className="current-month">
                  {currentDate.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })}
                </span>
                <button onClick={() => {
                  const newDate = new Date(currentDate);
                  newDate.setMonth(newDate.getMonth() + 1);
                  setCurrentDate(newDate);
                }}>→</button>
              </div>
            </div>
            
            <div className="calendar-grid">
              <div className="calendar-header">
                {['H', 'K', 'Sz', 'Cs', 'P', 'Sz', 'V'].map(day => (
                  <div key={day} className="calendar-day-header">{day}</div>
                ))}
              </div>
              {/* Itt lehetne egy teljes havi naptár */}
              <div className="calendar-placeholder">
                <p>📅 Havi naptár nézet fejlesztés alatt...</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shifts' && (
          <div className="shifts-section">
            <div className="section-header">
              <h2>⏰ Műszakok</h2>
              <button className="add-btn" onClick={() => openModal('shift')}>
                ➕ Új műszak
              </button>
            </div>
            
            {shifts.length > 0 ? (
              <div className="shifts-grid">
                {shifts.map(shift => (
                  <div key={shift.id} className="shift-card">
                    <div className="shift-header">
                      <h3>{shift.title}</h3>
                      <div className="shift-actions">
                        <button className="edit-btn">✏️</button>
                        <button className="delete-btn">🗑️</button>
                      </div>
                    </div>
                    <div className="shift-info">
                      <p><strong>📍</strong> {shift.location}</p>
                      <p><strong>📅</strong> {new Date(shift.start_time).toLocaleDateString('hu-HU')}</p>
                      <p><strong>⏰</strong> {new Date(shift.start_time).toLocaleTimeString('hu-HU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })} - {new Date(shift.end_time).toLocaleTimeString('hu-HU', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}</p>
                      {shift.notes && <p><strong>📝</strong> {shift.notes}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <div className="empty-icon">⏰</div>
                <h3>Még nincsenek műszakok</h3>
                <p>Kezdj el egy új műszak hozzáadásával!</p>
                <button className="add-btn primary" onClick={() => openModal('shift')}>
                  ➕ Első műszak hozzáadása
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'conflicts' && (
          <div className="conflicts-section">
            <div className="section-header">
              <h2>⚠️ Időütközések</h2>
            </div>
            
            {conflicts.length > 0 ? (
              <div className="conflicts-list">
                {conflicts.map(conflict => (
                  <div key={conflict.id} className={`conflict-card ${conflict.severity}`}>
                    <div className="conflict-header">
                      <h3>⚠️ {conflict.title}</h3>
                      <span className={`severity-badge ${conflict.severity}`}>
                        {conflict.severity === 'high' ? 'Magas' : 
                         conflict.severity === 'medium' ? 'Közepes' : 'Alacsony'}
                      </span>
                    </div>
                    <p>{conflict.description}</p>
                    <div className="conflict-actions">
                      <button className="resolve-btn">✅ Megoldás</button>
                      <button className="snooze-btn">⏰ Emlékeztető</button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state-large">
                <div className="empty-icon">✅</div>
                <h3>Nincs ütközés!</h3>
                <p>Minden rendben van az időbeosztással.</p>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quick Actions - Floating Button */}
      <div className="quick-actions">
        <div className="quick-menu">
          <button className="quick-btn" onClick={() => openModal('event')}>
            🎯 Esemény
          </button>
          <button className="quick-btn" onClick={() => openModal('shift')}>
            ⏰ Műszak
          </button>
        </div>
        <button className="main-quick-btn">➕</button>
      </div>

      {/* Modal (egyszerű verzió) */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalType === 'shift' ? '⏰ Új műszak' : '🎯 Új esemény'}
              </h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p>Modal tartalom fejlesztés alatt...</p>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModal(false)}>Mégse</button>
              <button className="primary">Mentés</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TimeManagement;
