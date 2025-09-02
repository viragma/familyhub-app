import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Heart, Users, Clock, Target, Plus, SlidersHorizontal } from 'lucide-react';
import WishCard from '../components/wishes/WishCard';
import CreateWishModal from '../components/wishes/CreateWishModal';
import ApprovalModal from '../components/wishes/ApprovalModal';
import WishHistoryLog from '../components/wishes/WishHistoryLog';
import AssignGoalModal from '../components/wishes/AssignGoalModal'; // ÚJ, SZÜKSÉGES IMPORT

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
  const [showFilters, setShowFilters] = useState(false);

  // --- ÚJ STATE VÁLTOZÓK AZ ÚJ MODALHOZ ---
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedWishForAssign, setSelectedWishForAssign] = useState(null);
  // ------------------------------------------

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

  const handleFilterOptionClick = (group, value) => {
    const currentValues = panelFilters[group] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    handlePanelFilterChange(group, newValues);
  };

  const clearFilterGroup = (group) => {
    handlePanelFilterChange(group, []);
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

  // --- AZ ÚJ MODAL MEGNITÁSÁÉRT FELELŐS FÜGGVÉNY ---
  // lecseréli a régi handleActivateWish-t
  const handleOpenAssignModal = (wish) => {
    setSelectedWishForAssign(wish);
    setIsAssignModalOpen(true);
  };

  // --- AZ ÚJ MODAL BEZÁRÁSÁÉRT ÉS FRISSÍTÉSÉÉRT FELELŐS FÜGGVÉNY ---
  const handleAssignmentSuccess = () => {
    setIsAssignModalOpen(false);
    setSelectedWishForAssign(null);
    fetchWishes();
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

  const renderFilterOptions = (group, options, valueKey, labelKey) => (
    <div className="filter-options-grid">
      {options.map(option => {
        const value = option[valueKey];
        const isActive = (panelFilters[group] || []).includes(value);
        return (
          <div
            key={value}
            className={`filter-option ${isActive ? 'active' : ''}`}
            onClick={() => handleFilterOptionClick(group, value)}
          >
            {option[labelKey]}
          </div>
        );
      })}
    </div>
  );

  const statusOptions = [
    { value: 'draft', label: 'Vázlat' },
    { value: 'pending', label: 'Jóváhagyásra vár' },
    { value: 'approved', label: 'Jóváhagyva' },
    { value: 'rejected', label: 'Elutasítva' },
    { value: 'completed', label: 'Teljesítve' },
  ];

  const tabs = [
    { id: 'my-wishes', label: 'Saját kívánságaim', icon: Heart },
    { id: 'family-wishes', label: 'Családi kívánságok', icon: Users },
    { id: 'pending', label: 'Jóváhagyásra vár', icon: Clock },
    { id: 'history', label: 'Előzmények', icon: Target }
  ];

  return (
    <div className="wishes-page">
      {/* Header (VÁLTOZATLAN) */}
      <div className="header">
        <div className="greeting-section">
          <h1 className="greeting">Kívánságok 🎁</h1>
          <p className="date">Tervezzük meg közösen az álmokat!</p>
        </div>
        <button 
          onClick={() => { setWishToEdit(null); setIsCreateModalOpen(true); }} 
          className="btn btn-primary"
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={20} />
          Új Kívánság
        </button>
      </div>
      
      {/* Tabs (VÁLTOZATLAN) */}
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

      {/* Integrated Filters (VÁLTOZATLAN) */}
      <div className="wishes-filters">
        <div className="filters-header">
          <button 
            className="filters-toggle" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal size={18} />
            <span>Szűrők</span>
            <span className={`toggle-arrow ${showFilters ? 'open' : ''}`}>▼</span>
          </button>
          
          {Object.values(panelFilters).some(arr => arr?.length > 0) && (
            <div className="active-filters-count">
              {Object.values(panelFilters).reduce((sum, arr) => sum + (arr?.length || 0), 0)} aktív
            </div>
          )}
        </div>

        {showFilters && (
          <div className="filters-content">
            {/* Filter Groups... */}
            <div className="filter-group">
              <div className="filter-group-header">
                <h4>Státusz</h4>
                {(panelFilters.statuses || []).length > 0 && (
                  <button 
                    className="filter-clear-btn" 
                    onClick={() => clearFilterGroup('statuses')}
                  >
                    Törlés
                  </button>
                )}
              </div>
              {renderFilterOptions('statuses', statusOptions, 'value', 'label')}
            </div>
            <div className="filter-group">
              <div className="filter-group-header">
                <h4>Tulajdonos</h4>
                {(panelFilters.owner_ids || []).length > 0 && (
                  <button 
                    className="filter-clear-btn" 
                    onClick={() => clearFilterGroup('owner_ids')}
                  >
                    Törlés
                  </button>
                )}
              </div>
              {renderFilterOptions('owner_ids', familyMembers, 'id', 'display_name')}
            </div>
            <div className="filter-group">
              <div className="filter-group-header">
                <h4>Kategória</h4>
                {(panelFilters.category_ids || []).length > 0 && (
                  <button 
                    className="filter-clear-btn" 
                    onClick={() => clearFilterGroup('category_ids')}
                  >
                    Törlés
                  </button>
                )}
              </div>
              {renderFilterOptions('category_ids', categories, 'id', 'name')}
            </div>
          </div>
        )}
      </div>
      
      {/* Content */}
      <div className="wishes-content">
        {loading ? (
          <p>Kívánságok betöltése...</p>
        ) : (
          <div className="wishes-grid">
            {allWishes.length > 0 ? (
              allWishes.map(wish => (
                <WishCard 
                  key={wish.id} 
                  wish={wish} 
                  currentUser={user}
                  onSubmit={handleSubmitWish}
                  onApproveClick={openApprovalModal}
                  onEditClick={openEditModal}
                  onHistoryClick={handleHistoryClick}
                  onActivate={handleOpenAssignModal} // EZ A MÓDOSÍTÁS KÖTI BE AZ ÚJ MODALT
                />
              ))
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🎁</div>
                <h3 className="empty-state-title">Nincsenek kívánságok</h3>
                <p className="empty-state-message">
                  Nincsenek a feltételeknek megfelelő kívánságok.
                </p>
              </div>
            )}
          </div>
        )}
        
        {historyData && (
          <WishHistoryLog 
            history={historyData} 
            onClose={() => setHistoryData(null)} 
          />
        )}
      </div>

      {/* Modals */}
      <CreateWishModal 
        isOpen={isCreateModalOpen} 
        onClose={() => { 
          setIsCreateModalOpen(false); 
          setWishToEdit(null); 
        }} 
        onSave={handleSaveWish}
        wishToEdit={wishToEdit}
      />
      
      {selectedWish && (
        <ApprovalModal 
          isOpen={isApprovalModalOpen} 
          onClose={() => {
            setIsApprovalModalOpen(false);
            setSelectedWish(null);
          }} 
          onDecision={handleApprovalDecision} 
          wish={selectedWish} 
        />
      )}

      {/* --- AZ ÚJ MODAL BEILLESZTÉSE A MEGLÉVŐ STÍLUSHOZ IGAZÍTVA --- */}
      {selectedWishForAssign && (
          <AssignGoalModal
              isOpen={isAssignModalOpen}
              onClose={() => setIsAssignModalOpen(false)}
              wish={selectedWishForAssign}
              onAssignmentSuccess={handleAssignmentSuccess}
          />
      )}
      {/* ----------------------------------------------------------------- */}
    </div>
  );
}

export default WishesPage;