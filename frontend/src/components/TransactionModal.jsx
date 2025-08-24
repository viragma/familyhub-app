import React, { useState, useEffect } from 'react';

function TransactionModal({ isOpen, onClose, onSave, onSaveRecurring, transactionType, accountName, categories, transactionData = null }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  
  const [isRecurring, setIsRecurring] = useState(false);
  const [frequency, setFrequency] = useState('havi');
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (isOpen) {
      if (transactionData) {
        // Edit mode: populate form
        setAmount(transactionData.amount);
        setDescription(transactionData.description);
        if (transactionData.category) {
          if (transactionData.category.parent_id) {
            setParentCategoryId(transactionData.category.parent_id);
            setSubCategoryId(transactionData.category.id);
          } else {
            setParentCategoryId(transactionData.category.id);
            setSubCategoryId('');
          }
        }
      } else {
        // Create mode: reset form
        setAmount('');
        setDescription('');
        setParentCategoryId('');
        setSubCategoryId('');
        setIsRecurring(false);
        setFrequency('havi');
        setDayOfMonth(1);
        setStartDate(new Date().toISOString().split('T')[0]);
      }
    }
  }, [isOpen, transactionData]);
  
  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      alert("Kérlek, adj meg egy érvényes összeget!");
      return;
    }

    const category_id = subCategoryId ? parseInt(subCategoryId) : (parentCategoryId ? parseInt(parentCategoryId) : null);
    
    if (isRecurring) {
      onSaveRecurring({
        description,
        amount: parseFloat(amount),
        type: transactionType,
        category_id,
        frequency,
        day_of_month: dayOfMonth,
        start_date: startDate
      });
    } else {
      onSave({
        description,
        amount: parseFloat(amount),
        type: transactionType,
        category_id,
      });
    }
  };

  if (!isOpen) return null;

  const subCategories = categories.find(cat => cat.id === parseInt(parentCategoryId))?.children || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{transactionType === 'bevétel' ? 'Bevétel' : 'Kiadás'} rögzítése</h2>
          <p className="auth-subtitle" style={{margin: 0}}>{accountName}</p>
        </div>
        
        <div className="form-group">
          <label className="form-label">Összeg (Ft)</label>
          <input className="form-input" type="number" value={amount} onChange={e => setAmount(e.target.value)} autoFocus />
        </div>
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <input className="form-input" type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="Pl. Havi bevásárlás" />
        </div>
        {transactionType === 'kiadás' && (
          <>
            <div className="form-group">
              <label className="form-label">Főkategória</label>
              <select className="form-input" value={parentCategoryId} onChange={e => { setParentCategoryId(e.target.value); setSubCategoryId(''); }}>
                <option value="">Válassz...</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            {parentCategoryId && subCategories.length > 0 && (
              <div className="form-group">
                <label className="form-label">Alkategória</label>
                <select className="form-input" value={subCategoryId} onChange={e => setSubCategoryId(e.target.value)}>
                  <option value="">Válassz...</option>
                  {subCategories.map(subCat => <option key={subCat.id} value={subCat.id}>{subCat.name}</option>)}
                </select>
              </div>
            )}
          </>
        )}

        <hr style={{margin: '1.5rem 0', border: 'none', borderTop: '1px solid var(--border)'}} />

        <div className="form-group">
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 'bold'}}>
            <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
            Ismétlődő tranzakció beállítása
          </label>
        </div>

        {isRecurring && (
          <div style={{paddingLeft: '1rem', borderLeft: '3px solid var(--accent-primary)'}}>
            <div className="form-group">
              <label className="form-label">Gyakoriság</label>
              <select className="form-input" value={frequency} onChange={e => setFrequency(e.target.value)}>
                <option value="havi">Minden hónap</option>
                <option value="heti" disabled>Minden hét (hamarosan)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">A hónap ezen napján:</label>
              <input className="form-input" type="number" value={dayOfMonth} onChange={e => setDayOfMonth(parseInt(e.target.value))} min="1" max="31" />
            </div>
             <div className="form-group">
              <label className="form-label">Első végrehajtás dátuma:</label>
              <input className="form-input" type="date" value={startDate} onChange={e => setStartDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
            </div>
          </div>
        )}
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;