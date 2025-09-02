import React, { useState, useEffect } from 'react';
import './CloseGoalModal.css'; // Az új, dedikált CSS fájl importálása

const CloseGoalModal = ({ isOpen, onClose, onSubmit, account, categories, error: apiError }) => {
  const [finalAmount, setFinalAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (account && isOpen) {
      setFinalAmount(account.balance ? account.balance.toString() : '0');
      setDescription(`Vásárlás: ${account.name.replace(/\[Teljesítve\]\s*/, '')}`);
      setError('');
      setCategoryId('');
    }
  }, [isOpen, account]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(finalAmount);

    if (!finalAmount || isNaN(amount) || amount <= 0) {
      setError('Kérlek, adj meg egy érvényes, nullánál nagyobb összeget!');
      return;
    }
    if (account && amount > account.balance) {
      setError('Az összeg nem lehet nagyobb, mint a kassza egyenlege!');
      return;
    }
    setError('');

    onSubmit({
      final_amount: amount,
      category_id: categoryId ? parseInt(categoryId) : null,
      description: description,
    });
  };

  if (!isOpen || !account) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content close-goal-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{account.name.replace(/\[Teljesítve\]\s*/, '')} Lezárása</h2>
          <p className="modal-subtitle">
            Add meg a vásárlás végleges adatait a kassza archiválásához.
          </p>
        </div>
        
        <div className="current-balance-info">
          <span>Elérhető egyenleg</span>
          <strong>{parseFloat(account.balance).toLocaleString('hu-HU')} Ft</strong>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="finalAmount">Vásárlás Végleges Összege</label>
            <input
              id="finalAmount"
              className="form-input"
              type="number"
              value={finalAmount}
              onChange={(e) => setFinalAmount(e.target.value)}
              placeholder="Pl. 25000"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="description">Leírás</label>
            <input
              id="description"
              className="form-input"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Pl. Új bicikli"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="category">Kategória (Statisztikai célra)</label>
            <select
              id="category"
              className="form-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Nincs kategória</option>
              {categories
                .filter(cat => !cat.parent_id) 
                .map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
            </select>
          </div>
          
          {(error || apiError) && <p className="modal-error-message">{error || apiError}</p>}

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn btn-secondary">Mégse</button>
            <button type="submit" className="btn btn-primary">Lezárás és Rögzítés</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CloseGoalModal;