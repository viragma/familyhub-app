import React from 'react';

function CategoryNode({ category, onEdit, onDelete, onAddSub }) {
    return (
        <li>
            <div className="category-node">
                <div className="category-info">
                    <div className="category-color-swatch" style={{ backgroundColor: category.color || '#ccc' }}></div>
                    <span>{category.icon} {category.name}</span>
                </div>
                <div className="item-actions">
                    <button className="action-btn-icon" title="Alkategória hozzáadása" onClick={() => onAddSub(category.id)}>➕</button>
                    <button className="action-btn-icon" title="Szerkesztés" onClick={() => onEdit(category)}>✏️</button>
                    <button className="action-btn-icon" title="Törlés" onClick={() => onDelete(category.id)}>🗑️</button>
                </div>
            </div>
            {/* Az alkategóriák rekurzív megjelenítése */}
            {category.children && category.children.length > 0 && (
                <ul>
                    {category.children.map(child => (
                        <CategoryNode key={child.id} category={child} onEdit={onEdit} onDelete={onDelete} onAddSub={onAddSub} />
                    ))}
                </ul>
            )}
        </li>
    );
}

export default CategoryNode;