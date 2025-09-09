import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { NumberField, TextField, SelectField, DateField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const transferSchema = createSchema()
  .field('toAccountId', validationRules.required)
  .field('amount', validationRules.required, validationRules.number, validationRules.min(0.01))
  .field('description', validationRules.required, validationRules.minLength(2));

function TransferModal({ isOpen, onClose, onSave, onSaveRecurring, fromAccount }) {
  const [activeTab, setActiveTab] = useState('single');
  const [recipients, setRecipients] = useState([]);
  const { token, apiUrl } = useAuth();

  const { values, getFieldProps, handleSubmit, setValues, reset, setValue, isSubmitting } = useFormValidation({
    toAccountId: '', 
    amount: '', 
    description: '', 
    frequency: 'havi', 
    dayOfWeek: '1', 
    dayOfMonth: '1', 
    startDate: new Date().toISOString().split('T')[0], 
    isRecurring: false
  }, transferSchema);

  useEffect(() => {
    const fetchRecipients = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/transfer-recipients`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const data = await response.json();
          setRecipients(data.filter(acc => acc.id !== fromAccount?.id));
        } catch (error) { 
          console.error("Error fetching recipients:", error); 
        }
      }
    };
    fetchRecipients();
  }, [isOpen, token, apiUrl, fromAccount]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab('single');
      // Reset form values directly without depending on reset function
      setValue('amount', '');
      setValue('recipientAccount', '');
      setValue('description', '');
      setValue('isRecurring', false);
    }
  }, [isOpen]); // Remove reset dependency

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setValue('isRecurring', tab === 'recurring');
  };

  const onSubmit = async (formData) => {
    if (formData.isRecurring) {
      await onSaveRecurring({
        description: formData.description, 
        amount: parseFloat(formData.amount), 
        type: 'átutalás',
        from_account_id: fromAccount.id, 
        to_account_id: parseInt(formData.toAccountId),
        frequency: formData.frequency,
        day_of_week: formData.frequency === 'heti' ? parseInt(formData.dayOfWeek) : null,
        day_of_month: formData.frequency === 'havi' ? parseInt(formData.dayOfMonth) : null,
        start_date: formData.startDate
      });
    } else {
      await onSave({
        from_account_id: fromAccount.id, 
        to_account_id: parseInt(formData.toAccountId),
        amount: parseFloat(formData.amount), 
        description: formData.description
      });
    }
    onClose();
  };

  const recipientOptions = recipients.map(acc => ({ 
    value: acc.id.toString(), 
    label: acc.name 
  }));
  
  const frequencyOptions = [
    { value: 'heti', label: 'Hetente' }, 
    { value: 'havi', label: 'Havonta' }
  ];

  const dayOfWeekOptions = [
    { value: '1', label: 'Hétfő' },
    { value: '2', label: 'Kedd' },
    { value: '3', label: 'Szerda' },
    { value: '4', label: 'Csütörtök' },
    { value: '5', label: 'Péntek' },
    { value: '6', label: 'Szombat' },
    { value: '7', label: 'Vasárnap' }
  ];

  return (
    <UniversalModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Átutalás" 
      subtitle={`Forrás: ${fromAccount?.name}`} 
      size="medium" 
      loading={isSubmitting}
    >
      <ModalSection title="💸 Utalás Típusa" icon="💸">
        <div style={{
          display: 'flex', 
          gap: '0.5rem', 
          marginBottom: '1rem'
        }}>
          <button 
            type="button" 
            onClick={() => handleTabChange('single')} 
            style={{
              flex: 1, 
              padding: '0.75rem', 
              border: activeTab === 'single' ? '2px solid var(--accent-primary)' : '2px solid rgba(148,163,184,0.2)', 
              borderRadius: '12px', 
              background: activeTab === 'single' ? 'rgba(99,102,241,0.1)' : 'transparent', 
              color: activeTab === 'single' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
              fontWeight: '600'
            }}
          >
            💰 Egyszeri
          </button>
          <button 
            type="button" 
            onClick={() => handleTabChange('recurring')}
            style={{
              flex: 1, 
              padding: '0.75rem', 
              border: activeTab === 'recurring' ? '2px solid var(--accent-primary)' : '2px solid rgba(148,163,184,0.2)', 
              borderRadius: '12px', 
              background: activeTab === 'recurring' ? 'rgba(99,102,241,0.1)' : 'transparent', 
              color: activeTab === 'recurring' ? 'var(--accent-primary)' : 'var(--text-secondary)', 
              fontWeight: '600'
            }}
          >
            🔄 Rendszeres
          </button>
        </div>
      </ModalSection>

      <ModalSection title="📝 Utalás Adatok" icon="📝">
        <SelectField 
          {...getFieldProps('toAccountId')} 
          label="Címzett kassza" 
          options={recipientOptions} 
          required 
        />
        <NumberField 
          {...getFieldProps('amount')} 
          label="Összeg (Ft)" 
          min={0.01} 
          step={0.01} 
          required 
        />
        <TextField 
          {...getFieldProps('description')} 
          label="Megjegyzés" 
          required 
        />
      </ModalSection>

      {values.isRecurring && (
        <ModalSection title="⏰ Ismétlődés" icon="⏰">
          <SelectField 
            {...getFieldProps('frequency')} 
            label="Gyakoriság" 
            options={frequencyOptions} 
            required 
          />
          {values.frequency === 'heti' && (
            <SelectField 
              {...getFieldProps('dayOfWeek')} 
              label="Hét napja" 
              options={dayOfWeekOptions} 
              required 
            />
          )}
          {values.frequency === 'havi' && (
            <NumberField 
              {...getFieldProps('dayOfMonth')} 
              label="Hónap napja" 
              min={1} 
              max={31} 
              required 
            />
          )}
          <DateField 
            {...getFieldProps('startDate')} 
            label="Kezdési dátum" 
            min={new Date().toISOString().split('T')[0]} 
            required 
          />
        </ModalSection>
      )}

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Mégse
        </button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>
          {values.isRecurring ? 'Szabály Létrehozása' : 'Utalás Végrehajtása'}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default TransferModal;