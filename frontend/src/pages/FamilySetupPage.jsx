import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { useAuth } from '../context/AuthContext';

function FamilySetupPage() {
  const [familyName, setFamilyName] = useState('');
  const navigate = useNavigate();
 const { token, user, apiUrl } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    // ... a logika változatlan ...
    try {
      const response = await fetch(`${apiUrl}/api/families`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: familyName }),
      });
      const data = await response.json();
      localStorage.setItem('familyIdForSetup', data.id);
      navigate('/setup-admin');
    } catch (error) {
      console.error("Hiba a család létrehozásakor:", error);
    }
  };

  return (
    <AuthLayout>
      <h1 className="auth-title">Kezdjük a beállítással!</h1>
      <p className="auth-subtitle">Először is, adj nevet a családodnak.</p>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="familyName">Család neve</label>
          <input 
            id="familyName"
            className="form-input"
            type="text" 
            value={familyName} 
            onChange={e => setFamilyName(e.target.value)} 
            placeholder="Pl. Nagy Család"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary btn-full">Tovább</button>
      </form>
    </AuthLayout>
  );
}

export default FamilySetupPage;