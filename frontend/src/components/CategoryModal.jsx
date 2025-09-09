import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { TextField, ColorField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const suggestedEmojis = [
    { group: 'Otthon és Háztartás', emojis: ['🏠', '🔌', '💧', '🔧', '🛋️', '🧹'] },
    { group: 'Élelmiszer és Bevásárlás', emojis: ['🛒', '🍎', '🥕', '🍞', '🍽️', '☕'] },
    { group: 'Közlekedés', emojis: ['🚗', '🚌', '⛽', '🚲', '✈️', '🚆'] },
    { group: 'Szórakozás és Egészség', emojis: ['🎉', '🍿', '💊', '🏋️', '🎁', '👕'] },
    { group: 'Pénzügyek és Munka', emojis: ['💰', '💼', '📈', '🧾', '🏦', '📎'] },
];

const categorySchema = createSchema()
  .field('name', validationRules.required, validationRules.minLength(2))
  .field('color', validationRules.required)
  .field('icon', validationRules.required);

function CategoryModal({ isOpen, onClose, onSave, categoryData = null, parentId = null }) {
  const { values, getFieldProps, handleSubmit, setValues, reset, setValue } = useFormValidation({
    name: '', color: '#818cf8', icon: ''
  }, categorySchema);

  useEffect(() => {
    if (isOpen) {
      if (categoryData) {
        // Use individual setValue calls instead of setValues
        setValue('name', categoryData.name || '');
        setValue('color', categoryData.color || '#818cf8');
        setValue('icon', categoryData.icon || '');
      } else {
        // Reset form with individual setValue calls
        setValue('name', '');
        setValue('color', '#818cf8');
        setValue('icon', '');
      }
    }
  }, [categoryData?.id, isOpen]); // Only depend on stable values

  const onSubmit = async (formData) => {
    await onSave({ ...formData, parent_id: parentId });
    onClose();
  };

  return (
    <UniversalModal isOpen={isOpen} onClose={onClose} title={categoryData ? 'Kategória Szerkesztése' : 'Új Kategória'} size="medium">
      <ModalSection title="📝 Alapadatok" icon="📝">
        <TextField {...getFieldProps('name')} label="Kategória neve" required />
        <div style={{display: 'flex', gap: '1rem'}}>
          <ColorField {...getFieldProps('color')} label="Szín" required />
          <TextField {...getFieldProps('icon')} label="Ikon (Emoji)" placeholder="🚗" required />
        </div>
      </ModalSection>
      
      <ModalSection title="😀 Ikon Választó" icon="😀">
        <div className="emoji-picker">
          {suggestedEmojis.map(group => (
            <div key={group.group}>
              <h4 style={{margin: '1rem 0 0.5rem', color: 'var(--text-secondary)'}}>{group.group}</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 50px)', gap: '0.5rem', marginBottom: '1rem'}}>
                {group.emojis.map(emoji => (
                  <button key={emoji} type="button" onClick={() => setValue('icon', emoji)}
                    style={{padding: '0.75rem', fontSize: '1.25rem', border: '2px solid rgba(148,163,184,0.2)', borderRadius: '8px', background: 'white', cursor: 'pointer', transition: 'all 0.2s ease'}}
                    onMouseOver={(e) => e.target.style.borderColor = 'var(--accent-primary, #6366f1)'}
                    onMouseOut={(e) => e.target.style.borderColor = 'rgba(148,163,184,0.2)'}>
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>Mentés</button>
      </ModalActions>
    </UniversalModal>
  );
}

export default CategoryModal;