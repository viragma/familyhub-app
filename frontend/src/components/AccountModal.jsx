import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField, NumberField, SelectField, DateField, CheckboxField, TagsField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

// Validation schema for accounts
const accountSchema = createSchema()
  .field('name',
    validationRules.required,
    validationRules.minLength(2, 'Account name must be at least 2 characters')
  )
  .field('type',
    validationRules.required
  )
  .field('goalAmount',
    (value, allValues) => {
      if (allValues.type === 'cél' && !value) {
        return 'Goal amount is required for goal accounts';
      }
      if (value && parseFloat(value) <= 0) {
        return 'Goal amount must be greater than 0';
      }
      return null;
    }
  )
  .field('goalDate',
    (value, allValues) => {
      if (allValues.type === 'cél' && !value) {
        return 'Goal date is required for goal accounts';
      }
      if (value && new Date(value) <= new Date()) {
        return 'Goal date must be in the future';
      }
      return null;
    }
  );

function AccountModal({ isOpen, onClose, onSave, accountData = null }) {
  const [familyMembers, setFamilyMembers] = useState([]);
  const [monthlySaving, setMonthlySaving] = useState(0);
  const { user, token, apiUrl } = useAuth();
  const isEdit = !!accountData;

  // Initialize form validation
  const {
    values,
    errors,
    isSubmitting,
    getFieldProps,
    handleSubmit,
    reset,
    setValues,
    setValue
  } = useFormValidation({
    name: '',
    type: 'cél',
    goalAmount: '',
    goalDate: '',
    showOnDashboard: false,
    viewerIds: []
  }, accountSchema);

  // Today's date for date picker constraint
  const today = new Date().toISOString().split('T')[0];

  // Fetch family members
  useEffect(() => {
    const fetchMembers = async () => {
      if (user && isOpen) {
        try {
          const response = await fetch(`${apiUrl}/api/families/${user.family_id}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const members = await response.json();
          setFamilyMembers(members);
        } catch (error) {
          console.error("Error fetching family members:", error);
        }
      }
    };

    fetchMembers();
  }, [isOpen, user, token, apiUrl]);

  // Initialize form data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (accountData) {
        // Editing existing account - use individual setValue calls
        setValue('name', accountData.name || '');
        setValue('type', accountData.type || 'cél');
        setValue('goalAmount', accountData.goal_amount?.toString() || '');
        setValue('goalDate', accountData.goal_date ? new Date(accountData.goal_date).toISOString().split('T')[0] : '');
        setValue('showOnDashboard', accountData.show_on_dashboard || false);
        setValue('viewerIds', accountData.viewers?.map(v => v.id) || []);
      } else {
        // New account - use individual setValue calls
        setValue('name', '');
        setValue('type', 'cél');
        setValue('goalAmount', '');
        setValue('goalDate', '');
        setValue('showOnDashboard', false);
        setValue('viewerIds', []);
      }
    }
  }, [isOpen, accountData?.id]); // Only depend on stable values

  // Calculate monthly saving requirement
  useEffect(() => {
    if (values.type === 'cél' && values.goalAmount > 0 && values.goalDate) {
      const target = new Date(values.goalDate);
      const now = new Date();
      if (target <= now) {
        setMonthlySaving(0);
        return;
      }
      const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
      setMonthlySaving(months > 0 ? parseFloat(values.goalAmount) / months : parseFloat(values.goalAmount));
    } else {
      setMonthlySaving(0);
    }
  }, [values.goalAmount, values.goalDate, values.type]);

  // Handle form submission
  const onSubmit = async (formData) => {
    try {
      const dataToSend = {
        name: formData.name,
        type: formData.type,
        goal_amount: formData.goalAmount ? parseFloat(formData.goalAmount) : null,
        goal_date: formData.goalDate || null,
        show_on_dashboard: formData.showOnDashboard,
        viewer_ids: formData.viewerIds
      };
      await onSave(dataToSend);
      onClose();
    } catch (error) {
      console.error('Error saving account:', error);
    }
  };

  // Handle viewer management
  const handleViewersChange = (selectedMemberNames) => {
    const selectedIds = familyMembers
      .filter(member => selectedMemberNames.includes(member.display_name))
      .map(member => member.id);
    setValue('viewerIds', selectedIds);
  };

  // Get options and display data
  const accountTypeOptions = [
    { value: 'cél', label: '🎯 Célkassza' },
    { value: 'vész', label: '🚨 Vészkassza' }
  ];

  const selectedMemberNames = familyMembers
    .filter(member => values.viewerIds.includes(member.id))
    .map(member => member.display_name);

  const availableMemberNames = familyMembers
    .filter(member => user && member.id !== user.id)
    .map(member => member.display_name);

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={accountData ? 'Kassza Szerkesztése' : 'Új Kassza Létrehozása'}
      subtitle={accountData ? 'Módosítsd a kassza beállításait' : 'Hozz létre egy új kasszát'}
      size="medium"
      priority="elevated"
      loading={isSubmitting}
      disabled={isSubmitting}
    >
      {/* Basic Account Information */}
      <ModalSection 
        title="💼 Kassza Alapadatok" 
        icon="💼"
        collapsible={false}
      >
        <TextField
          {...getFieldProps('name')}
          label="Kassza Neve"
          placeholder="Pl. Nyaralás kassza, Autó kassza"
          icon="📝"
          maxLength={50}
          required
        />
        
        <SelectField
          {...getFieldProps('type')}
          label="Kassza Típusa"
          placeholder="Válassz típust"
          options={accountTypeOptions}
          icon="🏷️"
          required
        />
      </ModalSection>

      {/* Goal Settings - Only for goal accounts */}
      {values.type === 'cél' && (
        <ModalSection 
          title="🎯 Cél Beállítások" 
          icon="🎯"
          collapsible={false}
        >
          <NumberField
            {...getFieldProps('goalAmount')}
            label="Célösszeg (Ft)"
            placeholder="0"
            icon="💰"
            min={1}
            step={1}
            required
          />
          
          <DateField
            {...getFieldProps('goalDate')}
            label="Határidő"
            subtitle="Mikor szeretnéd elérni a célt?"
            icon="📅"
            min={today}
            required
          />
          
          {monthlySaving > 0 && (
            <div style={{
              padding: '1rem',
              background: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.2)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              fontSize: '0.9375rem',
              color: 'var(--text-primary, #1e293b)'
            }}>
              <span style={{ fontSize: '1.25rem' }}>💡</span>
              <div>
                <strong>Havi félretétel szükséglet:</strong><br/>
                <span style={{ 
                  fontSize: '1.125rem', 
                  fontWeight: '700',
                  color: 'var(--accent-primary, #6366f1)'
                }}>
                  {Math.ceil(monthlySaving).toLocaleString('hu-HU')} Ft
                </span>
              </div>
            </div>
          )}
        </ModalSection>
      )}

      {/* Sharing Settings */}
      <ModalSection 
        title="👥 Megosztási Beállítások" 
        icon="👥"
        collapsible={true}
      >
        <FormField
          type="tags"
          value={selectedMemberNames}
          onChange={handleViewersChange}
          label="Kik láthatják a kasszát?"
          placeholder="Családtag nevének begépelése..."
          subtitle="Add hozzá azokat a családtagokat, akik láthatják ezt a kasszát"
          options={availableMemberNames}
          icon="👤"
        />
        
        {user && ['Szülő', 'Családfő'].includes(user.role) && (
          <CheckboxField
            {...getFieldProps('showOnDashboard')}
            label="Megjelenítés mindenki Dashboard-ján"
            subtitle="Ha bekapcsolod, ez a kassza minden családtag főoldalán látható lesz"
          />
        )}
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
          {isSubmitting ? 'Mentés...' : (accountData ? 'Frissítés' : 'Kassza Létrehozása')}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default AccountModal;