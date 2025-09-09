import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, FileText, Save } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField, TextareaField, DateField, FileField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const profileSchema = createSchema()
  .field('name', validationRules.required, validationRules.minLength(2))
  .field('display_name', validationRules.required, validationRules.minLength(2))
  .field('email', validationRules.required, validationRules.email);

export default function ProfileEditModal({ isOpen, onClose, profileData, onSave, isLoading = false }) {
  const { token, apiUrl } = useAuth();
  const [avatarUploading, setAvatarUploading] = useState(false);

  const { values, getFieldProps, handleSubmit, setValues, reset, setValue, isSubmitting } = useFormValidation({
    name: '', display_name: '', email: '', phone: '', bio: '', birth_date: '', avatar_url: ''
  }, profileSchema);

  useEffect(() => {
    if (isOpen && profileData) {
      setValues({
        name: profileData.name || '',
        display_name: profileData.display_name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        bio: profileData.bio || '',
        birth_date: profileData.birth_date || '',
        avatar_url: profileData.avatar_url || ''
      });
    }
  }, [isOpen, profileData, setValues]);

  const handleAvatarUpload = async (file) => {
    if (!file) return;
    setAvatarUploading(true);
    const formData = new FormData();
    formData.append('avatar', file);
    
    try {
      const response = await fetch(`${apiUrl}/api/upload-avatar`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      
      if (response.ok) {
        const { avatar_url } = await response.json();
        setValue('avatar_url', avatar_url);
      }
    } catch (error) {
      console.error('Avatar upload failed:', error);
    } finally {
      setAvatarUploading(false);
    }
  };

  const onSubmit = async (formData) => {
    await onSave(formData);
    onClose();
  };

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Profil Szerkesztése"
      subtitle="Frissítsd a személyes adataidat"
      size="medium"
      loading={isSubmitting || isLoading}
    >
      <ModalSection title="📷 Profilkép" icon="📷">
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div style={{
            width: '80px', height: '80px', borderRadius: '50%', overflow: 'hidden',
            background: 'var(--surface-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            {values.avatar_url ? (
              <img src={values.avatar_url} alt="Avatar" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
            ) : (
              <User size={32} color="var(--text-secondary)" />
            )}
          </div>
          <div style={{flex: 1}}>
            <FileField
              label="Új profilkép feltöltése"
              accept="image/*"
              onChange={(file) => handleAvatarUpload(file)}
              disabled={avatarUploading}
            />
            {avatarUploading && <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Feltöltés...</div>}
          </div>
        </div>
      </ModalSection>

      <ModalSection title="👤 Személyes Adatok" icon="👤">
        <TextField {...getFieldProps('name')} label="Teljes név" required />
        <TextField {...getFieldProps('display_name')} label="Megjelenített név" required />
        <TextField {...getFieldProps('email')} label="Email cím" type="email" required />
        <TextField {...getFieldProps('phone')} label="Telefonszám" type="tel" />
        <DateField {...getFieldProps('birth_date')} label="Születési dátum" />
        <TextareaField {...getFieldProps('bio')} label="Bemutatkozás" placeholder="Írj magadról..." rows={4} />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>
          <Save size={16} /> Mentés
        </button>
      </ModalActions>
    </UniversalModal>
  );
}
