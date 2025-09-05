import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, UserPlus, Edit3, Trash2, Crown, Shield, 
  User, Calendar, Phone, Mail, Clock, Activity,
  MapPin, Settings
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UserModal from '../components/UserModal';
import './UserManagementPage.css';

function UserManagementPage() {
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { token, user, apiUrl } = useAuth();

  // Role ikonok és színek
  const getRoleIcon = (role) => {
    switch (role) {
      case 'Családfő': return { icon: Crown, color: '#f59e0b' };
      case 'Szülő': return { icon: Shield, color: '#10b981' };
      case 'Tizenéves': return { icon: User, color: '#6366f1' };
      case 'Gyerek': return { icon: User, color: '#ec4899' };
      default: return { icon: User, color: '#64748b' };
    }
  };

  // Dummy adatok bővítése (valós esetben API-ból jönne)
  const enrichMemberData = (member) => {
    const safeName = member.name || member.display_name || 'Ismeretlen';
    return {
      ...member,
      lastActive: member.lastActive || '2 órája',
      phone: member.phone || '+36 30 123 4567',
      email: member.email || `${safeName.toLowerCase().replace(' ', '.')}@email.com`,
      joinDate: member.joinDate || '2023.03.15',
      status: member.status || 'online', // online, away, offline
      tasksCompleted: member.tasksCompleted || Math.floor(Math.random() * 20),
      avatar: member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.display_name || 'U')}&background=6366f1&color=fff&size=128`
    };
  };

  const fetchMembers = useCallback(async () => {
    if (user && user.family_id) {
      try {
        const response = await fetch(`${apiUrl}/api/families/${user.family_id}/users`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setMembers(data);
      } catch (error) { console.error("Hiba a tagok lekérésekor:", error); }
    }
  }, [user, token, apiUrl]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSaveUser = async (userData) => {
    const family_id = user.family_id;
    const method = editingUser ? 'PUT' : 'POST';
 const endpoint = editingUser 
      ? `${apiUrl}/api/users/${editingUser.id}` 
      : `${apiUrl}/api/users`; // Az új, általános user-létrehozó végpontot használjuk

  try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ ...userData, family_id })
      });

      if (response.ok) {
        setIsModalOpen(false);
        setEditingUser(null);
        fetchMembers(); // Frissítjük a listát
      } else {
        alert('Hiba a mentés során!');
      }
    } catch (error) {
      console.error("Hiba a felhasználó mentésekor:", error);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a családtagot?")) return;

    try {
      const response = await fetch(`${apiUrl}/api/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (response.ok) {
        fetchMembers(); // Frissítjük a listát
      } else {
        alert('Hiba a törlés során!');
      }
    } catch (error) {
      console.error("Hiba a felhasználó törlésekor:", error);
    }
  };

  return (
    <div className="user-management-page">
      {/* Hero Header */}
      <div className="management-hero">
        <div className="hero-content">
          <div className="hero-info">
            <div className="hero-icon">
              <Users size={32} />
            </div>
            <div>
              <h1>Családtagok Kezelése</h1>
              <p>Család tagjainak adatai, jogosultságai és aktivitása</p>
            </div>
          </div>
          <button 
            className="btn btn-primary add-member-btn" 
            onClick={() => { setEditingUser(null); setIsModalOpen(true); }}
          >
            <UserPlus size={18} />
            Új Tag Hozzáadása
          </button>
        </div>
        
        {/* Family Stats */}
        <div className="family-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Users size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{members?.length || 0}</span>
              <span className="stat-label">Családtag</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Activity size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{members?.filter(m => enrichMemberData(m).status === 'online')?.length || 0}</span>
              <span className="stat-label">Online</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">
              <Clock size={20} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{members?.reduce((sum, m) => sum + enrichMemberData(m).tasksCompleted, 0) || 0}</span>
              <span className="stat-label">Teljesített feladat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Members Grid */}
      <div className="members-section">
        <div className="section-header">
          <h2>Családtagok ({members?.length || 0})</h2>
        </div>
        
        <div className="members-grid">
          {members && members.length > 0 ? members.map((member) => {
            const enrichedMember = enrichMemberData(member);
            const roleData = getRoleIcon(member.role);
            const RoleIcon = roleData.icon;
            
            return (
              <div className="member-card" key={member.id}>
                <div className="member-header">
                  <div className="member-avatar-section">
                    <div className="member-avatar">
                      <img src={enrichedMember.avatar} alt={member.display_name || 'Családtag'} />
                      <div className={`status-indicator ${enrichedMember.status}`}></div>
                    </div>
                    <div className="member-basic-info">
                      <h3>{member.name || member.display_name || 'Ismeretlen'}</h3>
                      <div className="member-role">
                        <RoleIcon size={16} style={{ color: roleData.color }} />
                        <span>{member.role || 'Nincs szerepkör'}</span>
                      </div>
                    </div>
                  </div>
                  <div className="member-actions">
                    <button 
                      className="action-btn edit-btn"
                      onClick={() => { setEditingUser(member); setIsModalOpen(true); }}
                      title="Szerkesztés"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button 
                      className="action-btn delete-btn"
                      onClick={() => handleDeleteUser(member.id)}
                      title="Törlés"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="member-details">
                  <div className="detail-row">
                    <Mail size={14} />
                    <span>{enrichedMember.email}</span>
                  </div>
                  <div className="detail-row">
                    <Phone size={14} />
                    <span>{enrichedMember.phone}</span>
                  </div>
                  <div className="detail-row">
                    <Calendar size={14} />
                    <span>Csatlakozott: {enrichedMember.joinDate}</span>
                  </div>
                  <div className="detail-row">
                    <Clock size={14} />
                    <span>Utoljára aktív: {enrichedMember.lastActive}</span>
                  </div>
                </div>

                <div className="member-stats">
                  <div className="mini-stat">
                    <span className="mini-stat-value">{enrichedMember.tasksCompleted}</span>
                    <span className="mini-stat-label">Feladat</span>
                  </div>
                  <div className="mini-stat">
                    <span className="mini-stat-value">{enrichedMember.status === 'online' ? 'Aktív' : 'Offline'}</span>
                    <span className="mini-stat-label">Státusz</span>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="no-members">
              <p>Még nincsenek családtagok hozzáadva.</p>
            </div>
          )}
        </div>
      </div>

      <UserModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveUser}
        userData={editingUser}
      />
    </div>
  );
}

export default UserManagementPage;