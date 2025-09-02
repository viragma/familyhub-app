import React from 'react';
import { ArrowUpRight, ArrowDownLeft, TrendingUp, TrendingDown, Send, Calendar, User, Tag, MessageSquare } from 'lucide-react';

function ModernTransactionsList({ transactions, filters, onFilterChange, onEditTransaction, onDeleteTransaction, user }) {
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Ma';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Tegnap';
    } else {
      return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
    }
  };

  const getTransactionTypeInfo = (transaction) => {
    if (transaction.transfer_id) {
      // Ez egy átutalás
      if (transaction.type === 'bevétel') {
        return {
          type: 'transfer_in',
          icon: <ArrowDownLeft size={20} />,
          label: 'Bejövő utalás',
          color: 'transfer-in'
        };
      } else {
        return {
          type: 'transfer_out',
          icon: <ArrowUpRight size={20} />,
          label: 'Kimenő utalás', 
          color: 'transfer-out'
        };
      }
    }
    
    if (transaction.type === 'bevétel') {
      return {
        type: 'income',
        icon: <TrendingUp size={20} />,
        label: 'Bevétel',
        color: 'income'
      };
    } else {
      return {
        type: 'expense',
        icon: <TrendingDown size={20} />,
        label: 'Kiadás',
        color: 'expense'
      };
    }
  };

  const getTransferDetails = (transaction) => {
    if (!transaction.transfer_id) return null;

    // Itt kellene az átutalás részleteit lekérni
    // Most egy egyszerű megoldással dolgozunk
    if (transaction.type === 'bevétel') {
      return {
        direction: 'from',
        otherParty: transaction.from_account_name || 'Másik kassza',
        message: 'Beérkezett'
      };
    } else {
      return {
        direction: 'to', 
        otherParty: transaction.to_account_name || 'Célkassza',
        message: 'Elküldve'
      };
    }
  };

  return (
    <div className="modern-transactions-section">
      <div className="transactions-header">
        <h2 className="transactions-title">
          <span className="title-icon">📝</span>
          Legutóbbi Tranzakciók
        </h2>
        <div className="transactions-count">
          {transactions.length} tétel
        </div>
      </div>

      {/* Modern Filters */}
      <div className="modern-filters">
        <div className="filter-section">
          <div className="filter-group-modern">
            <label className="filter-label-modern">Típus szűrés</label>
            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filters.type === 'all' ? 'active' : ''}`}
                onClick={() => onFilterChange('type', 'all')}
              >
                <span className="btn-icon">📋</span>
                <span>Mind</span>
              </button>
              <button 
                className={`filter-btn ${filters.type === 'bevétel' ? 'active' : ''}`}
                onClick={() => onFilterChange('type', 'bevétel')}
              >
                <span className="btn-icon">📈</span>
                <span>Bevétel</span>
              </button>
              <button 
                className={`filter-btn ${filters.type === 'kiadás' ? 'active' : ''}`}
                onClick={() => onFilterChange('type', 'kiadás')}
              >
                <span className="btn-icon">📉</span>
                <span>Kiadás</span>
              </button>
            </div>
          </div>
          
          <div className="filter-group-modern">
            <label className="filter-label-modern">Keresés</label>
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input 
                type="text" 
                className="search-input"
                value={filters.searchTerm}
                onChange={e => onFilterChange('searchTerm', e.target.value)}
                placeholder="Keresés leírásban..."
              />
            </div>
          </div>

          <div className="filter-group-modern">
            <label className="filter-label-modern">Rendezés</label>
            <select 
              className="sort-select" 
              value={filters.sortBy} 
              onChange={e => onFilterChange('sortBy', e.target.value)}
            >
              <option value="date_desc">⏰ Legújabb elöl</option>
              <option value="date_asc">⏰ Legrégebbi elöl</option>
              <option value="amount_desc">💰 Összeg (csökkenő)</option>
              <option value="amount_asc">💰 Összeg (növekvő)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Enhanced Transactions List */}
      <div className="enhanced-transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <div className="empty-icon">🤷</div>
            <h3>Nincs megjeleníthető tranzakció</h3>
            <p>Próbálj meg más szűrőbeállításokat használni!</p>
          </div>
        ) : (
          transactions.map(tx => {
            const typeInfo = getTransactionTypeInfo(tx);
            const transferDetails = getTransferDetails(tx);

            return (
              <div className={`enhanced-transaction-card ${typeInfo.color}`} key={tx.id}>
                {/* Transaction Type Indicator */}
                <div className="transaction-type-bar"></div>
                
                <div className="transaction-main-content">
                  {/* Icon and Type */}
                  <div className={`transaction-icon-enhanced ${typeInfo.color}`}>
                    {typeInfo.icon}
                  </div>

                  {/* Transaction Details */}
                  <div className="transaction-details-enhanced">
                    {/* Primary Info Row */}
                    <div className="transaction-primary-row">
                      <div className="transaction-title-section">
                        <h4 className="transaction-description-enhanced">
                          {tx.description || 'Nincs leírás'}
                        </h4>
                        <div className="transaction-type-label">
                          <span className={`type-badge ${typeInfo.color}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                      </div>
                      
                      <div className={`transaction-amount-enhanced ${typeInfo.color}`}>
                        <span className="amount-sign">
                          {typeInfo.type === 'income' || typeInfo.type === 'transfer_in' ? '+' : '-'}
                        </span>
                        <span className="amount-value">
                          {parseFloat(tx.amount).toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                    </div>

                    {/* Transfer Details Row */}
                    {transferDetails && (
                      <div className="transfer-details-row">
                        <div className="transfer-info">
                          <Send size={16} className="transfer-arrow" />
                          <span className="transfer-text">
                            {transferDetails.direction === 'from' ? 'Feladó: ' : 'Címzett: '}
                            <strong>{transferDetails.otherParty}</strong>
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Meta Information Row */}
                    <div className="transaction-meta-row">
                      <div className="meta-items-left">
                        <div className="meta-item">
                          <User size={14} />
                          <span>{tx.creator?.display_name || 'Ismeretlen'}</span>
                        </div>
                        
                        <div className="meta-item">
                          <Calendar size={14} />
                          <span>{formatDate(tx.date)}</span>
                        </div>
                        
                        {tx.category && (
                          <div className="meta-item">
                            <Tag size={14} />
                            <span>{tx.category.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      {user && ['Szülő', 'Családfő'].includes(user.role) && (
                        <div className="transaction-actions-enhanced">
                          <button 
                            className="action-btn-enhanced edit" 
                            onClick={() => onEditTransaction(tx)}
                            title="Szerkesztés"
                          >
                            ✏️
                          </button>
                          <button 
                            className="action-btn-enhanced delete" 
                            onClick={() => onDeleteTransaction(tx.id)}
                            title="Törlés"
                          >
                            🗑️
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Description/Comment Row (if different from title) */}
                    {tx.description && tx.description !== (tx.title || '') && (
                      <div className="transaction-comment-row">
                        <MessageSquare size={14} />
                        <span className="comment-text">{tx.description}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {transactions.length > 10 && (
        <div className="transactions-pagination">
          <button className="pagination-btn">
            Több tranzakció betöltése
          </button>
        </div>
      )}
    </div>
  );
}

export default ModernTransactionsList;