import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { TextField, NumberField, SelectField, DateField, CheckboxField } from '../universal/FormField';
import { useFormValidation, createSchema, validationRules } from '../universal/ValidationEngine';

const expenseSchema = createSchema()
  .field('description', validationRules.required, validationRules.minLength(2))
  .field('estimated_amount', validationRules.required, validationRules.number, validationRules.min(0.01))
  .field('category_id', validationRules.required)
  .field('due_date', validationRules.required);

function ExpectedExpenseModal({ isOpen, onClose, onSave, expenseData }) {
  const [categories, setCategories] = useState([]);
  const { token, apiUrl } = useAuth();

  const { values, getFieldProps, handleSubmit, setValues, reset, setValue, isSubmitting } = useFormValidation({
    description: '', estimated_amount: '', priority: 'közepes', category_id: '',
    due_date_option: 'specific_date', due_date: new Date().toISOString().split('T')[0],
    is_recurring: false, recurring_frequency: 'havi'
  }, expenseSchema);

  useEffect(() => {
    const fetchCategories = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/categories/tree`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setCategories(await response.json());
        } catch (error) {
          console.error("Error fetching categories:", error);
        }
      }
    };
    fetchCategories();
  }, [isOpen, token, apiUrl]);

  useEffect(() => {
    if (isOpen) {
      if (expenseData) {
        // Use individual setValue calls instead of setValues
        setValue('description', expenseData.description || '');
        setValue('estimated_amount', expenseData.estimated_amount || '');
        setValue('priority', expenseData.priority || 'közepes');
        setValue('category_id', expenseData.category_id || '');
        setValue('due_date_option', 'specific_date');
        setValue('due_date', new Date(expenseData.due_date).toISOString().split('T')[0]);
        setValue('is_recurring', expenseData.is_recurring || false);
        setValue('recurring_frequency', expenseData.recurring_frequency || 'havi');
      } else {
        // Reset form with individual setValue calls
        setValue('description', '');
        setValue('estimated_amount', '');
        setValue('priority', 'közepes');
        setValue('category_id', '');
        setValue('due_date_option', 'specific_date');
        setValue('due_date', '');
        setValue('is_recurring', false);
        setValue('recurring_frequency', 'havi');
      }
    }
  }, [isOpen, expenseData?.id]); // Only depend on stable values

  const onSubmit = async (formData) => {
    await onSave(formData);
    onClose();
  };

  const priorityOptions = [
    { value: 'alacsony', label: 'Alacsony' },
    { value: 'közepes', label: 'Közepes' },
    { value: 'magas', label: 'Magas' },
    { value: 'kritikus', label: 'Kritikus' }
  ];

  const frequencyOptions = [
    { value: 'heti', label: 'Hetente' },
    { value: 'havi', label: 'Havonta' },
    { value: 'éves', label: 'Évente' }
  ];

  const categoryOptions = categories
    .filter(cat => !cat.parent_id)
    .map(cat => ({ value: cat.id.toString(), label: cat.name }));

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={expenseData ? 'Várható Kiadás Szerkesztése' : 'Új Várható Kiadás'}
      size="medium"
      loading={isSubmitting}
    >
      <ModalSection title="💰 Kiadás Adatok" icon="💰">
        <TextField {...getFieldProps('description')} label="Leírás" placeholder="Pl. Autó szerviz" required />
        <NumberField {...getFieldProps('estimated_amount')} label="Becsült összeg (Ft)" min={0.01} step={0.01} required />
        <SelectField {...getFieldProps('priority')} label="Prioritás" options={priorityOptions} required />
        <SelectField {...getFieldProps('category_id')} label="Kategória" options={categoryOptions} required />
      </ModalSection>

      <ModalSection title="📅 Időzítés" icon="📅">
        <DateField {...getFieldProps('due_date')} label="Esedékesség dátuma" required />
        <CheckboxField {...getFieldProps('is_recurring')} label="Ismétlődő kiadás" />
        {values.is_recurring && (
          <SelectField {...getFieldProps('recurring_frequency')} label="Ismétlődés gyakorisága" options={frequencyOptions} />
        )}
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>
          {expenseData ? 'Frissítés' : 'Mentés'}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default ExpectedExpenseModal;