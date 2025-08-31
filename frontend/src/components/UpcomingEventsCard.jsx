// frontend/src/components/UpcomingEventsCard.jsx
import React from 'react';
import { Calendar, User, Repeat, TrendingDown, TrendingUp, ArrowRightLeft, AlertTriangle } from 'lucide-react';
import './UpcomingEventsCard.css';

const EventIcon = ({ type }) => {
    switch (type) {
        case 'bevétel':
            return <TrendingUp size={20} className="event-icon income" />;
        case 'kiadás':
            return <TrendingDown size={20} className="event-icon expense" />;
        case 'átutalás':
            return <ArrowRightLeft size={20} className="event-icon transfer" />;
        case 'tervezett kiadás':
            return <AlertTriangle size={20} className="event-icon planned" />;
        default:
            return <Calendar size={20} className="event-icon" />;
    }
};

const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) return 'Ma';
    if (date.toDateString() === tomorrow.toDateString()) return 'Holnap';
    
    return date.toLocaleDateString('hu-HU', { month: 'short', day: 'numeric' });
};

function UpcomingEventsCard({ events }) {
    if (!events || events.length === 0) {
        return (
            <div className="dashboard-card upcoming-events-card">
                <div className="dashboard-card-header">
                    <h3 className="dashboard-card-title">Következő 30 Nap</h3>
                    <Calendar className="dashboard-card-icon" />
                </div>
                <div className="empty-events-state">
                    <Calendar size={48} />
                    <p>Nincsenek közelgő események.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-card upcoming-events-card">
            <div className="dashboard-card-header">
                <h3 className="dashboard-card-title">Következő 30 Nap</h3>
                <Calendar className="dashboard-card-icon" />
            </div>
            <div className="events-list">
                {events.map((event, index) => (
                    <div key={index} className="event-item">
                        <div className="event-icon-container">
                            <EventIcon type={event.type} />
                        </div>
                        <div className="event-details">
                            <p className="event-description">{event.description}</p>
                            <div className="event-meta">
                                <span className="meta-tag owner-tag">
                                    <User size={12} /> {event.owner_name}
                                </span>
                                {event.is_recurring && (
                                    <span className="meta-tag recurring-tag">
                                        <Repeat size={12} /> Rendszeres
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="event-info">
                            <p className={`event-amount ${event.type.includes('bevétel') ? 'income' : 'expense'}`}>
                                {event.type.includes('bevétel') ? '+' : '-'}{parseFloat(event.amount).toLocaleString('hu-HU')} Ft
                            </p>
                            <p className="event-date">{formatDate(event.date)}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default UpcomingEventsCard;