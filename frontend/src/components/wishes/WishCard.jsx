import React from 'react';
import {
    Clock,
    CheckCircle,
    XCircle,
    Edit3,
    Calendar,
    Star,
    AlertCircle,
    User,
    Target,
    Send,
    Edit,
    MessageSquare,
    Link as LinkIcon
} from 'lucide-react';

// Segédfüggvény a státusz jelvényekhez
const getStatusBadge = (status) => {
    const cleanStatus = typeof status === 'string' ? status.trim().toLowerCase() : '';
    const badges = {
      draft: { color: 'var(--text-secondary)', text: 'Vázlat', icon: Edit3 },
      pending: { color: 'var(--warning)', text: 'Jóváhagyásra vár', icon: Clock },
      approved: { color: 'var(--success)', text: 'Jóváhagyva', icon: CheckCircle },
      modifications_requested: { color: 'var(--accent-primary)', text: 'Módosítás kérve', icon: AlertCircle },
      conditional: { color: 'var(--accent-secondary)', text: 'Feltételesen jóváhagyva', icon: Calendar },
      rejected: { color: 'var(--danger)', text: 'Elutasítva', icon: XCircle },
      completed: { color: 'var(--text-secondary)', text: 'Teljesítve', icon: Target }
    };
    const badge = badges[cleanStatus] || badges.draft;
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

// A WishCard komponens mostantól fogad egy onActivate prop-ot is
function WishCard({ wish, currentUser, onSubmit, onApproveClick, onHistoryClick, onEditClick, onActivate }) {
  
  if (!currentUser || !wish) {
    return null; 
  }
  
  const hasAlreadyApproved = wish.approvals?.some(a => 
    Number(a.approver.id) === Number(currentUser.id) && 
    (a.status === 'approved' || a.status === 'conditional' || a.status === 'rejected')
  );

  const isOwner = Number(currentUser.id) === Number(wish.owner_user_id);
  const isParent = currentUser.role === 'Szülő' || currentUser.role === 'Családfő';
  
  const canApprove = isParent && !isOwner && wish.status === 'pending' && !hasAlreadyApproved;
  const canSubmit = isOwner && wish.status === 'draft';
  const canEdit = isOwner && (wish.status === 'draft' || wish.status === 'modifications_requested');
  const canActivate = isParent && wish.status === 'conditional'; // Új feltétel
  
  const hasGoalAccount = wish.status === 'approved' && wish.goal_account;
  const progress = hasGoalAccount && wish.goal_account.goal_amount > 0
    ? (parseFloat(wish.goal_account.balance) / parseFloat(wish.goal_account.goal_amount)) * 100
    : 0;

  const feedback = wish.status === 'modifications_requested' 
    ? wish.approvals?.find(a => a.status === 'modifications_requested')?.feedback 
    : null;

  const actualApprovers = wish.approvals?.filter(a => a.status === 'approved' || a.status === 'conditional');

  return (
    <div 
      className={`bento-card wish-card ${getPriorityClass(wish.priority)}`}
      onClick={() => onHistoryClick && onHistoryClick(wish)}
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

      {/* Média (Képek és Linkek) */}
      {wish.images && wish.images.length > 0 && (
        <div className="wish-media">
          <img src={wish.images[0].image_url} alt={wish.name} className="wish-image" />
        </div>
      )}
      
      {wish.links && wish.links.length > 0 && (
        <div className="wish-links-section">
          {wish.links.map(link => (
            <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="wish-link" onClick={(e) => e.stopPropagation()}>
              <LinkIcon size={14} />
              <span>{link.title || link.url}</span>
            </a>
          ))}
        </div>
      )}
      
      {/* Jóváhagyók listája */}
      {wish.status === 'pending' && actualApprovers && actualApprovers.length > 0 && (
        <div className="approvers-section">
          <span className="approvers-title">Jóváhagyták:</span>
          <div className="approvers-list">
            {actualApprovers.map(approval => (
              <div key={approval.id} className="approver-avatar" title={approval.approver.display_name}>
                {approval.approver.display_name.charAt(0)}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Szülői visszajelzés */}
      {feedback && (
        <div className="wish-feedback">
          <MessageSquare size={16} />
          <div>
            <span className="feedback-title">Módosítási javaslat:</span>
            <p className="feedback-text">"{feedback}"</p>
          </div>
        </div>
      )}

      {/* Feltétel megjelenítése */}
      {wish.status === 'conditional' && (
        <div className="wish-feedback" style={{borderColor: 'var(--accent-secondary)'}}>
          <Calendar size={16} />
          <div>
            <span className="feedback-title">Feltétel:</span>
            <p className="feedback-text">
              "{wish.approvals?.find(a => a.status === 'conditional')?.conditional_note || 'Nincs megadva'}"
            </p>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
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
      <div className="wish-actions">
          {canSubmit && (
              <>
                <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); onEditClick(wish); }}>
                    <Edit size={14} /> Szerkesztés
                </button>
                <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onSubmit(wish.id); }}>
                    <Send size={14}/> Beküldés
                </button>
              </>
          )}

          {wish.status === 'modifications_requested' && isOwner && (
              <button className="btn btn-primary" onClick={(e) => { e.stopPropagation(); onEditClick(wish); }}>
                  <Edit size={14} /> Módosítás és újraküldés
              </button>
          )}

          {canApprove && (
            <>
              <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); onApproveClick(wish); }}>
                  <CheckCircle size={14} /> Jóváhagyom
              </button>
              <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); onApproveClick(wish); }}>
                  <Edit3 size={14} /> Módosítást kérek
              </button>
              <button className="btn btn-danger" onClick={(e) => { e.stopPropagation(); onApproveClick(wish); }}>
                  <XCircle size={14} /> Elutasítom
              </button>
            </>
          )}
          
          {/* ÚJ GOMB: Aktiválás */}
          {canActivate && (
            <button className="btn btn-success" onClick={(e) => { e.stopPropagation(); onActivate(wish.id); }}>
                <CheckCircle size={14} /> Gyűjtés indítása
            </button>
          )}
      </div>
    </div>
  );
};

export default WishCard;