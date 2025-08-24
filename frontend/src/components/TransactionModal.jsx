import React, { useState, useEffect } from 'react';

function TransactionModal({ isOpen, onClose, onSave, onSaveRecurring, transactionType, accountName, categories, transactionData = null }) {
  const [activeTab, setActiveTab] = useState('single');
  
  // Külön állapotok a két fülnek a tiszta logika érdekében
  const [singleData, setSingleData] = useState({
    amount: '', description: '', parentCategoryId: '', subCategoryId: ''
  });
  
  const [recurringData, setRecurringData] = useState({
    amount: '', description: '', parentCategoryId: '', subCategoryId: '',
    frequency: 'havi', dayOfMonth: new Date().getDate(), startDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab('single');
      
      const categoryId = transactionData?.category?.id;
      const parentCategory = categories.find(c => c.children.some(child => child.id === categoryId));

      // Szerkesztéskor csak az "Egyszeri" fület töltjük fel adatokkal
      setSingleData({
        amount: transactionData?.amount || '',
        description: transactionData?.description || '',
        parentCategoryId: parentCategory?.id.toString() || categoryId?.toString() || '',
        subCategoryId: parentCategory ? categoryId.toString() : ''
      });
      // Az ismétlődő fület mindig alaphelyzetbe állítjuk
      setRecurringData({
        amount: '', description: '', parentCategoryId: '', subCategoryId: '',
        frequency: 'havi', dayOfMonth: new Date().getDate(), startDate: new Date().toISOString().split('T')[0]
      });
    }
  }, [isOpen, transactionData, categories]);

  const handleSingleChange = (e) => setSingleData({...singleData, [e.target.name]: e.target.value });
  const handleRecurringChange = (e) => setRecurringData({...recurringData, [e.target.name]: e.target.value });

  const handleSave = () => {
    if (activeTab === 'single') {
      if (!singleData.amount || isNaN(parseFloat(singleData.amount))) { alert("Kérlek, adj meg egy érvényes összeget!"); return; }
      const category_id = singleData.subCategoryId ? parseInt(singleData.subCategoryId) : (singleData.parentCategoryId ? parseInt(singleData.parentCategoryId) : null);
      onSave({ description: singleData.description, amount: parseFloat(singleData.amount), type: transactionType, category_id });
    } else {
      if (!recurringData.amount || isNaN(parseFloat(recurringData.amount))) { alert("Kérlek, adj meg egy érvényes összeget!"); return; }
      const category_id = recurringData.subCategoryId ? parseInt(recurringData.subCategoryId) : (recurringData.parentCategoryId ? parseInt(recurringData.parentCategoryId) : null);
      onSaveRecurring({
        description: recurringData.description, amount: parseFloat(recurringData.amount),
        type: transactionType, category_id, frequency: recurringData.frequency,
        day_of_month: parseInt(recurringData.dayOfMonth), start_date: recurringData.startDate
      });
    }
  };

  if (!isOpen) return null;

  const singleSubCategories = categories.find(cat => cat.id === parseInt(singleData.parentCategoryId))?.children || [];
  const recurringSubCategories = categories.find(cat => cat.id === parseInt(recurringData.parentCategoryId))?.children || [];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{transactionType === 'bevétel' ? 'Bevétel' : 'Kiadás'} rögzítése</h2>
          <p className="auth-subtitle" style={{margin: 0}}>{accountName}</p>
        </div>
        
        {/* Szerkesztésnél egyelőre nem engedjük a füleket a bonyolultság elkerülése érdekében */}
        {!transactionData && (
          <div className="modal-tabs">
            <button className={`modal-tab ${activeTab === 'single' ? 'active' : ''}`} onClick={() => setActiveTab('single')}>Egyszeri Tétel</button>
            <button className={`modal-tab ${activeTab === 'recurring' ? 'active' : ''}`} onClick={() => setActiveTab('recurring')}>Rendszeres</button>
          </div>
        )}

        {/* Egyszeri Tétel Fül */}
        <div className={`tab-content ${activeTab === 'single' ? 'active' : ''}`}>
          <div className="form-group"><label className="form-label">Összeg (Ft)</label><input className="form-input" type="number" inputMode="decimal" name="amount" value={singleData.amount} onChange={handleSingleChange} autoFocus /></div>
          <div className="form-group"><label className="form-label">Leírás</label><input className="form-input" type="text" name="description" value={singleData.description} onChange={handleSingleChange} placeholder="Pl. Heti bevásárlás"/></div>
          {transactionType === 'kiadás' && (
            <><div className="form-group"><label className="form-label">Főkategória</label><select className="form-input" name="parentCategoryId" value={singleData.parentCategoryId} onChange={handleSingleChange}><option value="">Válassz...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            {singleData.parentCategoryId && singleSubCategories.length > 0 && <div className="form-group"><label className="form-label">Alkategória</label><select className="form-input" name="subCategoryId" value={singleData.subCategoryId} onChange={handleSingleChange}><option value="">Válassz...</option>{singleSubCategories.map(subCat => <option key={subCat.id} value={subCat.id}>{subCat.name}</option>)}</select></div>}</>
          )}
        </div>

        {/* Ismétlődő Fül */}
        <div className={`tab-content ${activeTab === 'recurring' ? 'active' : ''}`}>
          <div className="form-group"><label className="form-label">Összeg (Ft)</label><input className="form-input" type="number" inputMode="decimal" name="amount" value={recurringData.amount} onChange={handleRecurringChange} /></div>
          <div className="form-group"><label className="form-label">Leírás (minden hónapban ez lesz)</label><input className="form-input" type="text" name="description" value={recurringData.description} onChange={handleRecurringChange} placeholder="Pl. Netflix előfizetés"/></div>
          {transactionType === 'kiadás' && (
            <><div className="form-group"><label className="form-label">Főkategória</label><select className="form-input" name="parentCategoryId" value={recurringData.parentCategoryId} onChange={handleRecurringChange}><option value="">Válassz...</option>{categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}</select></div>
            {recurringData.parentCategoryId && recurringSubCategories.length > 0 && <div className="form-group"><label className="form-label">Alkategória</label><select className="form-input" name="subCategoryId" value={recurringData.subCategoryId} onChange={handleRecurringChange}><option value="">Válassz...</option>{recurringSubCategories.map(subCat => <option key={subCat.id} value={subCat.id}>{subCat.name}</option>)}</select></div>}</>
          )}
             <div className="form-group">
            <label className="form-label">Gyakoriság</label>
            <select className="form-input" name="frequency" value={recurringData.frequency} onChange={handleRecurringChange}>
              <option value="napi">Naponta</option>
              <option value="heti">Hetente</option>
              <option value="havi">Havonta</option>
              <option value="éves">Évente</option>
            </select>
          </div>

 {/* Dinamikusan megjelenő mezők */}
          {recurringData.frequency === 'heti' && (
            <div className="form-group">
              <label className="form-label">A hét napja:</label>
              <select className="form-input" name="dayOfWeek" value={recurringData.dayOfWeek} onChange={handleRecurringChange}>
                <option value="1">Hétfő</option>
                <option value="2">Kedd</option>
                <option value="3">Szerda</option>
                <option value="4">Csütörtök</option>
                <option value="5">Péntek</option>
                <option value="6">Szombat</option>
                <option value="7">Vasárnap</option>
              </select>
            </div>
          )}

          {recurringData.frequency === 'havi' && (
            <div className="form-group">
              <label className="form-label">A hónap napja:</label>
              <input className="form-input" type="number" name="dayOfMonth" value={recurringData.dayOfMonth} onChange={handleRecurringChange} min="1" max="31" />
            </div>
          )}


         <div className="form-group"><label className="form-label">Első végrehajtás dátuma:</label><input className="form-input" type="date" name="startDate" value={recurringData.startDate} onChange={handleRecurringChange} min={new Date().toISOString().split('T')[0]} /></div>
        </div>
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;