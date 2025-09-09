import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { NumberField, TextField, SelectField, DateField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const recurringRuleSchema = createSchema()
  .field('description', validationRules.required, validationRules.minLength(2))
  .field('amount', validationRules.required, validationRules.number, validationRules.min(0.01))
  .field('frequency', validationRules.required)
  .field('startDate', validationRules.required);

function RecurringRuleModal({ isOpen, onClose, onSave, ruleData }) {
  const { user, token, apiUrl } = useAuth();

  const { values, getFieldProps, handleSubmit, setValues, reset, setValue, isSubmitting } = useFormValidation({
    description: '', amount: '', type: 'kiadás', from_account_id: '', to_account_id: '', category_id: '',
    frequency: 'havi', dayOfMonth: '1', dayOfWeek: '1', startDate: '', endDate: ''
  }, recurringRuleSchema);

  useEffect(() => {
    if (isOpen) {
      if (ruleData) {
        // Use individual setValue calls instead of setValues
        setValue('description', ruleData.description || '');
        setValue('amount', ruleData.amount || '');
        setValue('type', ruleData.type || 'kiadás');
        setValue('from_account_id', ruleData.from_account_id || '');
        setValue('to_account_id', ruleData.to_account_id || '');
        setValue('category_id', ruleData.category_id || '');
        setValue('frequency', ruleData.frequency || 'havi');
        setValue('dayOfMonth', ruleData.day_of_month || '1');
        setValue('dayOfWeek', ruleData.day_of_week || '1');
        setValue('startDate', ruleData.start_date ? new Date(ruleData.start_date).toISOString().split('T')[0] : '');
        setValue('endDate', ruleData.end_date ? new Date(ruleData.end_date).toISOString().split('T')[0] : '');
      } else {
        // Reset form with individual setValue calls
        setValue('description', '');
        setValue('amount', '');
        setValue('type', 'kiadás');
        setValue('from_account_id', '');
        setValue('to_account_id', '');
        setValue('category_id', '');
        setValue('frequency', 'havi');
        setValue('dayOfMonth', '1');
        setValue('dayOfWeek', '1');
        setValue('startDate', '');
        setValue('endDate', '');
      }
    }
  }, [isOpen, ruleData?.id]); // Only depend on stable values

  const onSubmit = async (formData) => {
    const dataToSend = {
      description: formData.description,
      amount: parseFloat(formData.amount),
      type: formData.type,
      from_account_id: formData.from_account_id ? parseInt(formData.from_account_id) : null,
      to_account_id: formData.to_account_id ? parseInt(formData.to_account_id) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      frequency: formData.frequency,
      day_of_month: formData.frequency === 'havi' ? parseInt(formData.dayOfMonth) : null,
      day_of_week: formData.frequency === 'heti' ? parseInt(formData.dayOfWeek) : null,
      start_date: formData.startDate,
      end_date: formData.endDate || null,
    };
    await onSave(dataToSend);
    onClose();
  };

  const frequencyOptions = [
    { value: 'napi', label: 'Naponta' },
    { value: 'heti', label: 'Hetente' },
    { value: 'havi', label: 'Havonta' },
    { value: 'éves', label: 'Évente' }
  ];

  const dayOfWeekOptions = [
    { value: '1', label: 'Hétfő' }, { value: '2', label: 'Kedd' }, { value: '3', label: 'Szerda' },
    { value: '4', label: 'Csütörtök' }, { value: '5', label: 'Péntek' }, { value: '6', label: 'Szombat' }, { value: '7', label: 'Vasárnap' }
  ];

  return (
    <UniversalModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={ruleData ? 'Szabály Szerkesztése' : 'Új Szabály Létrehozása'} 
      size="medium" 
      loading={isSubmitting}
    >
      <ModalSection title="📝 Szabály Adatok" icon="📝">
        <TextField {...getFieldProps('description')} label="Leírás" required />
        <NumberField {...getFieldProps('amount')} label="Összeg (Ft)" min={0.01} step={0.01} required />
      </ModalSection>

      <ModalSection title="⏰ Ismétlődés" icon="⏰">
        <SelectField {...getFieldProps('frequency')} label="Gyakoriság" options={frequencyOptions} required />
        {values.frequency === 'heti' && (
          <SelectField {...getFieldProps('dayOfWeek')} label="A hét napja" options={dayOfWeekOptions} required />
        )}
        {values.frequency === 'havi' && (
          <NumberField {...getFieldProps('dayOfMonth')} label="A hónap napja" min={1} max={31} required />
        )}
        <DateField {...getFieldProps('startDate')} label="Érvényesség Kezdete" required />
        <DateField {...getFieldProps('endDate')} label="Érvényesség Vége (opcionális)" />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>Mentés</button>
      </ModalActions>
    </UniversalModal>
  );
}

export default RecurringRuleModal;