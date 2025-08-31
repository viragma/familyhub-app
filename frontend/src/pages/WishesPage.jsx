import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Users, Clock, Target, Plus } from 'lucide-react';
import WishCard from '../components/wishes/WishCard';
import CreateWishModal from '../components/wishes/CreateWishModal';
import ApprovalModal from '../components/wishes/ApprovalModal';
import WishHistoryLog from '../components/wishes/WishHistoryLog';
import WishFilterPanel from '../components/wishes/WishFilterPanel';
import './../components/wishes/WishFilterPanel.css';

function WishesPage() {
  const [activeTab, setActiveTab] = useState('my-wishes');
  const [allWishes, setAllWishes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isApprovalModalOpen, setIsApprovalModalOpen] = useState(false);
  const [selectedWish, setSelectedWish] = useState(null);
  const [wishToEdit, setWishToEdit] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [filters, setFilters] = useState({});
  const [panelFilters, setPanelFilters] = useState({});
  const [familyMembers, setFamilyMembers] = useState([]);
  const [categories, setCategories] = useState([]);

  const { user, token, apiUrl } = useAuth();

  useEffect(() => {
    const fetchFilterData = async () => {
        if(!token || !user) return;
        try {
            const [membersRes, categoriesRes] = await Promise.all([
                fetch(`${apiUrl}/api/families/${user.family_id}/users`, { headers: { 'Authorization': `Bearer ${token}` } }),
                fetch(`${apiUrl}/api/categories`, { headers: { 'Authorization': `Bearer ${token}` } })
            ]);
            if(membersRes.ok) setFamilyMembers(await membersRes.json());
            if(categoriesRes.ok) setCategories(await categoriesRes.json());
        } catch (error) {
            console.error("Hiba a szűrő adatok lekérésekor:", error);
        }
    };
    fetchFilterData();
  }, [token, apiUrl, user]);

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
      if (values && Array.isArray(values) && values.length > 0) {
        values.forEach(value => params.append(key, value));
      }
    });

    try {
      const response = await fetch(`${apiUrl}/api/wishes?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if(response.ok) {
        setAllWishes(await response.json());
      } else {
        console.error("Hiba a kívánságok lekérésekor, státusz:", response.status);
        setAllWishes([]);
      }
    } catch (error) { 
      console.error("Hiba a kívánságok lekérésekor:", error); 
      setAllWishes([]);
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

  const handleSubmitWish = async (wishId) => {
    if (!wishId) return;
    try {
      const response = await fetch(`${apiUrl}/api/wishes/${wishId}/submit`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Hiba a beküldés során.");
      }
    } catch (error) { 
      console.error("Hiba a beküldéskor:", error); 
      alert(error.message);
      throw error;
    }
  };

  const handleSaveWish = async (wishData, action, wishId) => {
    if (!token) return;
  
    try {
      let wishToSubmitId = wishId;
  
      if (wishId) { 
        const updateResponse = await fetch(`${apiUrl}/api/wishes/${wishId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(wishData),
        });
        if (!updateResponse.ok) {
          const errorData = await updateResponse.json();
          throw new Error(`Hiba a szerkesztés során: ${errorData.detail}`);
        }
      } else { 
        const createResponse = await fetch(`${apiUrl}/api/wishes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
          body: JSON.stringify(wishData),
        });
  
        if (!createResponse.ok) {
          const errorData = await createResponse.json();
          throw new Error(`Hiba a vázlat mentése során: ${errorData.detail}`);
        }
        const newWish = await createResponse.json();
        wishToSubmitId = newWish.id;
      }
  
      if (action === 'submit' && wishToSubmitId) {
        await handleSubmitWish(wishToSubmitId);
      }
  
      fetchWishes();
  
    } catch (error) {
      console.error("Hiba a mentési folyamat során:", error);
      alert(error.message);
    }
  
    setIsCreateModalOpen(false);
    setWishToEdit(null);
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

  const openEditModal = (wish) => {
    setWishToEdit(wish);
    setIsCreateModalOpen(true);
  };

  const handleHistoryClick = async (wish) => {
    if (activeTab !== 'history' || !wish) return;
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
          <button onClick={() => { setWishToEdit(null); setIsCreateModalOpen(true); }} className="fab">
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
                    allWishes.map(wish => (
                      // JAVÍTÁS: Itt van a hiányzó 'key' prop.
                      // Enélkül a React nem tudja hatékonyan kezelni a listát.
                      <WishCard 
                        key={wish.id} 
                        wish={wish} 
                        currentUser={user}
                        onSubmit={handleSubmitWish}
                        onApproveClick={openApprovalModal}
                        onEditClick={openEditModal}
                        onHistoryClick={handleHistoryClick}
                      />
                    ))
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

      <CreateWishModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { setIsCreateModalOpen(false); setWishToEdit(null); }} 
        onSave={handleSaveWish}
        wishToEdit={wishToEdit}
      />
      {selectedWish && <ApprovalModal isOpen={isApprovalModalOpen} onClose={() => setSelectedWish(null)} onDecision={handleApprovalDecision} wish={selectedWish} />}
    </div>
  );
}

export default WishesPage;