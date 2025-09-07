

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Save, X, Edit3, Settings, Shield, Bell,
  Mail, Phone, User, UserCircle, Calendar, LogOut,
  Clock, Globe, Smartphone, Monitor, Users, Home,
  Eye, Volume2, MapPin, MessageSquare, Heart, Loader
} from 'lucide-react';
import './ProfilePage.css';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ProfileEditModal from '../components/ProfileEditModal';

export default function ProfilePage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const { user, token, apiUrl, logout } = useAuth();
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [userSettings, setUserSettings] = useState({
    push_notifications: true,
    email_notifications: true,
    desktop_notifications: false,
    profile_visibility: 'family',
    show_online_status: true,
    language: 'hu',
    theme: 'light'
  });
  const [todaysEvents, setTodaysEvents] = useState([]);
  const [profileData, setProfileData] = useState({
    name: '',
    display_name: '',
    email: '',
    phone: '',
    role: '',
    bio: '',
    avatar_url: '',
    birth_date: '',
    joinDate: '',
    lastActive: '',
    currentStatus: 'Online',
    todaySchedule: '09:00 - 17:00',
    availableUntil: '17:00'
  });

  // Load user data from backend
  useEffect(() => {
    if (user) {
      setProfileData(prev => ({
        ...prev,
        name: user.name || '',
        display_name: user.display_name || '',
        role: user.role || '',
        avatar_url: user.avatar_url 
          ? (user.avatar_url.startsWith('http') ? user.avatar_url : `http://localhost:8000${user.avatar_url}`)
          : `https://ui-avatars.com/api/?name=${encodeURIComponent(user.display_name || user.name || 'U')}&background=6366f1&color=fff&size=128`,
        birth_date: user.birth_date || '',
        email: user.email || `${(user.name || '').toLowerCase().replace(' ', '.')}@email.com`,
        phone: user.phone || '+36 30 123 4567',
        bio: user.bio || `${user.role} a családban`,
        joinDate: new Date(user.created_at || Date.now()).toLocaleDateString('hu-HU'),
        lastActive: 'Most aktív',
        currentStatus: user.status || 'Online'
      }));

      // Load user settings
      loadUserSettings();
      // Load today's events
      loadTodaysEvents();
    }
  }, [user]);

  // Load user settings from backend
  const loadUserSettings = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/settings`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const settings = await response.json();
        setUserSettings(settings);
      }
    } catch (error) {
      console.error('Hiba a beállítások betöltésekor:', error);
    }
  };

  // Load today's events from backend
  const loadTodaysEvents = async () => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/events`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const events = await response.json();
        setTodaysEvents(events);
      }
    } catch (error) {
      console.error('Hiba az események betöltésekor:', error);
      // Set some demo events if API fails
      setTodaysEvents([
        { id: 1, title: 'Team meeting', event_type: 'work', start_time: '2025-09-05T11:00:00' },
        { id: 2, title: 'Luca elhozása', event_type: 'family', start_time: '2025-09-05T14:00:00' },
        { id: 3, title: 'Családi vacsora', event_type: 'family', start_time: '2025-09-05T19:00:00' }
      ]);
    }
  };

  // Jogosultság ellenőrzés - csak családfő láthatja a család kezelése gombot
  const isFamilyHead = user?.role === 'Családfő';

  const handleLogout = () => {
    if (window.confirm('Biztosan ki szeretnél jelentkezni?')) {
      logout();
      navigate('/login');
    }
  };

  const handleFamilyManagement = () => {
    navigate('/manage-family');
  };

  // Save profile changes to backend
  const handleSaveProfile = async (formData) => {
    if (!user?.id) return;

    setIsLoading(true);
    try {
      const userData = {
        name: formData.name,
        display_name: formData.display_name,
        email: formData.email,
        phone: formData.phone,
        bio: formData.bio,
        avatar_url: formData.avatar_url.startsWith('http://localhost:8000') 
          ? formData.avatar_url.replace('http://localhost:8000', '') 
          : formData.avatar_url,
        birth_date: formData.birth_date || null,
        family_id: user.family_id
      };

      const response = await fetch(`${apiUrl}/api/users/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(userData)
      });

      if (response.ok) {
        const updatedUser = await response.json();
        
        // Update local profile data
        setProfileData(prev => ({
          ...prev,
          ...formData
        }));
        
        setIsEditModalOpen(false);
        alert('Profil sikeresen frissítve!');
      } else {
        throw new Error('Hiba a profil mentésekor');
      }
    } catch (error) {
      console.error('Hiba a profil mentésekor:', error);
      alert('Hiba történt a profil mentésekor!');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle avatar upload
  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // For now, just use a placeholder URL
    // In a real app, you'd upload to a service like AWS S3 or similar
    const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.display_name)}&background=random&color=fff&size=128`;
    
    setProfileData(prev => ({
      ...prev,
      avatar_url: avatarUrl
    }));
  };

  const handleStatusChange = async (status) => {
    if (!user?.id) return;

    try {
      const response = await fetch(`${apiUrl}/api/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          status: status,
          note: `Státusz váltás: ${status}` 
        })
      });

      if (response.ok) {
        setProfileData(prev => ({
          ...prev,
          currentStatus: status
        }));
      } else {
        throw new Error('Státusz frissítése sikertelen');
      }
    } catch (error) {
      console.error('Hiba a státusz frissítésekor:', error);
      // Fallback to local state update
      setProfileData(prev => ({
        ...prev,
        currentStatus: status
      }));
    }
  };

  // Handle settings change
  const handleSettingsChange = async (settingKey, value) => {
    if (!user?.id) return;

    try {
      const updatedSettings = { ...userSettings, [settingKey]: value };
      
      const response = await fetch(`${apiUrl}/api/users/${user.id}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ [settingKey]: value })
      });

      if (response.ok) {
        setUserSettings(updatedSettings);
      } else {
        throw new Error('Beállítás frissítése sikertelen');
      }
    } catch (error) {
      console.error('Hiba a beállítás frissítésekor:', error);
      // Fallback to local state update
      setUserSettings(prev => ({ ...prev, [settingKey]: value }));
    }
  };

  // Helper function to get event color class
  const getEventColorClass = (eventType) => {
    switch (eventType) {
      case 'work':
      case 'meeting':
        return 'event-blue';
      case 'family':
      case 'personal':
        return 'event-green';
      case 'school':
      case 'education':
        return 'event-purple';
      default:
        return 'event-blue';
    }
  };

  const themeClass = darkMode ? 'dark-mode' : '';

  return (
    <div className={`profile-page ${themeClass}`}>
      {/* Hero Header Section */}
      <div className="profile-hero">
        <div className="hero-background"></div>
        <div className="container">
          <div className="hero-content">
            <div className="profile-main-info">
              <div className="avatar-section">
                <div className="avatar-container">
                  <img 
                    src={profileData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(profileData.display_name)}&background=random&color=fff&size=128`} 
                    alt="Profilkép" 
                    className="avatar-img" 
                  />
                  <button className="avatar-edit-btn" onClick={() => setIsEditModalOpen(true)}>
                    <Camera size={20} />
                  </button>
                </div>
                <div className="profile-status">
                  <div className="status-indicator online"></div>
                  <span>Online</span>
                </div>
              </div>
              
              <div className="profile-details">
                <h1 className="profile-name">{profileData.display_name}</h1>
                <div className="profile-role">
                  <UserCircle size={18} />
                  <span>{profileData.role}</span>
                </div>
                
                <p className="profile-bio">{profileData.bio || 'Nincs megadva bemutatkozás.'}</p>
                
                <div className="profile-meta">
                  <div className="meta-item">
                    <Calendar size={16} />
                    <span>Csatlakozott: {profileData.joinDate}</span>
                  </div>
                  <div className="meta-item">
                    <Clock size={16} />
                    <span>Utoljára aktív: {profileData.lastActive}</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="hero-actions">
              <button className="theme-toggle-hero" onClick={toggleDarkMode}>
                <span className="theme-icon">{darkMode ? '☀️' : '🌙'}</span>
                <span>{darkMode ? 'Világos mód' : 'Sötét mód'}</span>
              </button>
              
              {!isLoading ? (
                <button onClick={() => setIsEditModalOpen(true)} className="btn btn-primary">
                  <Edit3 size={18} />
                  Profil szerkesztése
                </button>
              ) : (
                <button className="btn btn-primary" disabled>
                  <Loader size={18} className="spinner" />
                  Mentés...
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container">
        <div className="profile-content">
          {/* Left Column */}
          <div className="profile-sidebar">
            
            {/* Contact Card */}
            <div className="profile-card">
              <div className="card-header">
                <Mail size={20} />
                <h3>Kapcsolat</h3>
              </div>
              <div className="contact-list">
                <div className="contact-item">
                  <div className="contact-icon">
                    <Mail size={16} />
                  </div>
                  <div className="contact-info">
                    <span className="contact-label">Email</span>
                    <span className="contact-value">{profileData.email}</span>
                  </div>
                </div>
                <div className="contact-item">
                  <div className="contact-icon">
                    <Phone size={16} />
                  </div>
                  <div className="contact-info">
                    <span className="contact-label">Telefon</span>
                    <span className="contact-value">{profileData.phone}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="profile-card">
              <div className="card-header">
                <Settings size={20} />
                <h3>Gyors műveletek</h3>
              </div>
              <div className="quick-actions">
                <button className="action-btn">
                  <Shield size={16} />
                  <span>Biztonság</span>
                </button>
                <button className="action-btn">
                  <Bell size={16} />
                  <span>Értesítések</span>
                </button>
                <button className="action-btn">
                  <Globe size={16} />
                  <span>Nyelv</span>
                </button>
                {isFamilyHead && (
                  <button className="action-btn family-management-btn" onClick={handleFamilyManagement}>
                    <Users size={16} />
                    <span>Család kezelése</span>
                  </button>
                )}
                <button className="action-btn logout-action" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>Kijelentkezés</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="profile-main">
            
            {/* Personal Information */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <User size={24} />
                  <h2>Személyes adatok</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="info-grid">
                  <div className="info-item">
                    <label>Teljes név</label>
                    <span>{profileData.name}</span>
                  </div>
                  <div className="info-item">
                    <label>Email cím</label>
                    <span>{profileData.email}</span>
                  </div>
                  <div className="info-item">
                    <label>Telefonszám</label>
                    <span>{profileData.phone || 'Nincs megadva'}</span>
                  </div>
                  <div className="info-item">
                    <label>Születési dátum</label>
                    <span>{profileData.birth_date ? new Date(profileData.birth_date).toLocaleDateString('hu-HU') : 'Nincs megadva'}</span>
                  </div>
                  <div className="info-item">
                    <label>Családi szerepkör</label>
                    <span>{profileData.role}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notifications */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Bell size={24} />
                  <h2>Értesítések</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-icon">
                        <Smartphone size={18} />
                      </div>
                      <div>
                        <span className="setting-label">Push értesítések</span>
                        <span className="setting-desc">Mobilon kapott értesítések</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={userSettings.push_notifications} 
                        onChange={(e) => handleSettingsChange('push_notifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-icon">
                        <Mail size={18} />
                      </div>
                      <div>
                        <span className="setting-label">Email értesítések</span>
                        <span className="setting-desc">Fontos események emailben</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={userSettings.email_notifications}
                        onChange={(e) => handleSettingsChange('email_notifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div className="setting-icon">
                        <Monitor size={18} />
                      </div>
                      <div>
                        <span className="setting-label">Desktop értesítések</span>
                        <span className="setting-desc">Böngészőben megjelenő értesítések</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={userSettings.desktop_notifications}
                        onChange={(e) => handleSettingsChange('desktop_notifications', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Privacy & Security */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Shield size={24} />
                  <h2>Adatvédelem és biztonság</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <span className="setting-label">Profil láthatósága</span>
                        <span className="setting-desc">Ki láthatja a profilodat</span>
                      </div>
                    </div>
                    <select 
                      className="setting-select"
                      value={userSettings.profile_visibility}
                      onChange={(e) => handleSettingsChange('profile_visibility', e.target.value)}
                    >
                      <option value="family">Csak család</option>
                      <option value="friends">Barátok</option>
                      <option value="public">Nyilvános</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <span className="setting-label">Online státusz</span>
                        <span className="setting-desc">Mások láthatják mikor vagy online</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input 
                        type="checkbox" 
                        checked={userSettings.show_online_status}
                        onChange={(e) => handleSettingsChange('show_online_status', e.target.checked)}
                      />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* App Settings */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Settings size={24} />
                  <h2>Alkalmazás beállítások</h2>
                </div>
              </div>
              <div className="section-content">
                <div className="settings-list">
                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <span className="setting-label">Nyelv</span>
                        <span className="setting-desc">Alkalmazás nyelve</span>
                      </div>
                    </div>
                    <select 
                      className="setting-select"
                      value={userSettings.language}
                      onChange={(e) => handleSettingsChange('language', e.target.value)}
                    >
                      <option value="hu">Magyar</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  
                  <div className="setting-item">
                    <div className="setting-info">
                      <div>
                        <span className="setting-label">Téma</span>
                        <span className="setting-desc">Világos vagy sötét megjelenés</span>
                      </div>
                    </div>
                    <label className="switch">
                      <input type="checkbox" checked={darkMode} onChange={toggleDarkMode} />
                      <span className="slider"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Management Section */}
            <div className="section-card">
              <div className="section-header">
                <div className="section-title">
                  <Clock size={24} />
                  <h2>Időbeosztás és elérhetőség</h2>
                </div>
              </div>
              <div className="section-content">
                {/* Current Status */}
                <div className="current-status-card">
                  <div className="status-header">
                    <div className="status-indicator online"></div>
                    <span className="status-text">Jelenleg: {profileData.currentStatus}</span>
                  </div>
                  <div className="status-details">
                    <div className="status-detail">
                      <Clock size={14} />
                      <span>Mai program: {profileData.todaySchedule}</span>
                    </div>
                    <div className="status-detail">
                      <UserCircle size={14} />
                      <span>Elérhető: {profileData.availableUntil}-ig</span>
                    </div>
                  </div>
                </div>

                {/* Quick Status Buttons */}
                <div className="status-section">
                  <h4>Gyors státusz váltás:</h4>
                  <div className="status-buttons">
                    <button 
                      className={`status-btn ${profileData.currentStatus === 'Reggeli' ? 'active' : ''}`}
                      onClick={() => handleStatusChange('Reggeli')}
                    >
                      🌅 Reggeli
                    </button>
                    <button 
                      className={`status-btn ${profileData.currentStatus === 'Home Office' ? 'active' : ''}`}
                      onClick={() => handleStatusChange('Home Office')}
                    >
                      🏠 Home Office
                    </button>
                    <button 
                      className={`status-btn ${profileData.currentStatus === 'Szolgálati út' ? 'active' : ''}`}
                      onClick={() => handleStatusChange('Szolgálati út')}
                    >
                      ✈️ Szolgálati út
                    </button>
                    <button 
                      className={`status-btn ${profileData.currentStatus === 'Szabadság' ? 'active' : ''}`}
                      onClick={() => handleStatusChange('Szabadság')}
                    >
                      🏖️ Szabadság
                    </button>
                  </div>
                </div>

                {/* Today's Events */}
                <div className="events-section">
                  <h4>Mai programom:</h4>
                  <div className="events-list">
                    {todaysEvents.length > 0 ? (
                      todaysEvents.map((event, index) => (
                        <div key={event.id || index} className={`event-item ${getEventColorClass(event.event_type)}`}>
                          <div className="event-dot"></div>
                          <span>
                            {new Date(event.start_time).toLocaleTimeString('hu-HU', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })} {event.title}
                            {event.source && ` (${event.source})`}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="event-item event-blue">
                        <div className="event-dot"></div>
                        <span>Nincs tervezett program ma</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="time-actions">
                  <button className="time-action-btn primary">
                    <Settings size={16} />
                    Részletes időkezelés
                  </button>
                  <button className="time-action-btn secondary">
                    <Calendar size={16} />
                    Naptár szinkronizálás
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Edit Modal */}
      <ProfileEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profileData={{...profileData, id: user?.id}}
        onSave={handleSaveProfile}
        isLoading={isLoading}
      />
    </div>
  );
}