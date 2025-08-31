import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ChevronRight } from 'lucide-react';

function NotificationBar({ notifications }) {
  if (!notifications || notifications.length === 0) {
    return null; // Ha nincs értesítés, nem jelenítünk meg semmit
  }

  return (
    <div className="notification-container">
      {notifications.map((notif, index) => (
        <Link to={notif.link} key={index} className="notification-bar">
          <div className="notification-icon">
            <AlertCircle size={20} />
          </div>
          <p className="notification-message">{notif.message}</p>
          <div className="notification-action">
            <ChevronRight size={20} />
          </div>
        </Link>
      ))}
    </div>
  );
}

export default NotificationBar;