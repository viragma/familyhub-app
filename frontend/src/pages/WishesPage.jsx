import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Users, Clock, Target, Plus } from 'lucide-react';
import WishCard from '../components/wishes/WishCard';
import CreateWishModal from '../components/wishes/CreateWishModal';
import ApprovalModal from '../components/wishes/ApprovalModal';
import WishHistoryLog from '../components/wishes/WishHistoryLog';
import WishFilterPanel from '../components/wishes/WishFilterPanel';

function WishesPage() {
  const [activeTab, setActiveTab] = useState('my-wishes');
  const [allWishes, setAllWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [filters, setFilters] = useState({});
  const [panelFilters, setPanelFilters] = useState({});
  const [familyMembers, setFamilyMembers] = useState([]);
  const [categories, setCategories] = useState([]);

  const { user, token, apiUrl } = useAuth();

  useEffect(() => {
    const fetchFilterData = async () => {
        if(!token) return;
        try {
            const [membersRes, categoriesRes] = await Promise.all([
                fetch(`${apiUrl}/api/family/members`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if(membersRes.ok) setFamilyMembers(await membersRes.json());
            if(categoriesRes.ok) setCategories(await categoriesRes.json());
        } catch (error) {
            console.error("Hiba a szűrő adatok lekérésekor:", error);
        }
    };
    fetchFilterData();
  }, [token, apiUrl]);

  useEffect(() => {
    if (!user) return;
    
    let tabFilters = {};
    switch (activeTab) {
      case 'my-wishes':
        tabFilters = { owner_ids: [user.id] };
        break;
      case 'pending':
        tabFilters = { statuses: ['pending'] };
        break;
      case 'history':
        tabFilters = { statuses: ['completed', 'rejected'] };
        break;
      case 'family-wishes':
        break;
      default:
        break;
    }
    setFilters({ ...panelFilters, ...tabFilters });

  }, [activeTab, panelFilters, user]);

  const fetchWishes = useCallback(async () => {
    if (!token) return;
    setLoading(true);

    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, values]) => {
      if (values && values.length > 0) {
        values.forEach(value => params.append(key, value));
      }
    });

    try {
      const response = await fetch(`${apiUrl}/api/wishes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(response.ok) {
        setAllWishes(await response.json());
      }
    } catch (error) { 
      console.error("Hiba a kívánságok lekérésekor:", error); 
    } finally { 
      setLoading(false); 
    }
  }, [token, apiUrl, filters]);

  useEffect(() => {
    fetchWishes();
  }, [fetchWishes]);
  
  const handlePanelFilterChange = (group, newValues) => {
    setPanelFilters(prev => ({ ...prev, [group]: newValues }));
  };

  const handleSaveWish = async (wishData) => {
     if (!token) return;
    try {
      const response = await fetch(`${apiUrl}/api/wishes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(wishData),
      });

      if (response.ok) {
        setIsCreateModalOpen(false);
        fetchWishes();
      } else {
        const errorData = await response.json();
        alert(`Hiba a mentés során: ${errorData.detail}`);
      }
    } catch (error) {
      console.error("Hiba a kívánság mentésekor:", error);
      alert("Hálózati hiba történt a mentés során.");
    }
  };

  const handleSubmitWish = async (wishId) => {
    try {
      const response = await fetch(`${apiUrl}/api/wishes/${wishId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        fetchWishes();
      } else {
        alert("Hiba a beküldés során.");
      }
    } catch (error) { 
      console.error("Hiba a beküldéskor:", error); 
    }
  };

  const handleApprovalDecision = async (wishId, decisionData) => {
     try {
      const response = await fetch(`${apiUrl}/api/wishes/${wishId}/approval`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(decisionData)
      });
      if(response.ok) {
          fetchWishes();
          setIsApprovalModalOpen(false);
          setSelectedWish(null);
      } else {
          const err = await response.json();
          alert(`Hiba a döntés során: ${err.detail}`);
      }
    } catch (error) { 
      console.error("Hiba a döntéskor:", error); 
    }
  };
  
  const openApprovalModal = (wish) => {
    setSelectedWish(wish);
    setIsApprovalModalOpen(true);
  };

  const handleHistoryClick = async (wish) => {
    if (activeTab !== 'history') return;
    if (!token) return;
    try {
        const response = await fetch(`${apiUrl}/api/wishes/${wish.id}/history`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(response.ok) {
            const data = await response.json();
            setHistoryData(data);
        } else {
            console.error("Hiba az előzmények lekérésekor.");
        }
    } catch (error) {
        console.error("Hiba az előzmények lekérésekor:", error);
    }
  };

  const tabs = [
    { id: 'my-wishes', label: 'Saját kívánságaim', icon: Heart },
    { id: 'family-wishes', label: 'Családi kívánságok', icon: Users },
    { id: 'pending', label: 'Jóváhagyásra vár', icon: Clock },
    { id: 'history', label: 'Előzmények', icon: Target }
  ];

  return (
    <div className="wishes-page-layout">
      <WishFilterPanel 
        filters={panelFilters}
        onFilterChange={handlePanelFilterChange}
        familyMembers={familyMembers}
        categories={categories}
      />
      <div className="wishes-page">
        <div className="header">
          <div className="greeting-section">
            <h1 className="greeting">Kívánságok 🎁</h1>
            <p className="date">Tervezzük meg közösen az álmokat!</p>
          </div>
          <button onClick={() => setIsCreateModalOpen(true)} className="fab">
              <Plus size={24} />
          </button>
        </div>
        
        <div className="wishes-tabs">
           {tabs.map((tab) => (
              <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`wishes-tab ${activeTab === tab.id ? 'active' : ''}`}
              >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
              </button>
           ))}
        </div>
        
        <div className="wishes-content">
          {loading ? <p>Kívánságok betöltése...</p> : (
              <div className="wishes-grid">
                  {allWishes.length > 0 ? (
                    allWishes.map(wish => 
                      <WishCard 
                        key={wish.id} 
                        wish={wish} 
                        currentUser={user}
                        onSubmit={handleSubmitWish}
                        onApproveClick={openApprovalModal}
                        onHistoryClick={handleHistoryClick}
                      />)
                  ) : (
                    <p>Nincsenek a feltételeknek megfelelő kívánságok.</p>
                  )}
              </div>
          )}
          {historyData && (
              <WishHistoryLog history={historyData} onClose={() => setHistoryData(null)} />
          )}
        </div>
      </div>

      <CreateWishModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} onSave={handleSaveWish} />
      {selectedWish && <ApprovalModal isOpen={isApprovalModalOpen} onClose={() => setSelectedWish(null)} onDecision={handleApprovalDecision} wish={selectedWish} />}
    </div>
  );
}

export default WishesPage;