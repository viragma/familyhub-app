import React from 'react';

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

  const getTransactionIcon = (transaction) => {
    if (transaction.transfer_id) {
      return transaction.type === 'bevétel' ? '⬇️' : '⬆️';
    }
    return transaction.type === 'bevétel' ? '💰' : '💸';
  };

  const getCategoryIcon = (category) => {
    if (!category) return '📄';
    return category.icon || '📄';
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

      {/* Transactions List */}
      <div className="modern-transactions-list">
        {transactions.length === 0 ? (
          <div className="empty-transactions">
            <div className="empty-icon">🤷</div>
            <h3>Nincs megjeleníthető tranzakció</h3>
            <p>Próbálj meg más szűrőbeállításokat használni!</p>
          </div>
        ) : (
          transactions.map(tx => (
            <div className="modern-transaction-card" key={tx.id}>
              <div className="transaction-icon-area">
                <div className={`transaction-icon ${tx.type}`}>
                  {getTransactionIcon(tx)}
                </div>
              </div>

              <div className="transaction-content">
                <div className="transaction-primary-info">
                  <h4 className="transaction-description">
                    {tx.description || 'Nincs leírás'}
                  </h4>
                  <div className={`transaction-amount ${tx.type}`}>
                    {tx.type === 'bevétel' ? '+' : '-'}
                    {parseFloat(tx.amount).toLocaleString('hu-HU')} Ft
                  </div>
                </div>

                <div className="transaction-meta-info">
                  <div className="meta-item">
                    <span className="meta-icon">👤</span>
                    <span className="meta-text">{tx.creator?.display_name || 'Ismeretlen'}</span>
                  </div>
                  
                  <div className="meta-item">
                    <span className="meta-icon">📅</span>
                    <span className="meta-text">{formatDate(tx.date)}</span>
                  </div>
                  
                  <div className="meta-item">
                    <span className="meta-icon">{getCategoryIcon(tx.category)}</span>
                    <span className="meta-text">{tx.category ? tx.category.name : 'Nincs kategória'}</span>
                  </div>

                  {tx.transfer_id && (
                    <div className="meta-item transfer">
                      <span className="meta-icon">🔄</span>
                      <span className="meta-text">Átutalás</span>
                    </div>
                  )}
                </div>
              </div>

              {user && ['Szülő', 'Családfő'].includes(user.role) && (
                <div className="transaction-actions">
                  <button 
                    className="action-btn-icon modern-edit" 
                    onClick={() => onEditTransaction(tx)}
                    title="Szerkesztés"
                  >
                    ✏️
                  </button>
                  <button 
                    className="action-btn-icon modern-delete" 
                    onClick={() => onDeleteTransaction(tx.id)}
                    title="Törlés"
                  >
                    🗑️
                  </button>
                </div>
              )}
            </div>
          ))
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