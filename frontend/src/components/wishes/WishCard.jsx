import React from 'react';
import { Clock, CheckCircle, XCircle, Edit3, Calendar, Star, AlertCircle, User, Target, Send, ShieldCheck } from 'lucide-react';

// Segédfüggvény a státusz jelvényekhez
const getStatusBadge = (status) => {
    const badges = {
      draft: { color: 'var(--text-secondary)', text: 'Vázlat', icon: Edit3 },
      pending: { color: 'var(--warning)', text: 'Jóváhagyásra vár', icon: Clock },
      approved: { color: 'var(--success)', text: 'Jóváhagyva', icon: CheckCircle },
      modifications_requested: { color: 'var(--accent-primary)', text: 'Módosítás kérve', icon: AlertCircle },
      conditional: { color: 'var(--accent-secondary)', text: 'Feltételesen jóváhagyva', icon: Calendar },
      rejected: { color: 'var(--danger)', text: 'Elutasítva', icon: XCircle },
      completed: { color: 'var(--text-secondary)', text: 'Teljesítve', icon: Target }
    };
    
    const badge = badges[status] || badges.draft;
    const IconComponent = badge.icon;
    
    return (
      <div className="status-badge" style={{ color: badge.color, backgroundColor: `color-mix(in srgb, ${badge.color} 15%, transparent)`, border: `1px solid ${badge.color}` }}>
        <IconComponent size={12} />
        <span>{badge.text}</span>
      </div>
    );
};

// Segédfüggvény a prioritás jelöléséhez
const getPriorityClass = (priority) => {
    return {
      low: 'priority-low',
      medium: 'priority-medium', 
      high: 'priority-high'
    }[priority] || '';
};

function WishCard({ wish, currentUser, onSubmit, onApproveClick,onHistoryClick }) {
  const isOwner = currentUser.id === wish.owner_user_id;
  const isParent = currentUser.role === 'Szülő' || currentUser.role === 'Családfő';

  const canSubmit = isOwner && wish.status === 'draft';
  const canApprove = isParent && !isOwner && wish.status === 'pending';
  
  // --- ÚJ LOGIKA A PROGRESS BAR-HOZ ---
  const hasGoalAccount = wish.status === 'approved' && wish.goal_account;
  const progress = hasGoalAccount && wish.goal_account.goal_amount > 0
    ? (parseFloat(wish.goal_account.balance) / parseFloat(wish.goal_account.goal_amount)) * 100
    : 0;

  return (
    <div className={`bento-card wish-card ${getPriorityClass(wish.priority)}`}
    onClick={() => onHistoryClick && onHistoryClick(wish)} // <--- ÚJ onClick esemény
    >
      {/* Header */}
      <div className="wish-header">
        <div className="wish-title-section">
          <div className="wish-title-row">
            <h3 className="wish-title">{wish.name}</h3>
          </div>
          {wish.owner && (
              <div className="wish-owner">
                <User size={14} />
                <span>{wish.owner.display_name}</span>
              </div>
            )}
          <p className="wish-description">{wish.description}</p>
        </div>
        <div className="wish-amount-section">
          <div className="wish-amount">
            {parseFloat(wish.estimated_price).toLocaleString('hu-HU')} Ft
          </div>
          {getStatusBadge(wish.status)}
        </div>
      </div>

      {/* --- ÚJ PROGRESS BAR SZEKCIÓ --- */}
      {hasGoalAccount && (
          <div className="wish-progress">
            <div className="progress-container">
              <div className="progress-header">
                <span>Összegyűjtve</span>
                <span style={{ color: 'var(--accent-primary)' }}>{progress.toFixed(0)}%</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                ></div>
              </div>
              <div className="progress-amounts">
                <span>{parseFloat(wish.goal_account.balance).toLocaleString('hu-HU')} Ft</span>
                <span>{parseFloat(wish.goal_account.goal_amount).toLocaleString('hu-HU')} Ft</span>
              </div>
            </div>
          </div>
        )}

      {/* Meta info */}
        <div className="wish-meta">
        <div className="meta-item">
          <Star size={14} />
          <span style={{textTransform: 'capitalize'}}>{wish.priority} prioritás</span>
        </div>
        {wish.category && (
          <div className="meta-item">
            <div className="category-dot" style={{backgroundColor: wish.category.color || 'var(--accent-primary)'}}></div>
            <span>{wish.category.name}</span>
          </div>
        )}
        {wish.deadline && (
          <div className="meta-item">
            <Calendar size={14} />
            <span>Határidő: {new Date(wish.deadline).toLocaleDateString('hu-HU')}</span>
          </div>
        )}
      </div>
      
      {/* Actions */}
      {(canSubmit || canApprove) && (
        <div className="wish-actions">
            {canSubmit && (
                <button className="btn btn-primary" onClick={() => onSubmit(wish.id)}>
                    <Send size={14}/> Beküldés jóváhagyásra
                </button>
            )}
            {canApprove && (
                <button className="btn btn-success" onClick={() => onApproveClick(wish)}>
                    <ShieldCheck size={14} /> Döntés
                </button>
            )}
        </div>
      )}
    </div>
  );
};

export default WishCard;