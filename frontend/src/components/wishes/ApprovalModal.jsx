import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { SelectField, TextField, TextareaField } from '../universal/FormField';
import { useFormValidation, createSchema, validationRules } from '../universal/ValidationEngine';

const approvalSchema = createSchema()
  .field('status', validationRules.required);

function ApprovalModal({ isOpen, onClose, onDecision, wish }) {
  const { values, getFieldProps, handleSubmit, reset, setValue } = useFormValidation({
    status: 'approved', feedback: '', conditional_note: ''
  }, approvalSchema);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (formData) => {
    await onDecision(wish.id, {
      status: formData.status,
      feedback: formData.feedback,
      conditional_note: formData.conditional_note,
    });
    onClose();
  };

  const statusOptions = [
    { value: 'approved', label: 'Jóváhagyom' },
    { value: 'conditional', label: 'Feltételes jóváhagyás' },
    { value: 'modifications_requested', label: 'Módosítást kérek' },
    { value: 'rejected', label: 'Elutasítom' }
  ];

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'var(--success)';
      case 'conditional': return 'var(--warning)';
      case 'modifications_requested': return 'var(--accent-primary)';
      case 'rejected': return 'var(--error)';
      default: return 'var(--text-primary)';
    }
  };

  if (!wish) return null;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Döntés a kívánságról"
      subtitle="Értékeld és hozz döntést a beküldött kívánságról"
      size="medium"
    >
      <ModalSection title="🎯 Kívánság Előnézet" icon="🎯">
        <div style={{
          padding: '1rem', borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(99,102,241,0.1) 0%, rgba(67,56,202,0.05) 100%)',
          border: '1px solid rgba(99,102,241,0.2)', marginBottom: '1rem'
        }}>
          <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--accent-primary)'}}>{wish.name}</h4>
          {wish.description && (
            <p style={{margin: '0 0 0.5rem 0', color: 'var(--text-secondary)'}}>{wish.description}</p>
          )}
          {wish.estimated_price && (
            <div style={{fontSize: '1.1rem', fontWeight: '700', color: 'var(--text-primary)'}}>
              {parseFloat(wish.estimated_price).toLocaleString('hu-HU')} Ft
            </div>
          )}
        </div>
      </ModalSection>

      <ModalSection title="⚖️ Döntés" icon="⚖️">
        <SelectField 
          {...getFieldProps('status')} 
          label="Döntés" 
          options={statusOptions} 
          required 
        />
        {values.status === 'conditional' && (
          <TextField 
            {...getFieldProps('conditional_note')} 
            label="Feltétel" 
            placeholder="pl. Karácsonyra, jó jegyek esetén..." 
          />
        )}
      </ModalSection>

      <ModalSection title="💬 Visszajelzés" icon="💬">
        <TextareaField 
          {...getFieldProps('feedback')} 
          label="Indoklás (opcionális)" 
          placeholder="Add meg az indoklást a döntésedhez..." 
          rows={4} 
        />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Mégse
        </button>
        <button 
          type="button" 
          className="btn btn-primary" 
          style={{backgroundColor: getStatusColor(values.status)}}
          onClick={() => handleSubmit(onSubmit)}
        >
          📨 Döntés elküldése
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default ApprovalModal;