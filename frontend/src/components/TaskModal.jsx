import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const taskSchema = createSchema()
  .field('title', validationRules.required, validationRules.minLength(2))
  .field('owner', validationRules.minLength(2))
  .field('reward', validationRules.minLength(1));

function TaskModal({ isOpen, onClose, onSave }) {
  const { values, getFieldProps, handleSubmit, reset, isSubmitting } = useFormValidation({
    title: '', owner: '', reward: ''
  }, taskSchema);

  useEffect(() => {
    if (isOpen) {
      reset();
    }
  }, [isOpen, reset]);

  const onSubmit = async (formData) => {
    await onSave({
      title: formData.title,
      owner: formData.owner,
      reward: formData.reward,
      done: false
    });
    onClose();
  };

  return (
    <UniversalModal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="Új Feladat Létrehozása" 
      size="small" 
      loading={isSubmitting}
    >
      <ModalSection title="📝 Feladat Adatok" icon="📝">
        <TextField 
          {...getFieldProps('title')} 
          label="Mi a feladat?" 
          placeholder="Pl. Porszívózás" 
          required 
        />
        <TextField 
          {...getFieldProps('owner')} 
          label="Kié a feladat?" 
          placeholder="Pl. Peti" 
        />
        <TextField 
          {...getFieldProps('reward')} 
          label="Mi a jutalom?" 
          placeholder="Pl. 500 Ft" 
        />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Mégse
        </button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>
          Mentés
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default TaskModal;