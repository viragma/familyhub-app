import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { CheckCircle, ArrowRight } from 'lucide-react';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { SelectField } from '../universal/FormField';

const AssignGoalModal = ({ isOpen, onClose, wish, onAssignmentSuccess }) => {
  const { token, apiUrl } = useAuth();
  const [goalAccounts, setGoalAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsSuccess(false);
      setIsLoading(true);
      setSelectedAccountId('');
      const fetchGoalAccounts = async () => {
        try {
          const response = await fetch(`${apiUrl}/api/accounts?type=cél`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setGoalAccounts(await response.json());
          } else {
            console.error("Error fetching goal accounts:", response.status);
          }
        } catch (error) {
          console.error("Error fetching goal accounts:", error);
        }
        setIsLoading(false);
      };
      fetchGoalAccounts();
    }
  }, [isOpen, apiUrl, token]);

  const handleSubmit = async () => {
    if (!selectedAccountId) {
      alert('Kérlek válassz egy célkasszát!');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/wishes/${wish.id}/activate`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_account_id: parseInt(selectedAccountId) }),
      });

      if (response.ok) {
        setIsSuccess(true);
        setTimeout(() => {
          onAssignmentSuccess();
          onClose();
        }, 1500);
      } else {
        const err = await response.json();
        alert(`Hiba a hozzárendelés során: ${err.detail}`);
      }
    } catch (error) {
      console.error("Error activating wish:", error);
      alert("Hálózati hiba történt.");
    } finally {
      setIsLoading(false);
    }
  };

  const accountOptions = goalAccounts.map(acc => ({
    value: acc.id.toString(),
    label: `${acc.name} (${parseFloat(acc.balance || 0).toLocaleString('hu-HU')} Ft)`
  }));

  if (!wish) return null;

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title="Kívánság Aktiválása"
      subtitle="Válassz egy célkasszát a kívánság gyűjtéséhez"
      size="medium"
      loading={isLoading}
    >
      {isSuccess ? (
        <ModalSection title="✅ Sikeres Aktiválás" icon="✅">
          <div style={{
            textAlign: 'center', padding: '2rem',
            background: 'linear-gradient(135deg, rgba(34,197,94,0.1) 0%, rgba(21,128,61,0.05) 100%)',
            borderRadius: '12px', border: '1px solid rgba(34,197,94,0.2)'
          }}>
            <CheckCircle size={48} color="var(--success)" style={{marginBottom: '1rem'}} />
            <h3 style={{color: 'var(--success)', marginBottom: '0.5rem'}}>Sikeresen aktiválva!</h3>
            <p style={{color: 'var(--text-secondary)', margin: 0}}>
              A kívánság mostantól aktív és elkezdődött a gyűjtés.
            </p>
          </div>
        </ModalSection>
      ) : (
        <>
          <ModalSection title="🎯 Kívánság Adatok" icon="🎯">
            <div style={{
              padding: '1rem', borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(29,78,216,0.05) 100%)',
              border: '1px solid rgba(59,130,246,0.2)', marginBottom: '1rem'
            }}>
              <h4 style={{margin: '0 0 0.5rem 0', color: 'var(--accent-primary)'}}>{wish.name}</h4>
              {wish.estimated_price && (
                <p style={{margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: '600'}}>
                  Becsült ár: {parseFloat(wish.estimated_price).toLocaleString('hu-HU')} Ft
                </p>
              )}
              {wish.description && (
                <p style={{margin: 0, color: 'var(--text-secondary)'}}>{wish.description}</p>
              )}
            </div>
          </ModalSection>

          <ModalSection title="🎯 Célkassza Kiválasztása" icon="🎯">
            <SelectField
              label="Célkassza"
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              options={[
                { value: '', label: goalAccounts.length === 0 ? 'Töltés...' : 'Válassz célkasszát...' },
                ...accountOptions
              ]}
              required
              disabled={goalAccounts.length === 0}
            />
            {goalAccounts.length === 0 && !isLoading && (
              <p style={{fontSize: '0.9rem', color: 'var(--warning)', marginTop: '0.5rem'}}>
                Nincs elérhető célkassza. Kérlek, hozz létre egyet a Kasszák menüpontban.
              </p>
            )}
          </ModalSection>
        </>
      )}

      {!isSuccess && (
        <ModalActions align="space-between">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={handleSubmit}
            disabled={!selectedAccountId || goalAccounts.length === 0}
          >
            <ArrowRight size={16} /> Aktiválás
          </button>
        </ModalActions>
      )}
    </UniversalModal>
  );
};

export default AssignGoalModal;