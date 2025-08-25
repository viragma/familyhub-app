import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const initialState = {
  description: '',
  estimated_amount: '',
  priority: 'közepes',
  category_id: '',
  due_date_option: 'specific_date',
  due_date: new Date().toISOString().split('T')[0],
  is_recurring: false,
  recurring_frequency: 'havi',
};

function ExpectedExpenseModal({ isOpen, onClose, onSave, expenseData }) {
  const [formData, setFormData] = useState(initialState);
  const [categories, setCategories] = useState([]);
  const { token, apiUrl } = useAuth();

  // Kategóriák lekérése a modál számára
  useEffect(() => {
    const fetchCategories = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/categories/tree`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setCategories(await response.json());
        } catch (error) {
          console.error("Hiba a kategóriák lekérésekor a modálban:", error);
        }
      }
    };
    fetchCategories();
  }, [isOpen, token, apiUrl]);

  // Form adatok feltöltése, ha szerkesztésre nyílik meg
  useEffect(() => {
    if (isOpen) {
      if (expenseData) {
        setFormData({
          description: expenseData.description || '',
          estimated_amount: expenseData.estimated_amount || '',
          priority: expenseData.priority || 'közepes',
          category_id: expenseData.category_id || '',
          due_date_option: 'specific_date', // Szerkesztésnél mindig konkrét dátumot mutatunk
          due_date: new Date(expenseData.due_date).toISOString().split('T')[0],
          is_recurring: expenseData.is_recurring || false,
          recurring_frequency: expenseData.recurring_frequency || 'havi',
        });
      } else {
        setFormData(initialState);
      }
    }
  }, [isOpen, expenseData]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSave = () => {
    if (!formData.description || !formData.estimated_amount) {
      alert('A leírás és a becsült összeg megadása kötelező!');
      return;
    }
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">{expenseData ? 'Tervezett Kiadás Szerkesztése' : 'Új Tervezett Kiadás'}</h2>
          <button className="modal-close-btn" onClick={onClose}>&times;</button>
        </div>
        
        <div className="form-group">
          <label className="form-label">Leírás</label>
          <input className="form-input" name="description" value={formData.description} onChange={handleChange} placeholder="Pl. Autó műszaki vizsga" autoFocus/>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label">Becsült összeg (Ft)</label>
            <input className="form-input" type="number" name="estimated_amount" value={formData.estimated_amount} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label">Prioritás</label>
            <select className="form-input" name="priority" value={formData.priority} onChange={handleChange}>
              <option value="magas">Magas</option>
              <option value="közepes">Közepes</option>
              <option value="alacsony">Alacsony</option>
            </select>
          </div>
        </div>
        
        <div className="form-group">
          <label className="form-label">Kategória</label>
          <select className="form-input" name="category_id" value={formData.category_id} onChange={handleChange}>
            <option value="">Nincs kategória</option>
            {categories.map(cat => (
              <optgroup label={cat.name} key={cat.id}>
                <option value={cat.id}>{cat.name} (Főkategória)</option>
                {cat.children.map(child => (
                  <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Esedékesség</label>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <select className="form-input" name="due_date_option" value={formData.due_date_option} onChange={handleChange}>
              <option value="specific_date">Pontos dátum</option>
              <option value="this_month">Ebben a hónapban</option>
              <option value="next_month">Jövő hónapban</option>
            </select>
            {formData.due_date_option === 'specific_date' && (
              <input className="form-input" type="date" name="due_date" value={formData.due_date} onChange={handleChange} />
            )}
          </div>
        </div>

        <div className="form-group">
          <label style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
            <input type="checkbox" name="is_recurring" checked={formData.is_recurring} onChange={handleChange} />
            Legyen ismétlődő? (pl. éves biztosítás)
          </label>
        </div>

        {formData.is_recurring && (
          <div className="form-group">
            <label className="form-label">Ismétlődés Gyakorisága</label>
            <select className="form-input" name="recurring_frequency" value={formData.recurring_frequency} onChange={handleChange}>
              <option value="havi">Havonta</option>
              <option value="negyedéves">Negyedévente</option>
              <option value="féléves">Félévente</option>
              <option value="éves">Évente</option>
            </select>
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

export default ExpectedExpenseModal;