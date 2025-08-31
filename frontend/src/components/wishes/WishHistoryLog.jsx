import React from 'react';
import { Gift, CheckCircle, XCircle, Edit3, Send, AlertCircle, MessageSquare } from 'lucide-react';

const getActionIcon = (action) => {
    const iconMap = {
      created: <Edit3 size={16} />,
      submitted: <Send size={16} />,
      approved: <CheckCircle size={16} className="text-green-500" />,
      conditional: <CheckCircle size={16} className="text-purple-500" />,
      rejected: <XCircle size={16} className="text-red-500" />,
      modifications_requested: <AlertCircle size={16} className="text-blue-500" />,
      completed: <Gift size={16} />,
      modified: <Edit3 size={16} />
    };
    return <div className="history-icon-wrapper">{iconMap[action] || <MessageSquare size={16} />}</div>;
};

function WishHistoryLog({ history, onClose }) {
  if (!history || history.length === 0) {
    return (
      <div className="history-container">
        <div className="history-header">
          <h3>Előzmények</h3>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        <p>Ehhez a kívánsághoz még nincsenek előzmények.</p>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-header">
        <h3>Előzmények</h3>
        <button onClick={onClose} className="modal-close-btn">&times;</button>
      </div>
      <ul className="history-timeline">
        {history.map(entry => (
          <li key={entry.id} className="history-item">
            {getActionIcon(entry.action)}
            <div className="history-content">
              <div className="history-info">
                <span className="history-user">{entry.user.display_name}</span>
                <span className="history-action-text">{entry.action.replace('_', ' ')}</span>
              </div>
              {entry.notes && <p className="history-notes">"{entry.notes}"</p>}
              <div className="history-timestamp">
                {new Date(entry.created_at).toLocaleString('hu-HU')}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default WishHistoryLog;