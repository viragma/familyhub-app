import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField, EmailField, PasswordField, SelectField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

// Validation schema for user form
const userSchema = createSchema()
  .field('name', 
    validationRules.required,
    validationRules.minLength(2, 'Name must be at least 2 characters')
  )
  .field('display_name',
    validationRules.required,
    validationRules.minLength(1, 'Display name is required')
  )
  .field('role',
    validationRules.required
  )
  .field('pin',
    (value, allValues) => {
      // PIN only required for new users
      if (!allValues.isEdit && !value) {
        return 'PIN is required for new users';
      }
      if (value && value.length !== 4) {
        return 'PIN must be exactly 4 digits';
      }
      if (value && !/^\d{4}$/.test(value)) {
        return 'PIN must contain only numbers';
      }
      return null;
    }
  )
  .field('email',
    validationRules.email // Optional but must be valid if provided
  );

function UserModal({ isOpen, onClose, onSave, userData = null }) {
  const isEdit = !!userData;
  
  // Initialize form with validation
  const {
    values,
    errors,
    isSubmitting,
    getFieldProps,
    handleSubmit,
    reset,
    setValues
  } = useFormValidation({
    name: '',
    display_name: '',
    role: 'Gyerek',
    pin: '',
    email: '',
    isEdit
  }, userSchema);

  // Update form when userData changes
  useEffect(() => {
    if (isOpen) {
      if (userData) {
        setValues({
          name: userData.name || '',
          display_name: userData.display_name || '',
          role: userData.role || 'Gyerek',
          pin: '', // Never populate PIN for security
          email: userData.email || '',
          isEdit: true
        });
      } else {
        reset({
          name: '',
          display_name: '',
          role: 'Gyerek',
          pin: '',
          email: '',
          isEdit: false
        });
      }
    }
  }, [userData, isOpen, setValues, reset]);

  // Handle form submission
  const onSubmit = async (formData) => {
    try {
      const { isEdit, ...userData } = formData;
      await onSave(userData);
      onClose();
    } catch (error) {
      console.error('Error saving user:', error);
    }
  };

  // Role options
  const roleOptions = [
    { value: 'Családfő', label: 'Családfő' },
    { value: 'Szülő', label: 'Szülő' },
    { value: 'Tizenéves', label: 'Tizenéves' },
    { value: 'Gyerek', label: 'Gyerek' }
  ];

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={userData ? 'Tag Szerkesztése' : 'Új Tag Hozzáadása'}
      subtitle={userData ? 'Módosítsd a tag adatait' : 'Add hozzá az új családtagot'}
      size="medium"
      priority="elevated"
      loading={isSubmitting}
      disabled={isSubmitting}
    >
      <ModalSection 
        title="👤 Személyes Adatok" 
        icon="👤"
        collapsible={false}
      >
        <TextField
          {...getFieldProps('name')}
          label="Teljes Név"
          placeholder="Teljes név megadása"
          autoComplete="name"
          icon="👤"
          required
        />
        
        <TextField
          {...getFieldProps('display_name')}
          label="Megjelenítendő Név"
          placeholder="Becenév vagy rövid név"
          subtitle="Ez fog megjelenni az alkalmazásban"
          autoComplete="nickname"
          icon="✨"
          required
        />
        
        <SelectField
          {...getFieldProps('role')}
          label="Szerepkör"
          placeholder="Válassz szerepkört"
          options={roleOptions}
          icon="🏷️"
          required
        />
      </ModalSection>

      <ModalSection 
        title="🔐 Biztonsági Beállítások" 
        icon="🔐"
        collapsible={false}
      >
        {!isEdit && (
          <PasswordField
            {...getFieldProps('pin')}
            label="4-jegyű PIN"
            placeholder="••••"
            subtitle="Ez lesz a bejelentkezési PIN kódja"
            maxLength={4}
            pattern="[0-9]*"
            autoComplete="new-password"
            icon="🔢"
            required
          />
        )}
        
        <EmailField
          {...getFieldProps('email')}
          label="Email cím"
          placeholder="email@example.com"
          subtitle="Opcionális - értesítések és helyreállítás"
          autoComplete="email"
          icon="📧"
        />
      </ModalSection>

      <ModalActions align="space-between">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Mégse
        </button>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Mentés...' : (userData ? 'Frissítés' : 'Létrehozás')}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default UserModal;