import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User, Settings, Moon, Sun, LogOut, Bell, Camera, Save, X, Edit3,
  Mail, Phone, UserCircle, Home, Calendar, MessageSquare, Star,
  Volume2, Eye, Clock, Users, Globe, Lock, Monitor, Heart, Shield
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './ProfilePage.css';

// Segédkomponens
const SettingRow = ({ icon, title, description, children }) => (
  <div className="setting-row">
    <div className="setting-row-info">
      <div className="setting-row-icon">{icon}</div>
      <div>
        <h3 className="setting-row-title">{title}</h3>
        <p className="setting-row-description">{description}</p>
      </div>
    </div>
    <div>{children}</div>
  </div>
);

// Kapcsoló segédkomponens
const ToggleSwitch = ({ isChecked, onToggle }) => (
    <label className="toggle-switch">
        <input type="checkbox" checked={isChecked} onChange={onToggle} />
        <span className="toggle-slider"></span>
    </label>
);

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout, theme, toggleTheme, user } = useAuth(); 
  
  const [isEditing, setIsEditing] = useState(false);
  
  const [profileData, setProfileData] = useState({});
  const [editData, setEditData] = useState({});

  useEffect(() => {
    if(user) {
        const initialData = {
            name: user.display_name || user.name || 'Felhasználó',
            email: user.email || 'Nincs megadva',
            phone: user.phone || '+36 -- --- ----',
            role: user.role || 'Nincs megadva',
            bio: user.bio || '',
            birthday: user.birth_date || '',
            address: user.address || 'Nincs megadva'
        };
        setProfileData(initialData);
        setEditData(initialData);
    }
  }, [user]);

  const [notifications, setNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(false);
  const [locationSharing, setLocationSharing] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);

  const handleSave = () => { setProfileData({ ...editData }); setIsEditing(false); };
  const handleCancel = () => { setEditData({ ...profileData }); setIsEditing(false); };
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className={`profile-page ${theme}`}>
      <div className="profile-container">
        
        <header className="profile-header">
          <div className="profile-picture-container">
            <img src={user?.avatar_url || `https://i.pravatar.cc/150?u=${profileData.email}`} alt="Profilkép" className="profile-picture" />
            <div className="overlay"><Camera size={32} /></div>
          </div>
          <div className="profile-info">
            <h1 className="profile-name">{profileData.name}</h1>
            <p className="profile-role">{profileData.role}</p>
            <div className="profile-actions">
              {isEditing ? (
                <>
                  <button onClick={handleSave} className="btn btn-success"><Save size={16} /> Mentés</button>
                  <button onClick={handleCancel} className="btn btn-secondary"><X size={16} /> Mégse</button>
                </>
              ) : (
                <button onClick={() => setIsEditing(true)} className="btn btn-primary"><Edit3 size={16} /> Profil szerkesztése</button>
              )}
              <button onClick={toggleTheme} className="btn btn-secondary btn-icon">
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button onClick={handleLogout} className="btn btn-danger btn-icon">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </header>

        <main>
            <section className="profile-card">
              <h2 className="profile-card-title"><UserCircle size={20} /> Általános adatok</h2>
              <div className="info-grid">
                <div className="info-field">
                  <label><Mail size={16} /> Email cím</label>
                  {isEditing ? <input name="email" value={editData.email} onChange={handleInputChange} /> : <p>{profileData.email}</p>}
                </div>
                <div className="info-field">
                  <label><Phone size={16} /> Telefonszám</label>
                  {isEditing ? <input name="phone" value={editData.phone} onChange={handleInputChange} /> : <p>{profileData.phone}</p>}
                </div>
                <div className="info-field">
                  <label><Calendar size={16} /> Születésnap</label>
                  {isEditing ? <input name="birthday" value={editData.birthday} type="date" onChange={handleInputChange} /> : <p>{profileData.birthday || 'Nincs megadva'}</p>}
                </div>
                <div className="info-field">
                  <label><Home size={16} /> Lakcím</label>
                  {isEditing ? <input name="address" value={editData.address} onChange={handleInputChange} /> : <p>{profileData.address}</p>}
                </div>
                <div className="info-field full-width">
                  <label><MessageSquare size={16} /> Bemutatkozás</label>
                  {isEditing ? <textarea name="bio" value={editData.bio} onChange={handleInputChange}></textarea> : <p>"{profileData.bio || 'Nincs még bemutatkozás.'}"</p>}
                </div>
              </div>
            </section>

            <section className="profile-card">
                <h2 className="profile-card-title"><Settings size={20} /> Általános Beállítások</h2>
                <div className="settings-list">
                    <SettingRow icon={<Bell size={20}/>} title="Értesítések" description="Push értesítések az eszközön">
                        <ToggleSwitch isChecked={notifications} onToggle={() => setNotifications(!notifications)} />
                    </SettingRow>
                    <SettingRow icon={<Volume2 size={20}/>} title="Hangok" description="Alkalmazáson belüli hangeffektek">
                        <ToggleSwitch isChecked={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />
                    </SettingRow>
                    <SettingRow icon={<Mail size={20}/>} title="Email riportok" description="Heti összefoglaló a postaládádba">
                        <ToggleSwitch isChecked={emailNotifications} onToggle={() => setEmailNotifications(!emailNotifications)} />
                    </SettingRow>
                    <SettingRow icon={<Eye size={20}/>} title="Online státusz mutatása" description="Láthatják a családtagok, ha aktív vagy">
                        <ToggleSwitch isChecked={onlineStatus} onToggle={() => setOnlineStatus(!onlineStatus)} />
                    </SettingRow>
                    <SettingRow icon={<Globe size={20}/>} title="Helymegosztás" description="Automatikus helyzetmegosztás eseményeknél">
                        <ToggleSwitch isChecked={locationSharing} onToggle={() => setLocationSharing(!locationSharing)} />
                    </SettingRow>
                </div>
            </section>

            <section className="profile-card">
                <h2 className="profile-card-title"><Shield size={20} /> Biztonság</h2>
                <div className="settings-list">
                    <SettingRow icon={<Lock size={20}/>} title="PIN kód módosítása" description="A gyors bejelentkezéshez használt kód">
                        <button className="btn btn-secondary">Módosítás</button>
                    </SettingRow>
                    <SettingRow icon={<Monitor size={20}/>} title="Bejelentkezett eszközök" description="Aktív munkamenetek kezelése">
                        <button className="btn btn-secondary">Kezelés</button>
                    </SettingRow>
                </div>
            </section>
            
            <div className="profile-bottom-actions">
                <button onClick={() => navigate('/time-management')} className="btn btn-secondary">
                  <Clock size={16} /> Időkezelési Központ
                </button>
                <button onClick={() => navigate('/manage-family')} className="btn btn-secondary">
                  <Users size={16} /> Családtagok kezelése
                </button>
                 <button className="btn btn-secondary">
                  <Heart size={16} /> Támogatás & Visszajelzés
                </button>
            </div>
        </main>

      </div>
    </div>
  );
}