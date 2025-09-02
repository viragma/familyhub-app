import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './ArchiveView.css'; // Fontos, hogy ez be legyen importálva!

// Külön komponens egy archivált kártyához a jobb átláthatóságért
const ArchivedAccountCard = ({ account }) => {
    const navigate = useNavigate();

    // Dátum formázása, ha a backend küldi
    const formattedDate = account.closed_at 
        ? new Date(account.closed_at).toLocaleDateString('hu-HU') 
        : 'Ismeretlen';

    return (
        <div className="archived-card" onClick={() => navigate(`/accounts/${account.id}`)}>
            <div className="archived-card-header">
                <span className="archived-card-icon">🏆</span>
                <div className="archived-card-title-wrapper">
                    <h3 className="archived-card-title">{account.name.replace(/\[Teljesítve\]\s*/, '')}</h3>
                    <p className="archived-card-meta">
                        {account.owner_user ? `${account.owner_user.display_name} célja` : 'Közös cél'}
                    </p>
                </div>
            </div>
            
            <div className="archived-card-footer">
                <span>Lezárás dátuma:</span>
                <strong>{formattedDate}</strong>
            </div>
        </div>
    );
};


const ArchiveView = () => {
    const [archivedAccounts, setArchivedAccounts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { token, apiUrl } = useAuth();

    const fetchArchivedAccounts = useCallback(async () => {
        if (!token) return;
        setIsLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/accounts?status=archived`, {
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                setArchivedAccounts(await response.json());
            }
        } catch (error) {
            console.error("Hiba az archivált kasszák lekérésekor:", error);
        } finally {
            setIsLoading(false);
        }
    }, [token, apiUrl]);

    useEffect(() => {
        fetchArchivedAccounts();
    }, [fetchArchivedAccounts]);

    if (isLoading) {
        return <p>Archívum betöltése...</p>;
    }

    return (
        <div className="archive-view">
            {archivedAccounts.length > 0 ? (
                <div className="archived-grid">
                    {archivedAccounts.map(account => (
                        <ArchivedAccountCard key={account.id} account={account} />
                    ))}
                </div>
            ) : (
                <div className="empty-archive-message">
                    <span className="empty-archive-icon">🗄️</span>
                    <h3>Az archívum jelenleg üres</h3>
                    <p>Ha lezársz egy teljesült célkasszát, az itt fog megjelenni.</p>
                </div>
            )}
        </div>
    );
};

export default ArchiveView;