import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, Link as LinkIcon, XCircle } from 'lucide-react';

function CreateWishModal({ isOpen, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimated_price: '',
    priority: 'medium',
    category_id: '',
    deadline: ''
  });
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]); // Képek (base64) tárolása
  const [links, setLinks] = useState([]); // Linkek tárolása
  const [currentLink, setCurrentLink] = useState({ url: '', title: '' });

  const { token, apiUrl } = useAuth();

  useEffect(() => {
    const fetchCategories = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/categories/tree`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          setCategories(await response.json());
        } catch (error) { console.error("Hiba a kategóriák lekérésekor:", error); }
      }
    };
    fetchCategories();
    // Reset state on open
    if (isOpen) {
        setFormData({ name: '', description: '', estimated_price: '', priority: 'medium', category_id: '', deadline: '' });
        setImages([]);
        setLinks([]);
        setCurrentLink({ url: '', title: '' });
    }
  }, [isOpen, token, apiUrl]);
  
  const handleImageChange = (e) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      files.forEach(file => {
        // Validáció (max 5MB, kép formátum)
        if (file.size > 5 * 1024 * 1024) {
          alert("A kép mérete nem haladhatja meg az 5MB-ot!");
          return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            alert("Csak .jpg, .png vagy .webp formátumú képet tölthetsz fel!");
            return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          setImages(prev => [...prev, reader.result]);
        };
        reader.readAsDataURL(file);
      });
    }
  };
  
  const removeImage = (index) => {
      setImages(prev => prev.filter((_, i) => i !== index));
  };
  
  const handleAddLink = () => {
      if (currentLink.url) {
          setLinks(prev => [...prev, currentLink]);
          setCurrentLink({ url: '', title: '' });
      }
  };
  
  const removeLink = (index) => {
      setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = () => {
      if (!formData.name || !formData.estimated_price) {
          alert("A név és a becsült ár megadása kötelező!");
          return;
      }
      
      const dataToSend = {
          ...formData,
          // Javítás: Ha a category_id üres string, null-t küldünk
          category_id: formData.category_id ? parseInt(formData.category_id, 10) : null,
          
          // Javítás: Ha a deadline üres string, null-t küldünk
          deadline: formData.deadline || null,
          
          // Az ár string-ként marad, ez helyes
          estimated_price: formData.estimated_price,
          
          images: images,
          links: links
      };
      onSave(dataToSend);
  }

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2 className="modal-title">Új Kívánság</h2>
          <button onClick={onClose} className="modal-close-btn">&times;</button>
        </div>
        
        {/* ... (A felső form mezők változatlanok) ... */}
        <div className="form-group">
          <label className="form-label">Mit szeretnél? *</label>
          <input type="text" name="name" className="form-input" onChange={handleChange} value={formData.name} />
        </div>
        <div className="form-group">
            <label className="form-label">Miért szeretnéd?</label>
            <textarea name="description" className="form-input" onChange={handleChange} value={formData.description} rows="3"></textarea>
        </div>
        <div className="form-group">
            <label className="form-label">Becsült ár (Ft) *</label>
            <input type="number" name="estimated_price" className="form-input" onChange={handleChange} value={formData.estimated_price} />
        </div>
         <div className="form-group">
            <label className="form-label">Kategória</label>
            <select className="form-input" name="category_id" value={formData.category_id} onChange={handleChange}>
                <option value="">Nincs kategória</option>
                {categories.map(cat => (
                <optgroup label={cat.name} key={cat.id}>
                    <option value={cat.id}>{cat.name} (Főkategória)</option>
                    {cat.children.map(child => (
                    <option key={child.id} value={child.id}>&nbsp;&nbsp;{child.name}</option>
                    ))}
                </optgroup>
                ))}
            </select>
        </div>
        
        {/* --- ÚJ SZEKCIÓ: Képek --- */}
        <div className="form-group">
            <label className="form-label">Képek</label>
            <div className="image-preview-area">
                {images.map((imgSrc, index) => (
                    <div key={index} className="image-preview">
                        <img src={imgSrc} alt={`preview ${index}`} />
                        <button onClick={() => removeImage(index)} className="remove-btn"><XCircle size={18} /></button>
                    </div>
                ))}
            </div>
            <label htmlFor="image-upload" className="media-btn">
                <Camera size={16} /> Kép hozzáadása
            </label>
            <input id="image-upload" type="file" multiple accept="image/png, image/jpeg, image/webp" onChange={handleImageChange} style={{ display: 'none' }} />
        </div>

        {/* --- ÚJ SZEKCIÓ: Linkek --- */}
        <div className="form-group">
            <label className="form-label">Linkek</label>
            <div className="links-list">
                {links.map((link, index) => (
                    <div key={index} className="link-item">
                        <LinkIcon size={16} />
                        <a href={link.url} target="_blank" rel="noopener noreferrer">{link.title || link.url}</a>
                        <button onClick={() => removeLink(index)} className="remove-btn"><XCircle size={18} /></button>
                    </div>
                ))}
            </div>
            <div className="add-link-form">
                <input type="text" className="form-input" placeholder="Link címe (opcionális)" value={currentLink.title} onChange={e => setCurrentLink({...currentLink, title: e.target.value})} />
                <input type="url" className="form-input" placeholder="https://..." value={currentLink.url} onChange={e => setCurrentLink({...currentLink, url: e.target.value})} />
                <button className="btn btn-secondary" onClick={handleAddLink}>+</button>
            </div>
        </div>
        
        <div className="modal-actions">
            <button onClick={onClose} className="btn btn-secondary">Mégse</button>
            <button onClick={handleSave} className="btn btn-primary">Mentés</button>
        </div>
      </div>
    </div>
  );
}

export default CreateWishModal;