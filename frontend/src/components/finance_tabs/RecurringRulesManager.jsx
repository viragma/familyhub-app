import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import RecurringRuleModal from '../RecurringRuleModal';

function RecurringRulesManager() {
  const [rules, setRules] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); // State a nyitott menü követéséhez
  const { user, token, apiUrl } = useAuth();

  const fetchRules = useCallback(async () => {
    if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/recurring-rules`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setRules(await response.json());
    } catch (error) {
      console.error("Hiba az ismétlődő szabályok lekérésekor:", error);
    }
  }, [token, apiUrl]);

  useEffect(() => {
    fetchRules();
  }, [fetchRules]);

  // Effekt, ami bezárja a menüt, ha a felhasználó máshova kattint
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleToggleActive = async (ruleId) => {
    try {
        await fetch(`${apiUrl}/api/recurring-rules/${ruleId}/toggle-active`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        fetchRules();
    } catch (error) {
        console.error("Hiba a szabály állapotának váltásakor:", error);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!window.confirm("Biztosan törölni szeretnéd ezt a szabályt?")) return;
    try {
      const response = await fetch(`${apiUrl}/api/recurring-rules/${ruleId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchRules();
      } else {
        alert("Hiba a törlés során!");
      }
    } catch (error) {
      console.error("Hiba a szabály törlésekor:", error);
    }
  };
  
  const handleEdit = (rule) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const groupedRules = useMemo(() => {
    return rules.reduce((acc, rule) => {
        const type = rule.type;
        if(!acc[type]) acc[type] = [];
        acc[type].push(rule);
        return acc;
    }, {});
  }, [rules]);

  const groupTitles = {
      'bevétel': 'Rendszeres Bevételek',
      'kiadás': 'Rendszeres Kiadások',
      'átutalás': 'Rendszeres Átutalások'
  };
// === ÚJ, VÉGLEGES MENTÉSI FÜGGVÉNY ===
  const handleSaveRule = async (ruleData) => {
    if (!editingRule) return; // Csak szerkesztést kezelünk most

    // A backend a teljes szabály objektumot várja, kiegészítve a hiányzó részekkel
    const dataToSend = {
      ...editingRule, // A régi adatok
      ...ruleData,    // A formból érkező új adatok
      day_of_month: parseInt(ruleData.dayOfMonth || editingRule.day_of_month),
      // A többi mezőt is hasonlóan kellene kezelni
    };

    try {
      const response = await fetch(`${apiUrl}/api/recurring-rules/${editingRule.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(dataToSend)
      });

      if(response.ok) {
        setIsModalOpen(false);
        setEditingRule(null);
        fetchRules(); // Frissítjük a listát
      } else {
        alert("Hiba a szabály mentése során!");
      }
    } catch (error) {
      console.error("Hiba a szabály frissítésekor:", error);
    }
  };
  return (
    <div>
      <div className="page-header">
        <h2>Beállított Rendszeres Tételek</h2>
      </div>
      
      <div className="rules-container">
        {Object.keys(groupTitles).map(groupKey => (
            groupedRules[groupKey] && groupedRules[groupKey].length > 0 && (
            <div className={`rule-group-card ${groupKey}`} key={groupKey}>
                <h3 className="rule-group-header">{groupTitles[groupKey]}</h3>
                <div>
                    {groupedRules[groupKey].map(rule => (
                        <div className="rule-list-item" key={rule.id}>
                            <div className="rule-main-info">
                                <span className="rule-description">{rule.description || 'Nincs leírás'}</span>
                                <span className="rule-amount" style={{color: rule.type === 'bevétel' ? 'var(--success)' : 'var(--text-primary)'}}>
                                    {rule.type === 'bevétel' ? '+' : ''}{rule.type === 'kiadás' ? '-' : ''}{parseFloat(rule.amount).toLocaleString('hu-HU')} Ft
                                </span>
                            </div>
                            <div className="rule-footer">
                                <div className="rule-meta">
                                    Következő: {new Date(rule.next_run_date).toLocaleDateString('hu-HU')}
                                </div>
                                <div className="rule-actions">
                                    <label className="switch" title={rule.is_active ? "Szüneteltetés" : "Aktiválás"}>
                                        <input type="checkbox" checked={rule.is_active} onChange={() => handleToggleActive(rule.id)} />
                                        <span className="slider"></span>
                                    </label>
                                    <div className="actions-menu-container">
                                        <button 
                                            className="action-btn-icon" 
                                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === rule.id ? null : rule.id); }}
                                        >
                                            ⋮
                                        </button>
                                        {openMenuId === rule.id && (
                                            <div className="actions-menu">
                                                <button className="menu-item" onClick={() => handleEdit(rule)}>✏️ Szerkesztés</button>
                                                <button className="menu-item delete" onClick={() => handleDelete(rule.id)}>🗑️ Törlés</button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            )
        ))}
      </div>
      
      {rules.length === 0 && <p style={{textAlign: 'center', marginTop: '2rem'}}>Nincsenek beállított rendszeres tételek.</p>}

       <RecurringRuleModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveRule} // A mentés gomb most már ezt a függvényt hívja
        ruleData={editingRule}
      />
    </div>
  );
}

export default RecurringRulesManager;