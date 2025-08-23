import React, { useState } from 'react';

function CategoryCard({ category, onEdit, onDelete, onAddSub }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const cardStyle = {
    borderColor: category.color || 'var(--border)',
    boxShadow: isHovered ? `0 10px 15px color-mix(in srgb, ${category.color || '#000'} 20%, transparent)` : 'var(--shadow-md)'
  };

  return (
    <div 
      className={`category-card ${isExpanded ? 'expanded' : ''}`}
      style={cardStyle}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="category-card-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="category-card-icon">
          {category.icon || '📁'}
        </div>
        <div className="category-card-title">{category.name}</div>
        <div className="category-card-meta">
          {category.children.length} alkategória
        </div>
        
        <div className="category-card-actions" onClick={e => e.stopPropagation()}>
          <button className="action-btn-icon" title="Szerkesztés" onClick={() => onEdit(category)}>✏️</button>
          <button className="action-btn-icon" title="Törlés" onClick={() => onDelete(category.id)}>🗑️</button>
        </div>
      </div>

      {category.children.length > 0 && (
        <div className="subcategory-list">
          {category.children.map(child => (
            <div className="subcategory-item" key={child.id}>
              <span>{child.icon} {child.name}</span>
              <div className="item-actions">
                <button className="action-btn-icon" title="Szerkesztés" onClick={() => onEdit(child)}>✏️</button>
                <button className="action-btn-icon" title="Törlés" onClick={() => onDelete(child.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="subcategory-list" style={{paddingTop: category.children.length > 0 ? '0' : '1rem'}}>
          <button className="btn btn-secondary" style={{width: '100%'}} onClick={() => onAddSub(category.id)}>
              + Új alkategória
          </button>
      </div>

    </div>
  );
}

export default CategoryCard;