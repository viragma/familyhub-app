import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './CloseGoalModal.css'; // Használjuk a korábban létrehozott, szép stíluslapot

function CloseGoalModal({ isOpen, onClose, onSubmit, account, categories, error: apiError }) {
  const [finalAmount, setFinalAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [remainderDestinationAccountId, setRemainderDestinationAccountId] = useState('');
  const [availableAccounts, setAvailableAccounts] = useState([]);
  const [error, setError] = useState('');
  const { user, token, apiUrl } = useAuth();

  // Amikor a modal megnyílik, feltöltjük az alapértelmezett adatokkal
  useEffect(() => {
    if (account && isOpen) {
      // Alapértelmezetten a teljes egyenleget ajánljuk fel vásárlásnak
      setFinalAmount(account.balance ? parseFloat(account.balance).toString() : '0');
      setDescription(`Vásárlás: ${account.name.replace(/\[Teljesítve\]\s*/, '')}`);
      setError('');
      setCategoryId('');
      setRemainderDestinationAccountId('');

      // Célkasszák lekérdezése a maradvány átutaláshoz
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
                setRemainderDestinationAccountId(filtered[0].id);
              }
            }
          } catch (err) {
            console.error("Hiba a célkasszák lekérésekor:", err);
          }
        }
      };
      fetchAccounts();
    }
  }, [isOpen, account, token, apiUrl]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const amount = parseFloat(finalAmount);
    const balance = parseFloat(account.balance);

    if (!finalAmount || isNaN(amount) || amount <= 0) {
      setError('Kérlek, adj meg egy érvényes, nullánál nagyobb összeget!');
      return;
    }
    
    const remainder = balance - amount;
    if (remainder > 0 && !remainderDestinationAccountId) {
        setError('Kérlek, válassz egy kasszát a maradvány átutalásához!');
        return;
    }

    setError('');

    // Adatok összekészítése a backend számára
    onSubmit({
      final_amount: amount,
      description: description,
      category_id: categoryId ? parseInt(categoryId, 10) : null,
      remainder_destination_account_id: remainder > 0 ? parseInt(remainderDestinationAccountId, 10) : null,
    });
  };

  if (!isOpen || !account) return null;

  const balance = parseFloat(account.balance);
  const amount = parseFloat(finalAmount) || 0;
  const difference = balance - amount;

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
          <strong>{balance.toLocaleString('hu-HU')} Ft</strong>
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

          {/* Dinamikus szekció a maradvány vagy túlköltekezés kezelésére */}
          {difference > 0 && (
            <div className="remainder-section">
              <p>A vásárlás után <strong>{difference.toLocaleString('hu-HU')} Ft</strong> maradvány keletkezik.</p>
              <div className="form-group">
                  <label className="form-label" htmlFor="remainder-destination">Hova utaljuk a maradványt?</label>
                  <select
                      id="remainder-destination"
                      className="form-input"
                      value={remainderDestinationAccountId}
                      onChange={(e) => setRemainderDestinationAccountId(e.target.value)}
                      required
                  >
                      {availableAccounts.length === 0 ? (
                          <option disabled>Nincs elérhető célkassza...</option>
                      ) : (
                          availableAccounts.map(acc => (
                              <option key={acc.id} value={acc.id}>{acc.name} ({acc.owner_user?.display_name || 'Közös'})</option>
                          ))
                      )}
                  </select>
              </div>
            </div>
          )}

          {difference < 0 && (
            <div className="remainder-section" style={{borderColor: 'var(--warning)'}}>
                 <p>A vásárlás <strong>{Math.abs(difference).toLocaleString('hu-HU')} Ft</strong>-tal többe került. A rendszer megpróbálja a különbözetet levonni a kassza tulajdonosának ({account.owner_user?.display_name || 'Ismeretlen'}) személyes kasszájából.</p>
            </div>
          )}
          
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