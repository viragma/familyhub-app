import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { NumberField, TextField, SelectField } from '../universal/FormField';
import { useFormValidation, createSchema, validationRules } from '../universal/ValidationEngine';

const completeExpenseSchema = createSchema()
  .field('actualAmount', validationRules.required, validationRules.number, validationRules.min(0.01))
  .field('accountId', validationRules.required);

function ExpectedExpenseCompleteModal({ isOpen, onClose, onComplete, expenseData, accounts }) {
  const { values, getFieldProps, handleSubmit, setValues, reset, isSubmitting } = useFormValidation({
    actualAmount: '', accountId: ''
  }, completeExpenseSchema);

  useEffect(() => {
    if (isOpen && expenseData) {
      setValues({
        actualAmount: expenseData.estimated_amount || '',
        accountId: ''
      });
    }
  }, [isOpen, expenseData, setValues]);

  const onSubmit = async (formData) => {
    await onComplete(expenseData.id, {
      actual_amount: parseFloat(formData.actualAmount),
      account_id: parseInt(formData.accountId),
    });
    onClose();
  };

  if (!expenseData) return null;

  const accountOptions = accounts
    .filter(acc => ['személyes', 'közös', 'vész'].includes(acc.type))
    .map(acc => ({
      value: acc.id.toString(),
      label: `${acc.name} (${parseFloat(acc.balance).toLocaleString('hu-HU')} Ft)`
    }));

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Kiadás Teljesítése"
      subtitle="Erősítsd meg a végleges összeget és válaszd ki a forrás kasszát"
      size="small"
      loading={isSubmitting}
    >
      <ModalSection title="📋 Kiadás Adatok" icon="📋">
        <TextField
          label="Tétel"
          value={expenseData.description}
          disabled
        />
        <div style={{
          padding: '0.75rem', borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(29,78,216,0.05) 100%)',
          border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem'
        }}>
          <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.25rem'}}>
            Becsült összeg
          </div>
          <div style={{fontSize: '1.1rem', fontWeight: '600', color: 'var(--accent-primary)'}}>
            {parseFloat(expenseData.estimated_amount).toLocaleString('hu-HU')} Ft
          </div>
        </div>
      </ModalSection>

      <ModalSection title="💰 Végleges Adatok" icon="💰">
        <NumberField
          {...getFieldProps('actualAmount')}
          label="Végleges Összeg (Ft)"
          min={0.01}
          step={0.01}
          required
          autoFocus
        />
        <SelectField
          {...getFieldProps('accountId')}
          label="Forrás Kassza"
          options={[{ value: '', label: 'Válassz kasszát...' }, ...accountOptions]}
          required
        />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Mégse
        </button>
        <button
          type="button"
          className="btn btn-primary"
          style={{backgroundColor: 'var(--success)'}}
          onClick={() => handleSubmit(onSubmit)}
        >
          ✅ Teljesítés
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default ExpectedExpenseCompleteModal;