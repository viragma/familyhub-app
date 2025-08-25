import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

function FamilyMemberCard({ member, onClick, isCurrentUser = false }) {
  const [memberStats, setMemberStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token, apiUrl } = useAuth();

  // A tag életkorának kiszámítása
  const calculateAge = (birthDate) => {
    if (!birthDate) return null;
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // A tag státuszának meghatározása (online/offline szimulálása)
  const getOnlineStatus = () => {
    // Itt lehetne valós online státuszt lekérdezni
    // Most random generálunk a demo kedvéért
    return Math.random() > 0.3; // 70% esély hogy "online"
  };

  // Szerep ikonok
  const getRoleIcon = (role) => {
    switch (role) {
      case 'Családfő': return '👑';
      case 'Szülő': return '👨‍👩';
      case 'Tizenéves': return '🧑‍🎓';
      case 'Gyerek': return '👶';
      default: return '👤';
    }
  };

  // Szerep színek
  const getRoleColor = (role) => {
    switch (role) {
      case 'Családfő': return 'role-admin';
      case 'Szülő': return 'role-parent';
      case 'Tizenéves': return 'role-teen';
      case 'Gyerek': return 'role-child';
      default: return 'role-default';
    }
  };

  const age = calculateAge(member.birth_date);
  const isOnline = getOnlineStatus();
  const roleIcon = getRoleIcon(member.role);
  const roleColorClass = getRoleColor(member.role);

  return (
    <div 
      className={`family-member-card ${isCurrentUser ? 'current-user' : ''}`}
      onClick={() => onClick(member.id)}
    >
      {/* Header */}
      <div className="member-card-header">
        <div className={`member-role-badge ${roleColorClass}`}>
          <span className="role-icon">{roleIcon}</span>
          <span className="role-text">{member.role}</span>
        </div>
        
        {isCurrentUser && (
          <div className="current-user-indicator">
            <span className="indicator-icon">⭐</span>
            <span className="indicator-text">Te</span>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="member-avatar-section">
        <div className={`member-avatar-large ${isOnline ? 'online' : 'offline'}`}>
          {member.avatar_url ? (
            <img src={member.avatar_url} alt={member.display_name} className="avatar-image" />
          ) : (
            <span className="avatar-initials">
              {member.display_name?.charAt(0)?.toUpperCase() || '?'}
            </span>
          )}
          <div className={`online-indicator ${isOnline ? 'online' : 'offline'}`}></div>
        </div>
      </div>

      {/* Member Info */}
      <div className="member-info-section">
        <h3 className="member-name">{member.display_name}</h3>
        <p className="member-full-name">{member.name}</p>
        
        {age && (
          <div className="member-age">
            <span className="age-icon">🎂</span>
            <span className="age-text">{age} éves</span>
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="member-quick-stats">
        <div className="quick-stat">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Kasszák</div>
            <div className="stat-value">-</div>
          </div>
        </div>
        <div className="quick-stat">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <div className="stat-label">Feladatok</div>
            <div className="stat-value">-</div>
          </div>
        </div>
      </div>

      {/* Status Indicators */}
      <div className="member-status-section">
        <div className={`status-indicator ${isOnline ? 'online' : 'offline'}`}>
          <span className="status-dot"></span>
          <span className="status-text">
            {isOnline ? 'Aktív' : 'Offline'}
          </span>
        </div>
        
        {member.role !== 'Családfő' && (
          <div className="permissions-indicator">
            <span className="permissions-icon">🔒</span>
            <span className="permissions-text">Korlátozott hozzáférés</span>
          </div>
        )}
      </div>

      {/* Hover Actions */}
      <div className="member-card-actions">
        <div className="action-buttons">
          <button className="action-btn edit" title="Szerkesztés">
            <span className="btn-icon">✏️</span>
          </button>
          <button className="action-btn view" title="Részletek">
            <span className="btn-icon">👁️</span>
          </button>
          {!isCurrentUser && (
            <button className="action-btn delete" title="Törlés">
              <span className="btn-icon">🗑️</span>
            </button>
          )}
        </div>
      </div>

      {/* Click indicator */}
      <div className="click-indicator">
        <span className="click-icon">👆</span>
        <span className="click-text">Kattints a kezeléshez</span>
      </div>
    </div>
  );
}

export default FamilyMemberCard;