import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import AuthLayout from '../components/AuthLayout';

function LoginPage() {
  const [profiles, setProfiles] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pin, setPin] = useState('');
  const navigate = useNavigate();
  const { apiUrl, login } = useAuth();

  // Avatar komponens újrafelhasználható profilkép megjelenítéshez
  const Avatar = ({ user, size = '80px' }) => (
    <div className="member-avatar" style={{width: size, height: size, fontSize: '2rem'}}>
      {user.avatar_url ? (
        <img 
          src={user.avatar_url.startsWith('http') ? user.avatar_url : `${apiUrl}${user.avatar_url}`}
          alt={`${user.display_name} profilképe`}
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '50%',
            objectFit: 'cover'
          }}
          onError={(e) => {
            // Ha a kép betöltése sikertelen, fallback az első betűre
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
      ) : null}
      <div 
        style={{
          display: user.avatar_url ? 'none' : 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
          borderRadius: '50%',
          fontSize: '2rem',
          fontWeight: 'bold'
        }}
      >
        {user.display_name.charAt(0).toUpperCase()}
      </div>
    </div>
  );

  // Profilok lekérése a backendtől
  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/families/1/users`);
        const data = await response.json();
        setProfiles(data);
      } catch (error) {
        console.error("Hiba a profilok lekérésekor:", error);
      }
    };
    fetchProfiles();
  }, [apiUrl]);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;
    const success = await login(selectedUser.id, pin);
    if (success) {
      navigate('/');
    } else {
      alert('Hibás PIN kód!');
      setPin('');
    }
  };

  // --- VÁLTOZÁS: Új függvény a PIN kód változásának kezelésére ---
  // Ez biztosítja, hogy csak számokat lehessen beírni.
  const handlePinChange = (e) => {
    const value = e.target.value;
    if (/^[0-9]*$/.test(value)) {
        setPin(value);
    }
  };

  // Profilválasztó nézet
  if (!selectedUser) {
    return (
      <AuthLayout>
        <h1 className="auth-title">Ki Lép Be?</h1>
        <div className="members-grid" style={{marginTop: '2rem'}}>
          {profiles.map((profile) => (
            <div className="member-card" key={profile.id} onClick={() => setSelectedUser(profile)}>
              <Avatar user={profile} />
              <div className="member-name">{profile.display_name}</div>
            </div>
          ))}
        </div>
      </AuthLayout>
    );
  }

  // PIN bekérő nézet
  return (
    <AuthLayout>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem' }}>
        <Avatar user={selectedUser} size="100px" />
        <h1 className="auth-title" style={{ marginTop: '1rem', marginBottom: '0.5rem' }}>Üdv, {selectedUser.display_name}!</h1>
        <p className="auth-subtitle">Add meg a PIN kódodat a belépéshez.</p>
      </div>
      
      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label className="form-label" htmlFor="pin">PIN Kód</label>
          <input 
            id="pin" 
            className="form-input" 
            type="password" 
            value={pin} 
            // --- VÁLTOZÁS: A módosítások itt történtek ---
            onChange={handlePinChange}      // A dedikált, szűrt függvény használata
            inputMode="numeric"             // Numerikus billentyűzet mobilokon
            pattern="[0-9]*"                // Csak számok engedélyezése
            // --- VÁLTOZÁS VÉGE ---
            maxLength="4" 
            autoFocus 
          />
        </div>
        <button type="submit" className="btn btn-primary btn-full">Belépés</button>
        <button type="button" className="btn btn-secondary btn-full" style={{marginTop: '1rem'}} onClick={() => setSelectedUser(null)}>
          Vissza a profilokhoz
        </button>
      </form>
    </AuthLayout>
  );
}

export default LoginPage;