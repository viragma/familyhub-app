import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { NumberField, TextField, SelectField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

const closeGoalSchema = createSchema()
  .field('finalAmount', validationRules.required, validationRules.number, validationRules.min(0.01))
  .field('description', validationRules.required, validationRules.minLength(2));

function CloseGoalModal({ isOpen, onClose, onSubmit, account, categories, error: apiError }) {
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const { user, token, apiUrl } = useAuth();

  const { values, getFieldProps, handleSubmit, setValues, reset, setValue, isSubmitting } = useFormValidation({
    finalAmount: '', description: '', categoryId: '', remainderDestinationAccountId: ''
  }, closeGoalSchema);

  useEffect(() => {
    if (account && isOpen) {
      setValues({
        finalAmount: account.balance ? parseFloat(account.balance).toString() : '0',
        description: `Vásárlás: ${account.name.replace(/\[Teljesítve\]\s*/, '')}`,
        categoryId: '', remainderDestinationAccountId: ''
      });

      const fetchAccounts = async () => {
        if (token) {
          try {
            const response = await fetch(`${apiUrl}/api/accounts`, {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
              const allAccounts = await response.json();
              const filtered = allAccounts.filter(acc =>
                acc.id !== account.id && acc.status === 'active' &&
                (acc.type === 'személyes' || acc.type === 'közös')
              );
              setAvailableAccounts(filtered);
              if (filtered.length > 0) {
                setValue('remainderDestinationAccountId', filtered[0].id);
              }
            }
          } catch (err) { console.error("Error fetching target accounts:", err); }
        }
      };
      fetchAccounts();
    }
  }, [isOpen, account, token, apiUrl, setValues, setValue]);

  const onFormSubmit = async (formData) => {
    const amount = parseFloat(formData.finalAmount);
    const balance = parseFloat(account.balance);
    const remainder = balance - amount;

    if (remainder > 0 && !formData.remainderDestinationAccountId) {
      throw new Error('Kérlek, válassz egy kasszát a maradvány átutalásához!');
    }

    await onSubmit({
      final_amount: amount, description: formData.description,
      category_id: formData.categoryId ? parseInt(formData.categoryId, 10) : null,
      remainder_destination_account_id: remainder > 0 ? parseInt(formData.remainderDestinationAccountId, 10) : null,
    });
    onClose();
  };

  if (!account) return null;

  const balance = parseFloat(account.balance);
  const amount = parseFloat(values.finalAmount) || 0;
  const difference = balance - amount;

  const categoryOptions = categories
    .filter(cat => !cat.parent_id)
    .map(cat => ({ value: cat.id.toString(), label: cat.name }));

  const accountOptions = availableAccounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.name} (${acc.owner_user?.display_name || 'Közös'})`
  }));

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={`${account.name.replace(/\[Teljesítve\]\s*/, '')} Lezárása`}
      subtitle="Add meg a vásárlás végleges adatait a kassza archiválásához"
      size="medium"
      loading={isSubmitting}
    >
      <ModalSection title="💰 Egyenleg Információ" icon="💰">
        <div style={{
          padding: '1rem', borderRadius: '12px', 
          background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(21,128,61,0.05) 100%)',
          border: '1px solid rgba(34,197,94,0.2)', marginBottom: '1rem'
        }}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <span style={{color: 'var(--text-secondary)', fontSize: '0.9rem'}}>Elérhető egyenleg</span>
            <strong style={{color: 'var(--success)', fontSize: '1.1rem', fontWeight: '700'}}>
              {balance.toLocaleString('hu-HU')} Ft
            </strong>
          </div>
        </div>
      </ModalSection>

      <ModalSection title="🛒 Vásárlás Adatok" icon="🛒">
        <NumberField
          {...getFieldProps('finalAmount')}
          label="Vásárlás Végleges Összege (Ft)"
          min={0.01}
          step={0.01}
          placeholder="Pl. 25000"
          required
        />
        <TextField
          {...getFieldProps('description')}
          label="Leírás"
          placeholder="Pl. Új bicikli"
          required
        />
        <SelectField
          {...getFieldProps('categoryId')}
          label="Kategória (Statisztikai célra)"
          options={[{ value: '', label: 'Nincs kategória' }, ...categoryOptions]}
        />
      </ModalSection>

      {difference > 0 && (
        <ModalSection title="💳 Maradvány Kezelés" icon="💳">
          <div style={{
            padding: '1rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(29,78,216,0.05) 100%)',
            border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem'
          }}>
            <p style={{margin: 0, color: 'var(--text-primary)'}}>
              A vásárlás után <strong style={{color: 'var(--accent-primary)'}}>
              {difference.toLocaleString('hu-HU')} Ft</strong> maradvány keletkezik.
            </p>
          </div>
          <SelectField
            {...getFieldProps('remainderDestinationAccountId')}
            label="Hova utaljuk a maradványt?"
            options={accountOptions}
            required={difference > 0}
          />
        </ModalSection>
      )}

      {difference < 0 && (
        <ModalSection title="⚠️ Többletköltés" icon="⚠️">
          <div style={{
            padding: '1rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(245,158,11,0.1) 0%, rgba(217,119,6,0.05) 100%)',
            border: '1px solid rgba(245,158,11,0.3)', marginBottom: '1rem'
          }}>
            <p style={{margin: 0, color: 'var(--text-primary)'}}>
              A vásárlás <strong style={{color: 'var(--warning)'}}>
              {Math.abs(difference).toLocaleString('hu-HU')} Ft</strong>-tal többe került.
              A rendszer megpróbálja a különbözetet levonni a kassza tulajdonosának
              ({account.owner_user?.display_name || 'Ismeretlen'}) személyes kasszájából.
            </p>
          </div>
        </ModalSection>
      )}

      {apiError && (
        <ModalSection>
          <div style={{
            padding: '1rem', borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(239,68,68,0.1) 0%, rgba(185,28,28,0.05) 100%)',
            border: '1px solid rgba(239,68,68,0.3)', color: 'var(--error)'
          }}>
            {apiError}
          </div>
        </ModalSection>
      )}

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>
          Mégse
        </button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onFormSubmit)}>
          Lezárás és Rögzítés
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default CloseGoalModal;