import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

function AdminSetupPage() {
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('Apa');
  const [pin, setPin] = useState('');
  const navigate = useNavigate();
  const { token, user, apiUrl } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const familyId = localStorage.getItem('familyIdForSetup');
    if (!familyId) {
      alert("Hiba: Család azonosító nem található!");
      navigate('/setup-family');
      return;
    }

    try {
      await fetch(`${apiUrl}/api/users/setup-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, display_name: displayName, pin, family_id: parseInt(familyId), role: 'Családfő' }),
      });
      localStorage.removeItem('familyIdForSetup');
      navigate('/login');
    } catch (error) {
      console.error("Hiba az admin létrehozásakor:", error);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Családfő Profil</h1>
      <p className="auth-subtitle">Hozd létre a saját adminisztrátori profilodat.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="name">Teljes neved</label>
          <input id="name" className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="displayName">Megjelenítendő név</label>
          <input id="displayName" className="form-input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="pin">4-jegyű PIN</label>
          <input id="pin" className="form-input" type="password" value={pin} onChange={e => setPin(e.target.value)} maxLength="4" pattern="\d{4}" title="Kérlek, 4 számjegyet adj meg." required />
        </div>
        <button type="submit" className="btn btn-primary btn-full">Létrehozás és Belépés</button>
      </form>
    </AuthLayout>
  );
}

export default AdminSetupPage;