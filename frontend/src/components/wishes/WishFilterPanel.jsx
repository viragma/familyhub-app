import React from 'react';
import { SlidersHorizontal } from 'lucide-react';

function WishFilterPanel({ filters, onFilterChange, familyMembers, categories }) {
  const handleCheckboxChange = (group, value) => {
    const currentValues = filters[group] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    onFilterChange(group, newValues);
  };

  return (
    <div className="filter-panel">
      <h3 className="filter-title"><SlidersHorizontal size={18} /> Szűrők</h3>
      
      <div className="filter-group">
        <h4>Státusz</h4>
        {['draft', 'pending', 'approved', 'rejected', 'completed'].map(status => (
          <label key={status} className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={(filters.statuses || []).includes(status)} 
              onChange={() => handleCheckboxChange('statuses', status)}
            />
            {status}
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h4>Tulajdonos</h4>
        {familyMembers.map(member => (
          <label key={member.id} className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={(filters.owner_ids || []).includes(member.id)} 
              onChange={() => handleCheckboxChange('owner_ids', member.id)}
            />
            {member.display_name}
          </label>
        ))}
      </div>

      <div className="filter-group">
        <h4>Kategória</h4>
        {categories.map(cat => (
          <label key={cat.id} className="filter-checkbox">
            <input 
              type="checkbox" 
              checked={(filters.category_ids || []).includes(cat.id)}
              onChange={() => handleCheckboxChange('category_ids', cat.id)}
            />
            {cat.name}
          </label>
        ))}
      </div>
    </div>
  );
}

export default WishFilterPanel;