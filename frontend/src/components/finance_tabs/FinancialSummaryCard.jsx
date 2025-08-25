import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

function FinancialSummaryCard() {
  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { token, apiUrl } = useAuth();

  useEffect(() => {
    const fetchSummary = async () => {
      if (!token) return;
      try {
        const response = await fetch(`${apiUrl}/api/dashboard`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setSummaryData(data.financial_summary);
        }
      } catch (error) {
        console.error("Hiba a pénzügyi összegzés lekérésekor:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSummary();
  }, [token, apiUrl]);

  if (loading) {
    return (
      <div className="financial-summary-card">
        <div className="summary-loading">
          <div className="loading-spinner"></div>
          <span>Pénzügyi adatok betöltése...</span>
        </div>
      </div>
    );
  }

  if (!summaryData) return null;

  const currentDate = new Date().toLocaleDateString('hu-HU', { 
    year: 'numeric', 
    month: 'long' 
  });

  return (
    <div className="financial-summary-card">
      <div className="summary-header">
        <div className="summary-period">
          <span className="period-icon">📅</span>
          <span className="period-text">{currentDate}</span>
        </div>
      </div>

      <div className="summary-grid">
        <div className="summary-item main-balance">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <div className="summary-label">{summaryData.balance_title}</div>
            <div className="summary-value main">
              {parseFloat(summaryData.total_balance).toLocaleString('hu-HU')} Ft
            </div>
          </div>
        </div>

        <div className="summary-item positive">
          <div className="summary-icon">📈</div>
          <div className="summary-content">
            <div className="summary-label">Havi Bevétel</div>
            <div className="summary-value">
              +{parseFloat(summaryData.monthly_income).toLocaleString('hu-HU')} Ft
            </div>
          </div>
        </div>

        <div className="summary-item negative">
          <div className="summary-icon">📉</div>
          <div className="summary-content">
            <div className="summary-label">Havi Kiadás</div>
            <div className="summary-value">
              -{parseFloat(summaryData.monthly_expense).toLocaleString('hu-HU')} Ft
            </div>
          </div>
        </div>

        <div className={`summary-item ${summaryData.monthly_savings >= 0 ? 'positive' : 'negative'}`}>
          <div className="summary-icon">💎</div>
          <div className="summary-content">
            <div className="summary-label">Havi Megtakarítás</div>
            <div className="summary-value">
              {summaryData.monthly_savings >= 0 ? '+' : ''}
              {parseFloat(summaryData.monthly_savings).toLocaleString('hu-HU')} Ft
            </div>
          </div>
        </div>
      </div>

      {/* Progress indicator */}
      {summaryData.monthly_income > 0 && (
        <div className="savings-progress">
          <div className="progress-header">
            <span>Megtakarítási arány</span>
            <span>{((summaryData.monthly_savings / summaryData.monthly_income) * 100).toFixed(1)}%</span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ 
                width: `${Math.max(0, Math.min(100, (summaryData.monthly_savings / summaryData.monthly_income) * 100))}%` 
              }}
            ></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default FinancialSummaryCard;