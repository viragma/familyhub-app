import React from 'react';
import { Calendar, Tag, User, Check, Edit, Trash2 } from 'lucide-react';

// Segédfüggvény az ikon kiválasztásához
const getCategoryIcon = (category) => {
  if (category && category.icon) {
    return category.icon;
  }
  if (category && category.parent && category.parent.icon) {
    return category.parent.icon;
  }
  return '💸';
};

// Segédfüggvény a relatív idő kiszámításához
const formatDate = (dueDate) => {
  const now = new Date();
  const due = new Date(dueDate);
  now.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { text: 'Lejárt', urgent: true };
  if (diffDays === 0) return { text: 'Ma esedékes', urgent: true };
  if (diffDays === 1) return { text: 'Holnap esedékes', urgent: false };
  if (diffDays <= 7) return { text: `${diffDays} nap múlva`, urgent: false };
  
  return { text: due.toLocaleDateString('hu-HU'), urgent: false };
};

// Segédfüggvény a prioritás színéhez
const getPriorityClass = (priority) => {
  switch (priority) {
    case 'magas': return 'p-high';
    case 'közepes': return 'p-medium';
    case 'alacsony': return 'p-low';
    default: return 'p-medium';
  }
};

function ExpectedExpenseCard({ expense, onComplete, onEdit, onDelete }) {
  const { text: dueDateText, urgent } = formatDate(expense.due_date);
  const priorityClass = getPriorityClass(expense.priority);
  const categoryIcon = getCategoryIcon(expense.category);

  // --- EZ A VÉGLEGES JAVÍTÁS ---
  // A te sémád az 'estimated_amount' nevet használja. Most már ez van itt is.
  const amount = expense.estimated_amount || 0;

  return (
    <div className={`expense-card ${priorityClass}`}>
      <div className="expense-card-main">
        <div className={`expense-priority-indicator ${priorityClass}`}></div>
        <div className="expense-content">
          <div className="expense-header">
            <span className="expense-category-icon">{categoryIcon}</span>
            <h4 className="expense-description">{expense.description}</h4>
          </div>
          <div className="expense-meta">
            <div className="meta-item">
              <Calendar size={14} />
              <span className={urgent ? 'urgent-date' : ''}>{dueDateText}</span>
            </div>
            {expense.owner && (
                <div className="meta-item">
                    <User size={14} />
                    <span>{expense.owner.display_name}</span>
                </div>
            )}
            {expense.category && (
              <div className="meta-item">
                <Tag size={14} />
                <span>{expense.category.name}</span>
              </div>
            )}
          </div>
        </div>
        <div className="expense-amount">
          <span className="amount-label">Becsült összeg</span>
          <span className="amount-value">{parseFloat(amount).toLocaleString('hu-HU')} Ft</span>
        </div>
      </div>
      <div className="expense-actions">
        <button className="action-btn-complete" onClick={() => onComplete(expense)}>
          <Check size={16} />
          Teljesítve
        </button>
        <button className="action-btn-icon" onClick={() => onEdit(expense)} title="Szerkesztés">
          <Edit size={16} />
        </button>
        <button className="action-btn-icon danger" onClick={() => onDelete(expense.id)} title="Törlés">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default ExpectedExpenseCard;