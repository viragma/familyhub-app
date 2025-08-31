import React, { useState, useEffect } from 'react';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';
import './WishFilterPanel.css';

function WishFilterPanel({ filters, onFilterChange, familyMembers, categories }) {
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const checkSize = () => {
      setIsExpanded(window.innerWidth > 1024);
    };
    checkSize();
    window.addEventListener('resize', checkSize);
    return () => window.removeEventListener('resize', checkSize);
  }, []);

  const handleOptionClick = (group, value) => {
    const currentValues = filters[group] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(group, newValues);
  };

  const clearFilterGroup = (group) => {
    onFilterChange(group, []);
  };

  const renderOptions = (group, options, valueKey, labelKey) => (
    <div className="filter-options-grid">
      {options.map(option => {
        const value = option[valueKey];
        const isActive = (filters[group] || []).includes(value);
        return (
          <div
            key={value}
            className={`filter-option ${isActive ? 'active' : ''}`}
            onClick={() => handleOptionClick(group, value)}
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

  return (
    <div className={`filter-panel ${isExpanded ? 'expanded' : ''}`}>
      <div className="filter-header" onClick={() => setIsExpanded(!isExpanded)}>
        <h3 className="filter-title">
          <SlidersHorizontal size={20} />
          <span>Szűrők</span>
        </h3>
        <ChevronDown className={`toggle-icon ${isExpanded ? 'expanded' : ''}`} />
      </div>
      
      <div className="filter-content">
        <div className="filter-group">
          <div className="filter-group-header">
            <h4>Státusz</h4>
            {(filters.statuses || []).length > 0 && (
              <button className="filter-clear-btn" onClick={() => clearFilterGroup('statuses')}>Törlés</button>
            )}
          </div>
          {renderOptions('statuses', statusOptions, 'value', 'label')}
        </div>

        <div className="filter-group">
          <div className="filter-group-header">
            <h4>Tulajdonos</h4>
            {(filters.owner_ids || []).length > 0 && (
              <button className="filter-clear-btn" onClick={() => clearFilterGroup('owner_ids')}>Törlés</button>
            )}
          </div>
          {renderOptions('owner_ids', familyMembers, 'id', 'display_name')}
        </div>

        <div className="filter-group">
          <div className="filter-group-header">
            <h4>Kategória</h4>
            {(filters.category_ids || []).length > 0 && (
              <button className="filter-clear-btn" onClick={() => clearFilterGroup('category_ids')}>Törlés</button>
            )}
          </div>
          {renderOptions('category_ids', categories, 'id', 'name')}
        </div>
      </div>
    </div>
  );
}

export default WishFilterPanel;