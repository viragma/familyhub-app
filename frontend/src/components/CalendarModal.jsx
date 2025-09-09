import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField, DateField, SelectField, TextareaField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const eventSchema = createSchema()
  .field('title', validationRules.required, validationRules.minLength(2))
  .field('date', validationRules.required)
  .field('start_time', validationRules.required)
  .field('end_time', validationRules.required);

const CalendarModal = ({ isOpen, onClose, onSave, eventData = null, date = null }) => {
  const [error, setError] = useState('');

  const { values, getFieldProps, handleSubmit, setValues, reset, isSubmitting } = useFormValidation({
    title: '', description: '', date: '', start_time: '09:00', end_time: '10:00',
    location: '', category: '', status: 'scheduled'
  }, eventSchema);

  useEffect(() => {
    if (isOpen) {
      if (eventData) {
        setValues({
          title: eventData.title || '',
          description: eventData.description || '',
          date: eventData.date || date || '',
          start_time: eventData.start_time || '09:00',
          end_time: eventData.end_time || '10:00',
          location: eventData.location || '',
          category: eventData.category || '',
          status: eventData.status || 'scheduled'
        });
      } else {
        reset();
        if (date) {
          setValues({ ...values, date });
        }
      }
      setError('');
    }
  }, [isOpen, eventData, date, setValues, reset]);

  const onSubmit = async (formData) => {
    setError('');

    try {
      const eventPayload = {
        title: formData.title,
        description: formData.description || '',
        date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        location: formData.location || '',
        category: formData.category || '',
        status: formData.status || 'scheduled'
      };

      if (eventData?.id) {
        eventPayload.id = eventData.id;
      }

      await onSave(eventPayload);
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt az esemény mentése során');
    }
  };

  const categoryOptions = [
    { value: '', label: 'Nincs kategória' },
    { value: 'work', label: 'Munka' },
    { value: 'personal', label: 'Személyes' },
    { value: 'family', label: 'Családi' },
    { value: 'health', label: 'Egészség' },
    { value: 'education', label: 'Oktatás' },
    { value: 'entertainment', label: 'Szórakozás' }
  ];

  const statusOptions = [
    { value: 'scheduled', label: 'Tervezett' },
    { value: 'in_progress', label: 'Folyamatban' },
    { value: 'completed', label: 'Befejezett' },
    { value: 'cancelled', label: 'Törölve' }
  ];

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={eventData ? 'Esemény szerkesztése' : 'Új esemény'}
      size="medium"
      loading={isSubmitting}
    >
      <ModalSection title="📅 Esemény részletei" icon="📅">
        {error && (
          <div style={{color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem'}}>
            {error}
          </div>
        )}

        <TextField
          {...getFieldProps('title')}
          label="Esemény címe"
          placeholder="Pl. Orvosi vizsgálat"
          required
        />

        <TextareaField
          {...getFieldProps('description')}
          label="Leírás"
          placeholder="Esemény részletes leírása..."
          rows={3}
        />

        <DateField {...getFieldProps('date')} label="Dátum" required />

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <TextField {...getFieldProps('start_time')} label="Kezdés" type="time" required />
          <TextField {...getFieldProps('end_time')} label="Befejezés" type="time" required />
        </div>

        <TextField
          {...getFieldProps('location')}
          label="Helyszín"
          placeholder="Pl. Orvosi rendelő"
        />

        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <SelectField
            {...getFieldProps('category')}
            label="Kategória"
            options={categoryOptions}
          />
          <SelectField
            {...getFieldProps('status')}
            label="Állapot"
            options={statusOptions}
          />
        </div>
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)} disabled={isSubmitting}>
          {isSubmitting ? 'Mentés...' : (eventData ? 'Frissítés' : 'Létrehozás')}
        </button>
      </ModalActions>
    </UniversalModal>
  );
};

export default CalendarModal;
