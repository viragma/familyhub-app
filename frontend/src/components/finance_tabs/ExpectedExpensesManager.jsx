import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import ExpectedExpenseCard from './ExpectedExpenseCard';
import ExpectedExpenseModal from './ExpectedExpenseModal'; // MOST MÁR EZT IS IMPORTÁLJUK
import ExpectedExpenseCompleteModal from './ExpectedExpenseCompleteModal'; // ÚJ IMPORT


function ExpectedExpensesManager() {
  const [expenses, setExpenses] = useState([]);
  const [accounts, setAccounts] = useState([]); // Szükségünk lesz a kasszákra a teljesítéshez
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [completingExpense, setCompletingExpense] = useState(null);
  const { token, apiUrl } = useAuth();

 const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Párhuzamosan kérjük le a költségeket és a kasszákat
      const [expensesRes, accountsRes] = await Promise.all([
        fetch(`${apiUrl}/api/expected-expenses`, { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch(`${apiUrl}/api/accounts`, { headers: { 'Authorization': `Bearer ${token}` } })
      ]);

      if (!expensesRes.ok || !accountsRes.ok) {
        throw new Error('Hiba az adatok lekérésekor.');
      }
      setExpenses(await expensesRes.json());
      setAccounts(await accountsRes.json());
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

const handleOpenEditModal = (expense = null) => {
    setEditingExpense(expense);
    setIsEditModalOpen(true);
  };
  
  const handleOpenCompleteModal = (expense) => {
    setCompletingExpense(expense);
    setIsCompleteModalOpen(true);
  };

  const handleCloseModals = () => {
    setIsEditModalOpen(false);
    setIsCompleteModalOpen(false);
    setEditingExpense(null);
    setCompletingExpense(null);
  };

  // ÚJ MENTÉSI LOGIKA
  const handleSave = async (expenseData) => {
    const method = editingExpense ? 'PUT' : 'POST';
    const endpoint = editingExpense
      ? `${apiUrl}/api/expected-expenses/${editingExpense.id}`
      : `${apiUrl}/api/expected-expenses`;

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(expenseData)
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Hiba a mentés során.');
      }
      
      handleCloseModal();
      fetchExpenses(); // Lista frissítése

    } catch (error) {
      console.error("Hiba a mentéskor:", error);
      alert(`Hiba: ${error.message}`);
    }
  };

 // ÚJ TÖRLÉSI FÜGGVÉNY
  const handleDelete = async (expenseId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a tervezett kiadást?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/expected-expenses/${expenseId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Hiba a törlés során.');
      fetchData(); // Lista frissítése
    } catch (error) {
      console.error("Hiba a törléskor:", error);
      alert(`Hiba: ${error.message}`);
    }
  };
  // ÚJ TELJESÍTÉS FÜGGVÉNY
  const handleComplete = async (expenseId, completionData) => {
    try {
      const response = await fetch(`${apiUrl}/api/expected-expenses/${expenseId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(completionData)
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Hiba a teljesítés során.');
      }
      handleCloseModals();
      fetchData(); // Minden adat frissítése
    } catch (error) {
      console.error("Hiba a teljesítéskor:", error);
      alert(`Hiba: ${error.message}`);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2>Tervezett Jövőbeni Kiadások</h2>
        <button className="btn btn-primary" onClick={() => handleOpenEditModal()}>+ Új Tervezett Kiadás</button>
      </div>

      {loading && <p>Várható költségek betöltése...</p>}
      {error && <p style={{ color: 'var(--danger)' }}>{error}</p>}
      
      {!loading && !error && expenses.length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
          <p>Nincsenek tervezett kiadásaid. Adj hozzá egyet a gombbal!</p>
        </div>
      )}

      {!loading && expenses.length > 0 && (
        <div className="expected-expenses-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {expenses.map(expense => (
            <ExpectedExpenseCard 
              key={expense.id}
              expense={expense}
              onEdit={handleOpenEditModal}
              onComplete={handleOpenCompleteModal}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <ExpectedExpenseModal 
        isOpen={isEditModalOpen}
        onClose={handleCloseModals}
        onSave={handleSave}
        expenseData={editingExpense}
      />
      
      <ExpectedExpenseCompleteModal
        isOpen={isCompleteModalOpen}
        onClose={handleCloseModals}
        onComplete={handleComplete}
        expenseData={completingExpense}
        accounts={accounts}
      />
    </div>
  );
}

export default ExpectedExpensesManager;