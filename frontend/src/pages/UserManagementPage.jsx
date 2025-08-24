import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import UserModal from '../components/UserModal';

function UserManagementPage() {
  const [members, setMembers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const { token, user, apiUrl } = useAuth();

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
    <div>
      <div className="page-header">
        <h1>Családtagok Kezelése</h1>
        <button className="btn btn-primary" onClick={() => { setEditingUser(null); setIsModalOpen(true); }}>Új Tag Hozzáadása</button>
      </div>
      
      <div className="user-list">
        {members.map((member) => (
          <div className="user-list-item" key={member.id}>
            <div className="member-avatar">{member.display_name.charAt(0)}</div>
            <div className="user-info">
              <div style={{ fontWeight: 600 }}>{member.name}</div>
              <div style={{ color: 'var(--text-secondary)' }}>{member.display_name} ({member.role})</div>
            </div>
            <div className="user-actions">
              <button className="btn btn-secondary" onClick={() => { setEditingUser(member); setIsModalOpen(true); }}>Szerkesztés</button>
              <button className="btn btn-secondary" style={{borderColor: 'var(--danger)', color: 'var(--danger)'}} onClick={() => handleDeleteUser(member.id)}>Törlés</button>
            </div>
          </div>
        ))}
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