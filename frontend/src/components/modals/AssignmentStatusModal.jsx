import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { TextareaField } from '../universal/FormField';
import { useFormValidation, createSchema, validationRules } from '../universal/ValidationEngine';

const statusSchema = createSchema()
  .field('notes', validationRules.maxLength(500));

const AssignmentStatusModal = ({ isOpen, onClose, assignment, template, member, onUpdate }) => {
  const { token, apiUrl } = useAuth();
  
  const [status, setStatus] = useState(assignment?.status || 'scheduled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { values, getFieldProps, handleSubmit: handleFormSubmit, setValues, reset, isSubmitting } = useFormValidation({
    notes: assignment?.notes || ''
  }, statusSchema);

  const statusOptions = [
    { value: 'scheduled', label: 'Tervezett', icon: '📅', color: '#6b7280' },
    { value: 'in_progress', label: 'Folyamatban', icon: '⏳', color: '#f59e0b' },
    { value: 'completed', label: 'Befejezett', icon: '✅', color: '#10b981' },
    { value: 'cancelled', label: 'Törölve', icon: '❌', color: '#ef4444' }
  ];

  const handleSubmit = async (formData) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/calendar/assignments/${assignment.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: status,
          notes: formData.notes
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update assignment');
      }

      const updatedAssignment = await response.json();
      if (onUpdate) {
        onUpdate(updatedAssignment);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Hiba történt az állapot frissítése során');
    } finally {
      setLoading(false);
    }
  };

  const getCurrentStatus = () => {
    return statusOptions.find(s => s.value === status);
  };

  if (!isOpen || !assignment) return null;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Beosztás állapota"
      size="medium"
      loading={isSubmitting || loading}
    >
      <ModalSection title="ℹ️ Beosztás részletei" icon="ℹ️">
        <div style={{background: 'var(--surface-secondary)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem'}}>
            <h3 style={{margin: 0, fontSize: '1.125rem', fontWeight: '600', color: 'var(--text-primary)'}}>{template?.name}</h3>
            <div style={{fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: '500'}}>
              {template?.start_time} - {template?.end_time}
            </div>
          </div>
          
          <div style={{display: 'grid', gap: '0.5rem'}}>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)', fontWeight: '500'}}>Családtag:</span>
              <span style={{color: 'var(--text-primary)', fontWeight: '600'}}>{member?.full_name || member?.name}</span>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
              <span style={{color: 'var(--text-secondary)', fontWeight: '500'}}>Dátum:</span>
              <span style={{color: 'var(--text-primary)', fontWeight: '600'}}>
                {new Date(assignment.date).toLocaleDateString('hu-HU', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
            </div>
            {template?.location && (
              <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <span style={{color: 'var(--text-secondary)', fontWeight: '500'}}>Helyszín:</span>
                <span style={{color: 'var(--text-primary)', fontWeight: '600'}}>{template.location}</span>
              </div>
            )}
          </div>
        </div>
      </ModalSection>

      <ModalSection title="📊 Állapot" icon="📊">
        {error && <div style={{color: 'var(--error)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem'}}>{error}</div>}

        <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem'}}>
          {statusOptions.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => setStatus(option.value)}
              style={{
                padding: '1rem 0.75rem',
                border: status === option.value ? `2px solid ${option.color}` : '2px solid rgba(148,163,184,0.2)',
                borderRadius: '12px',
                background: status === option.value ? `${option.color}15` : 'transparent',
                color: status === option.value ? option.color : 'var(--text-secondary)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <span style={{fontSize: '1.5rem'}}>{option.icon}</span>
              <span style={{fontSize: '0.875rem'}}>{option.label}</span>
            </button>
          ))}
        </div>

        <TextareaField
          {...getFieldProps('notes')}
          label="Megjegyzések"
          placeholder="Opcionális megjegyzések a beosztáshoz..."
          rows={3}
        />
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleFormSubmit(handleSubmit)} disabled={isSubmitting || loading}>
          {(isSubmitting || loading) ? 'Frissítés...' : 'Állapot frissítése'}
        </button>
      </ModalActions>
    </UniversalModal>
  );
};

export default AssignmentStatusModal;
