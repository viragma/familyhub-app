import React, { useState, useEffect } from 'react';
import UniversalModal, { ModalSection, ModalActions } from './universal/UniversalModal';
import FormField, { NumberField, TextField, SelectField, DateField } from './universal/FormField';
import { useFormValidation, createSchema, validationRules } from './universal/ValidationEngine';

// Validation schema for transactions
const transactionSchema = createSchema()
  .field('amount',
    validationRules.required,
    validationRules.number,
    validationRules.min(0.01, 'Amount must be greater than 0')
  )
  .field('description',
    validationRules.required,
    validationRules.minLength(2, 'Description must be at least 2 characters')
  )
  .field('parentCategoryId',
    (value, allValues) => {
      if (allValues.transactionType === 'kiadás' && !value) {
        return 'Category is required for expenses';
      }
      return null;
    }
  )
  .field('frequency',
    (value, allValues) => {
      if (allValues.isRecurring && !value) {
        return 'Frequency is required for recurring transactions';
      }
      return null;
    }
  )
  .field('dayOfMonth',
    (value, allValues) => {
      if (allValues.isRecurring && allValues.frequency === 'havi') {
        if (!value || value < 1 || value > 31) {
          return 'Day of month must be between 1 and 31';
        }
      }
      return null;
    }
  )
  .field('dayOfWeek',
    (value, allValues) => {
      if (allValues.isRecurring && allValues.frequency === 'heti' && !value) {
        return 'Day of week is required for weekly transactions';
      }
      return null;
    }
  )
  .field('startDate',
    (value, allValues) => {
      if (allValues.isRecurring && !value) {
        return 'Start date is required for recurring transactions';
      }
      return null;
    }
  );

function TransactionModal({ 
  isOpen, 
  onClose, 
  onSave, 
  onSaveRecurring, 
  transactionType, 
  accountName, 
  categories = [], 
  transactionData = null 
}) {
  const [activeTab, setActiveTab] = useState('single');
  const isEdit = !!transactionData;

  // Initialize form validation
  const {
    values,
    errors,
    isSubmitting,
    getFieldProps,
    handleSubmit,
    reset,
    setValues,
    setValue
  } = useFormValidation({
    amount: '',
    description: '',
    parentCategoryId: '',
    subCategoryId: '',
    frequency: 'havi',
    dayOfMonth: new Date().getDate(),
    dayOfWeek: '1',
    startDate: new Date().toISOString().split('T')[0],
    transactionType,
    isRecurring: false
  }, transactionSchema);

  // Initialize form when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab('single');
      
      if (transactionData) {
        // Editing existing transaction
        const categoryId = transactionData?.category?.id;
        const parentCategory = categories.find(c => 
          c.children?.some(child => child.id === categoryId)
        );

        // Use individual setValue calls to avoid dependency issues
        setValue('amount', transactionData.amount?.toString() || '');
        setValue('description', transactionData.description || '');
        setValue('parentCategoryId', parentCategory?.id?.toString() || categoryId?.toString() || '');
        setValue('subCategoryId', parentCategory ? categoryId?.toString() : '');
        setValue('frequency', 'havi');
        setValue('dayOfMonth', new Date().getDate());
        setValue('dayOfWeek', '1');
        setValue('startDate', new Date().toISOString().split('T')[0]);
        setValue('transactionType', transactionType);
        setValue('isRecurring', false);
      } else {
        // New transaction - reset to defaults
        setValue('amount', '');
        setValue('description', '');
        setValue('parentCategoryId', '');
        setValue('subCategoryId', '');
        setValue('frequency', 'havi');
        setValue('dayOfMonth', new Date().getDate());
        setValue('dayOfWeek', '1');
        setValue('startDate', new Date().toISOString().split('T')[0]);
        setValue('transactionType', transactionType);
        setValue('isRecurring', false);
      }
    }
  }, [isOpen, transactionData?.id, transactionType]); // Only depend on stable values

  // Handle tab change
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setValue('isRecurring', tab === 'recurring');
  };

  // Handle parent category change
  const handleParentCategoryChange = (parentCategoryId) => {
    setValue('parentCategoryId', parentCategoryId);
    setValue('subCategoryId', ''); // Reset subcategory when parent changes
  };

  // Handle form submission
  const onSubmit = async (formData) => {
    try {
      const categoryId = formData.subCategoryId 
        ? parseInt(formData.subCategoryId) 
        : (formData.parentCategoryId ? parseInt(formData.parentCategoryId) : null);

      const baseData = {
        description: formData.description,
        amount: parseFloat(formData.amount),
        type: transactionType,
        category_id: categoryId
      };

      if (formData.isRecurring) {
        const recurringData = {
          ...baseData,
          frequency: formData.frequency,
          start_date: formData.startDate
        };

        if (formData.frequency === 'havi') {
          recurringData.day_of_month = parseInt(formData.dayOfMonth);
        } else if (formData.frequency === 'heti') {
          recurringData.day_of_week = parseInt(formData.dayOfWeek);
        }

        await onSaveRecurring(recurringData);
      } else {
        await onSave(baseData);
      }
      
      onClose();
    } catch (error) {
      console.error('Error saving transaction:', error);
    }
  };

  // Get options for dropdowns
  const parentCategoryOptions = categories.map(cat => ({
    value: cat.id.toString(),
    label: cat.name
  }));

  const subCategoryOptions = values.parentCategoryId 
    ? (categories.find(cat => cat.id === parseInt(values.parentCategoryId))?.children || [])
        .map(subCat => ({
          value: subCat.id.toString(),
          label: subCat.name
        }))
    : [];

  const frequencyOptions = [
    { value: 'napi', label: 'Naponta' },
    { value: 'heti', label: 'Hetente' },
    { value: 'havi', label: 'Havonta' },
    { value: 'éves', label: 'Évente' }
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
      title={`${transactionType === 'bevétel' ? 'Bevétel' : 'Kiadás'} rögzítése`}
      subtitle={accountName}
      size="medium"
      priority="elevated"
      loading={isSubmitting}
      disabled={isSubmitting}
    >
      {/* Tab Navigation for new transactions only */}
      {!isEdit && (
        <ModalSection title="📊 Tranzakció Típusa" icon="📊" collapsible={false}>
          <div className="modal-tabs" style={{ 
            display: 'flex', 
            gap: '0.5rem',
            marginBottom: '1rem'
          }}>
            <button 
              type="button"
              className={`modal-tab ${activeTab === 'single' ? 'active' : ''}`}
              onClick={() => handleTabChange('single')}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: activeTab === 'single' ? '2px solid var(--accent-primary, #6366f1)' : '2px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                background: activeTab === 'single' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: activeTab === 'single' ? 'var(--accent-primary, #6366f1)' : 'var(--text-secondary, #64748b)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              💰 Egyszeri Tétel
            </button>
            <button 
              type="button"
              className={`modal-tab ${activeTab === 'recurring' ? 'active' : ''}`}
              onClick={() => handleTabChange('recurring')}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                border: activeTab === 'recurring' ? '2px solid var(--accent-primary, #6366f1)' : '2px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '12px',
                background: activeTab === 'recurring' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                color: activeTab === 'recurring' ? 'var(--accent-primary, #6366f1)' : 'var(--text-secondary, #64748b)',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              🔄 Rendszeres
            </button>
          </div>
        </ModalSection>
      )}

      {/* Basic Transaction Data */}
      <ModalSection 
        title="💰 Tranzakció Adatok" 
        icon="💰"
        collapsible={false}
      >
        <NumberField
          {...getFieldProps('amount')}
          label="Összeg (Ft)"
          placeholder="0"
          icon="💵"
          min={0.01}
          step={0.01}
          autoFocus
          required
        />
        
        <TextField
          {...getFieldProps('description')}
          label="Leírás"
          placeholder={values.isRecurring ? "Pl. Netflix előfizetés" : "Pl. Heti bevásárlás"}
          subtitle={values.isRecurring ? "Ez fog megjelenni minden alkalommal" : "Rövid leírás a tranzakcióról"}
          icon="📝"
          maxLength={100}
          required
        />
      </ModalSection>

      {/* Category Selection for Expenses */}
      {transactionType === 'kiadás' && (
        <ModalSection 
          title="🏷️ Kategorizálás" 
          icon="🏷️"
          collapsible={false}
        >
          <SelectField
            {...getFieldProps('parentCategoryId')}
            label="Főkategória"
            placeholder="Válassz kategóriát..."
            options={parentCategoryOptions}
            onChange={handleParentCategoryChange}
            icon="📁"
            required
          />
          
          {values.parentCategoryId && subCategoryOptions.length > 0 && (
            <SelectField
              {...getFieldProps('subCategoryId')}
              label="Alkategória"
              placeholder="Válassz alkategóriát..."
              options={subCategoryOptions}
              icon="📂"
            />
          )}
        </ModalSection>
      )}

      {/* Recurring Transaction Settings */}
      {values.isRecurring && (
        <ModalSection 
          title="⏰ Ismétlődési Beállítások" 
          icon="⏰"
          collapsible={false}
        >
          <SelectField
            {...getFieldProps('frequency')}
            label="Gyakoriság"
            options={frequencyOptions}
            icon="🔄"
            required
          />
          
          {values.frequency === 'heti' && (
            <SelectField
              {...getFieldProps('dayOfWeek')}
              label="A hét napja"
              options={dayOfWeekOptions}
              icon="📅"
              required
            />
          )}
          
          {values.frequency === 'havi' && (
            <NumberField
              {...getFieldProps('dayOfMonth')}
              label="A hónap napja"
              min={1}
              max={31}
              icon="📅"
              required
            />
          )}
          
          <DateField
            {...getFieldProps('startDate')}
            label="Első végrehajtás dátuma"
            min={new Date().toISOString().split('T')[0]}
            icon="🗓️"
            required
          />
        </ModalSection>
      )}

      <ModalActions align="space-between">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onClose}
          disabled={isSubmitting}
        >
          Mégse
        </button>
        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Mentés...' : (values.isRecurring ? 'Szabály létrehozása' : 'Tranzakció rögzítése')}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default TransactionModal;