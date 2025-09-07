import React, { useState, useEffect } from 'react';
import {
  X, Save, Camera, User, Mail, Calendar, 
  FileText, Loader, Check
} from 'lucide-react';
import './ProfileEditModal.css';
import { useAuth } from '../context/AuthContext';

export default function ProfileEditModal({ 
  isOpen, 
  onClose, 
  profileData, 
  onSave,
  isLoading = false 
}) {
  const { token, apiUrl } = useAuth();
  
  const [formData, setFormData] = useState({
    name: '',
    display_name: '',
    email: '',
    phone: '',
    bio: '',
    birth_date: '',
    avatar_url: ''
  });

  const [errors, setErrors] = useState({});
  const [hasChanges, setHasChanges] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  // Load profile data when modal opens
  useEffect(() => {
    if (isOpen && profileData) {
      setFormData({
        name: profileData.name || '',
        display_name: profileData.display_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        birth_date: profileData.birth_date || '',
        avatar_url: profileData.avatar_url || ''
      });
      setErrors({});
      setHasChanges(false);
    }
  }, [isOpen, profileData]);

  // Body scroll control for mobile
  useEffect(() => {
    if (isOpen) {
      // Disable body scroll when modal is open
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      // Re-enable body scroll when modal is closed
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }

    // Cleanup on unmount
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isOpen]);

  // Check for changes
  useEffect(() => {
    if (profileData) {
      const hasChanged = 
        formData.name !== (profileData.name || '') ||
        formData.display_name !== (profileData.display_name || '') ||
        formData.email !== (profileData.email || '') ||
        formData.phone !== (profileData.phone || '') ||
        formData.bio !== (profileData.bio || '') ||
        formData.birth_date !== (profileData.birth_date || '') ||
        formData.avatar_url !== (profileData.avatar_url || '');
      
      setHasChanges(hasChanged);
    }
  }, [formData, profileData]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'A név megadása kötelező';
    }

    if (!formData.display_name.trim()) {
      newErrors.display_name = 'A megjelenítendő név kötelező';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Érvénytelen email formátum';
    }

    if (formData.phone && !/^[\+]?[\d\s\-\(\)]+$/.test(formData.phone)) {
      newErrors.phone = 'Érvénytelen telefonszám formátum';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm()) return;
    onSave(formData);
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({...prev, avatar: 'Csak kép fájlokat lehet feltölteni (JPEG, PNG, GIF, WebP)'}));
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({...prev, avatar: 'A fájl mérete nem lehet nagyobb 5MB-nál'}));
      return;
    }

    setAvatarUploading(true);
    setErrors(prev => {
      const newErrors = {...prev};
      delete newErrors.avatar;
      return newErrors;
    });

    try {
      const formDataUpload = new FormData();
      formDataUpload.append('file', file);

      const response = await fetch(`${apiUrl}/api/users/${profileData.id}/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataUpload
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Hiba történt a kép feltöltése során');
      }

      const result = await response.json();
      handleInputChange('avatar_url', `${apiUrl}${result.avatar_url}`);
      
    } catch (error) {
      console.error('Avatar upload error:', error);
      setErrors(prev => ({...prev, avatar: error.message}));
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleClose = () => {
    if (hasChanges && !window.confirm('Biztos vagy benne, hogy bezárod? A változtatások elvesznek.')) {
      return;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="profile-edit-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div className="modal-title">
            <User size={24} />
            <h2>Profil szerkesztése</h2>
          </div>
          <button className="modal-close" onClick={handleClose}>
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="modal-content">
          {/* Avatar Section */}
          <div className="avatar-edit-section">
            <div className="avatar-preview">
              <img 
                src={formData.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.display_name || 'U')}&background=6366f1&color=fff&size=128`}
                alt="Profilkép előnézet"
                className="avatar-preview-img"
              />
              <div className="avatar-upload-overlay">
                <input
                  type="file"
                  id="modal-avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                  disabled={avatarUploading}
                />
                <label htmlFor="modal-avatar-upload" className={`avatar-upload-btn ${avatarUploading ? 'uploading' : ''}`}>
                  {avatarUploading ? <Loader size={16} className="spinning" /> : <Camera size={16} />}
                  <span>{avatarUploading ? 'Feltöltés...' : 'Kép módosítása'}</span>
                </label>
              </div>
            </div>
            {errors.avatar && <div className="error-message">{errors.avatar}</div>}
          </div>

          {/* Form Fields */}
          <div className="form-grid">
            {/* Name Fields */}
            <div className="form-group">
              <label htmlFor="name">
                <User size={16} />
                Teljes név *
              </label>
              <input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Add meg a teljes neved"
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-text">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="display_name">
                <User size={16} />
                Megjelenítendő név *
              </label>
              <input
                id="display_name"
                type="text"
                value={formData.display_name}
                onChange={(e) => handleInputChange('display_name', e.target.value)}
                placeholder="Hogyan jelenjen meg a neved"
                className={errors.display_name ? 'error' : ''}
              />
              {errors.display_name && <span className="error-text">{errors.display_name}</span>}
            </div>

            {/* Contact Fields */}
            <div className="form-group">
              <label htmlFor="email">
                <Mail size={16} />
                Email cím
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="pelda@email.com"
                className={errors.email ? 'error' : ''}
              />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="phone">
                <Mail size={16} />
                Telefonszám
              </label>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+36 30 123 4567"
                className={errors.phone ? 'error' : ''}
              />
              {errors.phone && <span className="error-text">{errors.phone}</span>}
            </div>

            {/* Birth Date */}
            <div className="form-group">
              <label htmlFor="birth_date">
                <Calendar size={16} />
                Születési dátum
              </label>
              <input
                id="birth_date"
                type="date"
                value={formData.birth_date}
                onChange={(e) => handleInputChange('birth_date', e.target.value)}
              />
            </div>

            {/* Bio - Full Width */}
            <div className="form-group form-group-full">
              <label htmlFor="bio">
                <FileText size={16} />
                Bemutatkozás
              </label>
              <textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                placeholder="Írj röviden magadról..."
                rows="3"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <div className="modal-actions">
            <button 
              className="btn btn-secondary" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Mégse
            </button>
            <button 
              className="btn btn-primary"
              onClick={handleSave}
              disabled={!hasChanges || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="spinner" />
                  Mentés...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Mentés
                </>
              )}
            </button>
          </div>
          {hasChanges && (
            <div className="changes-indicator">
              <Check size={14} />
              <span>Nem mentett változtatások</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
