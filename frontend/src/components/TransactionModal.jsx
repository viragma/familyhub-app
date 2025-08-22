import React, { useState, useEffect } from 'react';

// A kategóriákat most már 'prop'-ként kapja, nem fixen van beégetve
function TransactionModal({ isOpen, onClose, onSave, transactionType, accountName, categories, transactionData = null }) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');

  // Ha a modal bezárul, ürítsük ki a mezőket
useEffect(() => {
    if (isOpen) {
      if (transactionData) {
        setAmount(transactionData.amount);
        setDescription(transactionData.description);
        // A kategóriát is be kell állítani
      } else {
        // Ürítés, ha új tranzakciót hozunk létre
        setAmount('');
        setDescription('');
      }
    }
  }, [isOpen, transactionData]);
  
  const handleSave = () => {
    if (!amount || isNaN(parseFloat(amount))) {
      alert("Kérlek, adj meg egy érvényes összeget!");
      return;
    }
    // A mentéshez az alkategória ID-ját, vagy ha az nincs, a főkategória ID-ját adjuk át
    const category_id = subCategoryId ? parseInt(subCategoryId) : (parentCategoryId ? parseInt(parentCategoryId) : null);
    
    onSave({
      amount: parseFloat(amount),
      description,
      category_id,
      type: transactionType
    });
  };

  if (!isOpen) return null;

  // A kiválasztott főkategória gyerekeinek (alkategóriáinak) megkeresése
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
            {/* Az alkategória menü csak akkor jelenik meg, ha van kiválasztott főkategória és vannak alkategóriák */}
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
        
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button className="btn btn-primary" onClick={handleSave}>Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default TransactionModal;