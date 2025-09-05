

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Save, X, Edit3, Settings, Shield, Bell,
  Mail, Phone, User, UserCircle, Calendar, LogOut,
  Clock, Globe, Smartphone, Monitor, Users, Home,
  Eye, Volume2, MapPin, MessageSquare, Heart
} from 'lucide-react';
import './ProfilePage.css';
import { useTheme } from '../context/ThemeContext';

export default function ProfilePage() {
  const { darkMode, toggleDarkMode } = useTheme();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: 'Kovács János',
    email: 'kovacs.janos@example.com',
    phone: '+36 30 123 4567',
    role: 'Családfő',
    bio: 'Szerető családapa és tech rajongó. Szeretem a családommal töltött időt és az új technológiákat.',
    avatar: 'https://via.placeholder.com/150',
    joinDate: '2023. március',
    lastActive: '2 perce',
    birthday: '1985-05-15',
    address: 'Budapest, Magyarország',
    currentStatus: 'Home Office',
    todaySchedule: '09:00 - 17:00',
    availableUntil: '17:00'
  });

  // Jogosultság ellenőrzés - csak családfő láthatja a család kezelése gombot
  const isFamilyHead = profileData.role === 'Családfő';

  const handleLogout = () => {
    if (window.confirm('Biztosan ki szeretnél jelentkezni?')) {
      alert('Kijelentkezés...');
    }
  };

  const handleFamilyManagement = () => {
    // Átirányítás család kezelés oldalra
    navigate('/manage-family');
  };

  const handleStatusChange = (status) => {
    setProfileData(prev => ({
      ...prev,
      currentStatus: status
    }));
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
                  <img src={profileData.avatar} alt="Profilkép" className="avatar-img" />
                  <button className="avatar-edit-btn">
                    <Camera size={20} />
                  </button>
                </div>
                <div className="profile-status">
                  <div className="status-indicator online"></div>
                  <span>Online</span>
                </div>
              </div>
              
              <div className="profile-details">
                <h1 className="profile-name">{profileData.name}</h1>
                <div className="profile-role">
                  <UserCircle size={18} />
                  <span>{profileData.role}</span>
                </div>
                <p className="profile-bio">{profileData.bio}</p>
                
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
              
              {!isEditing ? (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary">
                  <Edit3 size={18} />
                  Profil szerkesztése
                </button>
              ) : (
                <div className="edit-actions">
                  <button className="btn btn-success">
                    <Save size={18} />
                    Mentés
                  </button>
                  <button onClick={() => setIsEditing(false)} className="btn btn-secondary">
                    <X size={18} />
                    Mégse
                  </button>
                </div>
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
                    <span>{profileData.phone}</span>
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
                      <input type="checkbox" checked readOnly />
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
                      <input type="checkbox" checked readOnly />
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
                      <input type="checkbox" />
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
                    <select className="setting-select">
                      <option>Csak család</option>
                      <option>Barátok</option>
                      <option>Nyilvános</option>
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
                      <input type="checkbox" checked readOnly />
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
                    <select className="setting-select">
                      <option>Magyar</option>
                      <option>English</option>
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
                    <div className="event-item event-blue">
                      <div className="event-dot"></div>
                      <span>11:00 Team meeting (Google naptár)</span>
                    </div>
                    <div className="event-item event-green">
                      <div className="event-dot"></div>
                      <span>14:00 Luca elhozása (Iskola)</span>
                    </div>
                    <div className="event-item event-purple">
                      <div className="event-dot"></div>
                      <span>19:00 Családi vacsora</span>
                    </div>
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
    </div>
  );
}