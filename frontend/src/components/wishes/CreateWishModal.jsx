import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Camera, Link as LinkIcon, XCircle, Save, Send } from 'lucide-react';
import UniversalModal, { ModalSection, ModalActions } from '../universal/UniversalModal';
import FormField, { TextField, TextareaField, NumberField, SelectField, DateField, FileField } from '../universal/FormField';
import { useFormValidation, createSchema, validationRules } from '../universal/ValidationEngine';

const wishSchema = createSchema()
  .field('name', validationRules.required, validationRules.minLength(2))
  .field('estimated_price', validationRules.number, validationRules.min(0));

function CreateWishModal({ isOpen, onClose, onSave, wishToEdit = null }) {
  const [categories, setCategories] = useState([]);
  const [images, setImages] = useState([]);
  const [links, setLinks] = useState([]);
  const [currentLink, setCurrentLink] = useState({ url: '', title: '' });
  const { token, apiUrl } = useAuth();

  const { values, getFieldProps, handleSubmit, setValues, reset, isSubmitting } = useFormValidation({
    name: '', description: '', estimated_price: '', priority: 'medium', category_id: '', deadline: ''
  }, wishSchema);

  useEffect(() => {
    const fetchCategories = async () => {
      if (isOpen && token) {
        try {
          const response = await fetch(`${apiUrl}/api/categories/tree`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            setCategories(await response.json());
          }
        } catch (error) { 
          console.error("Error fetching categories:", error); 
        }
      }
    };
    
    fetchCategories();

    if (isOpen && wishToEdit) {
      setValues({
        name: wishToEdit.name || '',
        description: wishToEdit.description || '',
        estimated_price: wishToEdit.estimated_price || '',
        priority: wishToEdit.priority || 'medium',
        category_id: wishToEdit.category_id || '',
        deadline: wishToEdit.deadline ? wishToEdit.deadline.split('T')[0] : ''
      });
    } else if (isOpen) {
      reset();
      setImages([]);
      setLinks([]);
      setCurrentLink({ url: '', title: '' });
    }
  }, [isOpen, wishToEdit, token, apiUrl, setValues, reset]);
  
  const handleImageChange = (files) => {
    if (files && files.length > 0) {
      Array.from(files).forEach(file => {
        if (file.size > 5 * 1024 * 1024) {
          alert("A kép mérete nem haladhatja meg az 5MB-ot!");
          return;
        }
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
          alert("Csak .jpg, .png vagy .webp formátumú képet tölthetsz fel!");
          return;
        }
        
        const reader = new FileReader();
        reader.onload = () => {
          setImages(prev => [...prev, { file, preview: reader.result }]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const addLink = () => {
    if (currentLink.url && currentLink.title) {
      setLinks(prev => [...prev, currentLink]);
      setCurrentLink({ url: '', title: '' });
    }
  };

  const removeLink = (index) => {
    setLinks(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (formData) => {
    const wishData = {
      ...formData,
      estimated_price: formData.estimated_price ? parseFloat(formData.estimated_price) : null,
      category_id: formData.category_id ? parseInt(formData.category_id) : null,
      images: images.map(img => img.file),
      links: links
    };
    
    await onSave(wishData);
    onClose();
  };

  const priorityOptions = [
    { value: 'low', label: 'Alacsony' },
    { value: 'medium', label: 'Közepes' },
    { value: 'high', label: 'Magas' },
    { value: 'urgent', label: 'Sürgős' }
  ];

  const categoryOptions = categories
    .filter(cat => !cat.parent_id)
    .map(cat => ({ value: cat.id.toString(), label: cat.name }));

  return (
    <UniversalModal
      isOpen={isOpen}
      onClose={onClose}
      title={wishToEdit ? 'Kívánság Szerkesztése' : 'Új Kívánság'}
      size="large"
      loading={isSubmitting}
    >
      <ModalSection title="🎯 Alapadatok" icon="🎯">
        <TextField {...getFieldProps('name')} label="Kívánság neve" placeholder="Pl. Új laptop" required />
        <TextareaField {...getFieldProps('description')} label="Leírás" placeholder="Részletes leírás..." rows={4} />
        <NumberField {...getFieldProps('estimated_price')} label="Becsült ár (Ft)" min={0} step={100} />
        <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <SelectField {...getFieldProps('priority')} label="Prioritás" options={priorityOptions} />
          <SelectField {...getFieldProps('category_id')} label="Kategória" options={[{ value: '', label: 'Nincs kategória' }, ...categoryOptions]} />
        </div>
        <DateField {...getFieldProps('deadline')} label="Határidő (opcionális)" />
      </ModalSection>

      <ModalSection title="📷 Képek" icon="📷">
        <FileField
          label="Képek feltöltése"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={handleImageChange}
        />
        {images.length > 0 && (
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '1rem', marginTop: '1rem'}}>
            {images.map((img, index) => (
              <div key={index} style={{position: 'relative', borderRadius: '8px', overflow: 'hidden'}}>
                <img src={img.preview} alt="Preview" style={{width: '100%', height: '120px', objectFit: 'cover'}} />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  style={{position: 'absolute', top: '0.25rem', right: '0.25rem', background: 'rgba(0,0,0,0.7)', border: 'none', borderRadius: '50%', padding: '0.25rem', cursor: 'pointer'}}
                >
                  <XCircle size={16} color="white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </ModalSection>

      <ModalSection title="🔗 Linkek" icon="🔗">
        <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr auto', gap: '0.5rem', alignItems: 'end'}}>
          <TextField
            label="URL"
            value={currentLink.url}
            onChange={(e) => setCurrentLink(prev => ({ ...prev, url: e.target.value }))}
            placeholder="https://..."
          />
          <TextField
            label="Cím"
            value={currentLink.title}
            onChange={(e) => setCurrentLink(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Link címe"
          />
          <button type="button" className="btn btn-primary" onClick={addLink} disabled={!currentLink.url || !currentLink.title}>
            <LinkIcon size={16} /> Hozzáadás
          </button>
        </div>
        {links.length > 0 && (
          <div style={{marginTop: '1rem'}}>
            {links.map((link, index) => (
              <div key={index} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', background: 'var(--surface-secondary)', borderRadius: '8px', marginBottom: '0.5rem'}}>
                <div>
                  <div style={{fontWeight: '600'}}>{link.title}</div>
                  <div style={{fontSize: '0.9rem', color: 'var(--text-secondary)'}}>{link.url}</div>
                </div>
                <button type="button" onClick={() => removeLink(index)} style={{background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer'}}>
                  <XCircle size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </ModalSection>

      <ModalActions align="space-between">
        <button type="button" className="btn btn-secondary" onClick={onClose}>Mégse</button>
        <button type="button" className="btn btn-primary" onClick={() => handleSubmit(onSubmit)}>
          <Save size={16} /> {wishToEdit ? 'Frissítés' : 'Mentés'}
        </button>
      </ModalActions>
    </UniversalModal>
  );
}

export default CreateWishModal;