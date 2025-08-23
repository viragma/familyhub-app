import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import CategoryModal from '../components/CategoryModal';
import CategoryCard from '../components/CategoryCard';

function CategoryManagementPage() {
    const [categories, setCategories] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);
    const [parentCategoryId, setParentCategoryId] = useState(null);
    const { token } = useAuth();
    const apiUrl = import.meta.env.VITE_API_BASE_URL;

    const fetchCategories = useCallback(async () => {
        if (!token) return;
        try {
            const response = await fetch(`${apiUrl}/api/categories`, { 
                headers: { 'Authorization': `Bearer ${token}` } 
            });
            const data = await response.json();
            setCategories(data);
        } catch (error) { 
            console.error("Hiba a kategóriák lekérésekor:", error); 
        }
    }, [token, apiUrl]);

    useEffect(() => { 
        fetchCategories(); 
    }, [fetchCategories]);

    const openModal = (category = null, parentId = null) => {
        setEditingCategory(category);
        setParentCategoryId(parentId);
        setIsModalOpen(true);
    };

    const handleSaveCategory = async (categoryData) => {
        const method = editingCategory ? 'PUT' : 'POST';
        const endpoint = editingCategory
            ? `${apiUrl}/api/categories/${editingCategory.id}`
            : `${apiUrl}/api/categories`;

        try {
            const response = await fetch(endpoint, {
                method,
                headers: { 
                    'Content-Type': 'application/json', 
                    'Authorization': `Bearer ${token}` 
                },
                body: JSON.stringify(categoryData),
            });
            if (response.ok) {
                setIsModalOpen(false);
                fetchCategories();
            } else { 
                alert('Hiba a mentés során!'); 
            }
        } catch (error) { 
            console.error("Hiba a kategória mentésekor:", error); 
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        if (!window.confirm("Biztosan törölni szeretnéd ezt a kategóriát? A hozzá tartozó tranzakciók kategória nélkül maradnak.")) return;
        try {
            const response = await fetch(`${apiUrl}/api/categories/${categoryId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` },
            });
            if (response.ok) {
                fetchCategories();
            } else { 
                alert('Hiba a törlés során!'); 
            }
        } catch (error) { 
            console.error("Hiba a kategória törlésekor:", error); 
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Kategóriák Kezelése</h1>
                <button className="btn btn-primary" onClick={() => openModal()}>Új Főkategória</button>
            </div>
            
            <div className="category-grid">
                {categories.map(cat => (
                    <CategoryCard 
                        key={cat.id} 
                        category={cat} 
                        onEdit={openModal}
                        onDelete={handleDeleteCategory}
                        onAddSub={(parentId) => openModal(null, parentId)}
                    />
                ))}
            </div>

            {categories.length === 0 && (
                <p>Még nincsenek kategóriák. Hozz létre egyet!</p>
            )}

            <CategoryModal 
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSaveCategory}
                categoryData={editingCategory}
                parentId={parentCategoryId}
            />
        </div>
    );
}

export default CategoryManagementPage;