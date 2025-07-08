import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import './App.css';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

// Auth Provider
const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, { username, password });
      const { token } = response.data;
      localStorage.setItem('token', token);
      setToken(token);
      setIsAuthenticated(true);
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      return { success: true };
    } catch (error) {
      return { success: false, error: error.response?.data?.detail || 'Login failed' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setIsAuthenticated(false);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook para usar el contexto de auth
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Cursor personalizado mejorado - ELIMINADO por problemas

// Componente de Login
const LoginModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await login(username, password);
    setIsLoading(false);
    if (result.success) {
      onClose();
      setUsername('');
      setPassword('');
      setError('');
    } else {
      setError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content login-modal">
        <h2 className="modal-title">Panel de Administración</h2>
        {error && <div className="error-message">{error}</div>}
        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label>Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              required
              disabled={isLoading}
            />
          </div>
          <div className="form-actions">
            <button
              type="submit"
              className={`btn-primary ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? 'Accediendo...' : 'Acceder'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
              disabled={isLoading}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Editor de Imágenes FUNCIONAL
const ImageEditor = ({ imageBase64, onSave, onClose, itemId, collectionId }) => {
  const [editedImage, setEditedImage] = useState(imageBase64);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [isSaving, setIsSaving] = useState(false);

  const applyFilters = () => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    };
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Crear canvas para aplicar los filtros a la imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Aplicar filtros
        ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        ctx.drawImage(img, 0, 0);
        
        // Convertir a base64
        const filteredImageBase64 = canvas.toDataURL('image/jpeg', 0.9);
        
        // Guardar en el backend
        await axios.post(`${API}/save-edited-image`, {
          item_id: itemId,
          collection_id: collectionId,
          image_base64: filteredImageBase64
        });
        
        // Callback para actualizar la UI
        onSave(filteredImageBase64, { brightness, contrast, saturation });
        
        alert('Imagen guardada exitosamente');
        onClose();
      };
      
      img.src = editedImage;
    } catch (error) {
      console.error('Error saving image:', error);
      alert('Error al guardar la imagen');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content image-editor-modal">
        <h2 className="modal-title">Editor de Imagen</h2>
        
        <div className="image-editor-content">
          <div className="image-preview-section">
            <img
              src={editedImage}
              alt="Preview"
              style={applyFilters()}
              className="image-preview-large"
            />
          </div>
          
          <div className="controls-section">
            <div className="control-group">
              <label className="control-label">Brillo: {brightness}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="range-slider"
              />
            </div>
            
            <div className="control-group">
              <label className="control-label">Contraste: {contrast}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
                className="range-slider"
              />
            </div>
            
            <div className="control-group">
              <label className="control-label">Saturación: {saturation}%</label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(e.target.value)}
                className="range-slider"
              />
            </div>
          </div>
        </div>
        
        <div className="form-actions">
          <button
            onClick={handleSave}
            className={`btn-primary ${isSaving ? 'loading' : ''}`}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isSaving}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

// Panel de Administración Completo y Expandido
const AdminPanel = ({ isOpen, onClose, siteConfig, onConfigUpdate, collections, onCollectionsUpdate, jewelryItems, onJewelryUpdate }) => {
  const [activeTab, setActiveTab] = useState('general');
  const [editConfig, setEditConfig] = useState({});
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingJewelry, setEditingJewelry] = useState(null);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', image_base64: '', position: 0 });
  const [newJewelry, setNewJewelry] = useState({ name: '', description: '', image_base64: '', collection_id: '', position: 0 });
  const [isSaving, setIsSaving] = useState(false);

  // Inicializar editConfig cuando se abre el panel o cambia siteConfig
  useEffect(() => {
    console.log('Effect ejecutándose - siteConfig:', siteConfig, 'isOpen:', isOpen);
    if (isOpen && siteConfig && Object.keys(siteConfig).length > 0) {
      console.log('Inicializando editConfig con:', siteConfig);
      // Crear una copia profunda del siteConfig para evitar mutaciones
      const configCopy = { ...siteConfig };
      setEditConfig(configCopy);
      console.log('EditConfig inicializado con:', configCopy);
    } else if (isOpen && (!siteConfig || Object.keys(siteConfig).length === 0)) {
      console.log('SiteConfig vacío, inicializando editConfig con valores por defecto');
      setEditConfig({
        site_name: '',
        artisan_name: '',
        artisan_story: '',
        artisan_contact: '',
        site_subtitle: '',
        hero_title: '',
        hero_description: '',
        collections_title: '',
        collections_subtitle: '',
        footer_title_1: '',
        footer_title_2: '',
        footer_title_3: '',
        footer_text_3: '',
        footer_copyright: '',
        social_facebook: '',
        social_instagram: '',
        social_tiktok: '',
        social_whatsapp: '',
        social_youtube: '',
        social_twitter: '',
        social_facebook_enabled: false,
        social_instagram_enabled: false,
        social_tiktok_enabled: false,
        social_whatsapp_enabled: false,
        social_youtube_enabled: false,
        social_twitter_enabled: false,
        color_scheme: 'gold'
      });
    }
  }, [siteConfig, isOpen]);

  // Debug: Log editConfig changes
  useEffect(() => {
    console.log('editConfig actualizado:', editConfig);
    console.log('Claves en editConfig:', Object.keys(editConfig));
  }, [editConfig]);

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        callback(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveConfig = async () => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      console.log('Guardando configuración:', editConfig);
      const response = await axios.put(`${API}/config`, editConfig);
      console.log('Respuesta del servidor:', response.data);
      
      // Recargar la configuración desde el servidor
      await onConfigUpdate();
      alert('Configuración guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      console.error('Detalles del error:', error.response?.data);
      alert(`Error al guardar configuración: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const saveCollection = async (collection) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      console.log('Guardando colección:', collection);
      
      if (collection.id) {
        const response = await axios.put(`${API}/collections/${collection.id}`, collection);
        console.log('Colección actualizada:', response.data);
      } else {
        const response = await axios.post(`${API}/collections`, collection);
        console.log('Colección creada:', response.data);
      }
      
      await onCollectionsUpdate();
      setEditingCollection(null);
      setNewCollection({ name: '', description: '', image_base64: '', position: 0 });
      alert('Colección guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar colección:', error);
      alert(`Error al guardar colección: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCollection = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta colección y todas sus joyas?')) {
      try {
        console.log('Eliminando colección:', id);
        await axios.delete(`${API}/collections/${id}`);
        await onCollectionsUpdate();
        await onJewelryUpdate();
        alert('Colección eliminada exitosamente');
      } catch (error) {
        console.error('Error al eliminar colección:', error);
        alert(`Error al eliminar colección: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  const saveJewelry = async (jewelry) => {
    if (isSaving) return;
    setIsSaving(true);
    
    try {
      console.log('Guardando joya:', jewelry);
      
      if (jewelry.id) {
        const response = await axios.put(`${API}/jewelry-items/${jewelry.id}`, jewelry);
        console.log('Joya actualizada:', response.data);
      } else {
        const response = await axios.post(`${API}/jewelry-items`, jewelry);
        console.log('Joya creada:', response.data);
      }
      
      await onJewelryUpdate();
      setEditingJewelry(null);
      setNewJewelry({ name: '', description: '', image_base64: '', collection_id: '', position: 0 });
      alert('Joya guardada exitosamente');
    } catch (error) {
      console.error('Error al guardar joya:', error);
      alert(`Error al guardar joya: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const deleteJewelry = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta joya?')) {
      try {
        console.log('Eliminando joya:', id);
        await axios.delete(`${API}/jewelry-items/${id}`);
        await onJewelryUpdate();
        alert('Joya eliminada exitosamente');
      } catch (error) {
        console.error('Error al eliminar joya:', error);
        alert(`Error al eliminar joya: ${error.response?.data?.detail || error.message}`);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-content admin-panel">
        <div className="admin-header">
          <h2>Panel de Administración</h2>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="admin-tabs">
          <button 
            className={`tab ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            General
          </button>
          <button 
            className={`tab ${activeTab === 'textos' ? 'active' : ''}`}
            onClick={() => setActiveTab('textos')}
          >
            Textos
          </button>
          <button 
            className={`tab ${activeTab === 'redes' ? 'active' : ''}`}
            onClick={() => setActiveTab('redes')}
          >
            Redes Sociales
          </button>
          <button 
            className={`tab ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            Colecciones
          </button>
          <button 
            className={`tab ${activeTab === 'jewelry' ? 'active' : ''}`}
            onClick={() => setActiveTab('jewelry')}
          >
            Joyas
          </button>
        </div>

        <div className="admin-content">
          {activeTab === 'general' && (
            <div className="config-panel">
              <h3>Configuración General</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Nombre del Sitio</label>
                  <input
                    type="text"
                    value={editConfig.site_name || ''}
                    onChange={(e) => setEditConfig({...editConfig, site_name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Nombre de la Artesana</label>
                  <input
                    type="text"
                    value={editConfig.artisan_name || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_name: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Historia de la Artesana</label>
                  <textarea
                    value={editConfig.artisan_story || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_story: e.target.value})}
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                <div className="form-group">
                  <label>Email de Contacto</label>
                  <input
                    type="email"
                    value={editConfig.artisan_contact || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_contact: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={editConfig.artisan_phone || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_phone: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Dirección</label>
                  <input
                    type="text"
                    value={editConfig.artisan_address || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_address: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Esquema de Color</label>
                  <select
                    value={editConfig.color_scheme || 'gold'}
                    onChange={(e) => setEditConfig({...editConfig, color_scheme: e.target.value})}
                    className="form-select"
                  >
                    <option value="gold">Dorado</option>
                    <option value="silver">Plateado</option>
                    <option value="rose">Rosa</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Logo</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => setEditConfig({...editConfig, logo_base64: base64}))}
                    className="form-input"
                  />
                  {editConfig.logo_base64 && (
                    <img src={editConfig.logo_base64} alt="Logo preview" className="image-preview" />
                  )}
                </div>
              </div>
              <button onClick={saveConfig} className={`btn-primary ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Configuración General'}
              </button>
            </div>
          )}

          {activeTab === 'textos' && (
            <div className="config-panel">
              <h3>Personalización de Textos</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>Subtítulo del Sitio</label>
                  <input
                    type="text"
                    value={editConfig.site_subtitle || ''}
                    onChange={(e) => setEditConfig({...editConfig, site_subtitle: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Título del Hero</label>
                  <input
                    type="text"
                    value={editConfig.hero_title || ''}
                    onChange={(e) => setEditConfig({...editConfig, hero_title: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Descripción del Hero</label>
                  <textarea
                    value={editConfig.hero_description || ''}
                    onChange={(e) => setEditConfig({...editConfig, hero_description: e.target.value})}
                    className="form-textarea"
                    rows="3"
                  />
                </div>
                <div className="form-group">
                  <label>Título de Colecciones</label>
                  <input
                    type="text"
                    value={editConfig.collections_title || ''}
                    onChange={(e) => setEditConfig({...editConfig, collections_title: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Subtítulo de Colecciones</label>
                  <input
                    type="text"
                    value={editConfig.collections_subtitle || ''}
                    onChange={(e) => setEditConfig({...editConfig, collections_subtitle: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Título Footer 1</label>
                  <input
                    type="text"
                    value={editConfig.footer_title_1 || ''}
                    onChange={(e) => setEditConfig({...editConfig, footer_title_1: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Título Footer 2</label>
                  <input
                    type="text"
                    value={editConfig.footer_title_2 || ''}
                    onChange={(e) => setEditConfig({...editConfig, footer_title_2: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group">
                  <label>Título Footer 3</label>
                  <input
                    type="text"
                    value={editConfig.footer_title_3 || ''}
                    onChange={(e) => setEditConfig({...editConfig, footer_title_3: e.target.value})}
                    className="form-input"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Texto Footer 3</label>
                  <textarea
                    value={editConfig.footer_text_3 || ''}
                    onChange={(e) => setEditConfig({...editConfig, footer_text_3: e.target.value})}
                    className="form-textarea"
                    rows="2"
                  />
                </div>
                <div className="form-group full-width">
                  <label>Texto Copyright</label>
                  <input
                    type="text"
                    value={editConfig.footer_copyright || ''}
                    onChange={(e) => setEditConfig({...editConfig, footer_copyright: e.target.value})}
                    className="form-input"
                  />
                </div>
              </div>
              <button onClick={saveConfig} className={`btn-primary ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Textos Personalizados'}
              </button>
            </div>
          )}

          {activeTab === 'redes' && (
            <div className="config-panel">
              <h3>Redes Sociales</h3>
              <div className="form-grid">
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_facebook_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_facebook_enabled: e.target.checked})}
                    />
                    Facebook
                  </label>
                  <input
                    type="url"
                    placeholder="https://facebook.com/tupagina"
                    value={editConfig.social_facebook || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_facebook: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_facebook_enabled}
                  />
                </div>
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_instagram_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_instagram_enabled: e.target.checked})}
                    />
                    Instagram
                  </label>
                  <input
                    type="url"
                    placeholder="https://instagram.com/tuusuario"
                    value={editConfig.social_instagram || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_instagram: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_instagram_enabled}
                  />
                </div>
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_tiktok_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_tiktok_enabled: e.target.checked})}
                    />
                    TikTok
                  </label>
                  <input
                    type="url"
                    placeholder="https://tiktok.com/@tuusuario"
                    value={editConfig.social_tiktok || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_tiktok: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_tiktok_enabled}
                  />
                </div>
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_whatsapp_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_whatsapp_enabled: e.target.checked})}
                    />
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="+34600000000"
                    value={editConfig.social_whatsapp || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_whatsapp: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_whatsapp_enabled}
                  />
                </div>
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_youtube_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_youtube_enabled: e.target.checked})}
                    />
                    YouTube
                  </label>
                  <input
                    type="url"
                    placeholder="https://youtube.com/c/tucanal"
                    value={editConfig.social_youtube || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_youtube: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_youtube_enabled}
                  />
                </div>
                <div className="form-group social-group">
                  <label className="social-label">
                    <input
                      type="checkbox"
                      checked={editConfig.social_twitter_enabled || false}
                      onChange={(e) => setEditConfig({...editConfig, social_twitter_enabled: e.target.checked})}
                    />
                    Twitter/X
                  </label>
                  <input
                    type="url"
                    placeholder="https://twitter.com/tuusuario"
                    value={editConfig.social_twitter || ''}
                    onChange={(e) => setEditConfig({...editConfig, social_twitter: e.target.value})}
                    className="form-input"
                    disabled={!editConfig.social_twitter_enabled}
                  />
                </div>
              </div>
              <button onClick={saveConfig} className={`btn-primary ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                {isSaving ? 'Guardando...' : 'Guardar Redes Sociales'}
              </button>
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="collections-panel">
              <div className="panel-header">
                <h3>Gestión de Colecciones</h3>
                <button 
                  onClick={() => setEditingCollection({...newCollection})}
                  className="btn-primary"
                >
                  Nueva Colección
                </button>
              </div>
              
              <div className="collections-grid">
                {collections.map(collection => (
                  <div key={collection.id} className="collection-card-admin">
                    <img src={collection.image_base64} alt={collection.name} className="collection-image-admin" />
                    <div className="collection-info">
                      <h4>{collection.name}</h4>
                      <p>{collection.description}</p>
                      <div className="collection-actions">
                        <button 
                          onClick={() => setEditingCollection(collection)}
                          className="btn-secondary"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => deleteCollection(collection.id)}
                          className="btn-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {editingCollection && (
                <div className="edit-modal">
                  <div className="edit-content">
                    <h4>{editingCollection.id ? 'Editar Colección' : 'Nueva Colección'}</h4>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={editingCollection.name || ''}
                        onChange={(e) => setEditingCollection({...editingCollection, name: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Descripción</label>
                      <textarea
                        value={editingCollection.description || ''}
                        onChange={(e) => setEditingCollection({...editingCollection, description: e.target.value})}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Imagen</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, (base64) => setEditingCollection({...editingCollection, image_base64: base64}))}
                        className="form-input"
                      />
                      {editingCollection.image_base64 && (
                        <img src={editingCollection.image_base64} alt="Preview" className="image-preview" />
                      )}
                    </div>
                    <div className="form-actions">
                      <button onClick={() => saveCollection(editingCollection)} className="btn-primary">
                        Guardar
                      </button>
                      <button onClick={() => setEditingCollection(null)} className="btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'jewelry' && (
            <div className="jewelry-panel">
              <div className="panel-header">
                <h3>Gestión de Joyas</h3>
                <button 
                  onClick={() => setEditingJewelry({...newJewelry})}
                  className="btn-primary"
                >
                  Nueva Joya
                </button>
              </div>
              
              <div className="jewelry-grid">
                {jewelryItems.map(jewelry => (
                  <div key={jewelry.id} className="jewelry-card-admin">
                    <img src={jewelry.image_base64} alt={jewelry.name} className="jewelry-image-admin" />
                    <div className="jewelry-info">
                      <h4>{jewelry.name}</h4>
                      <p>{jewelry.description}</p>
                      <small>Colección: {collections.find(c => c.id === jewelry.collection_id)?.name}</small>
                      <div className="jewelry-actions">
                        <button 
                          onClick={() => setEditingJewelry(jewelry)}
                          className="btn-secondary"
                        >
                          Editar
                        </button>
                        <button 
                          onClick={() => deleteJewelry(jewelry.id)}
                          className="btn-danger"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {editingJewelry && (
                <div className="edit-modal">
                  <div className="edit-content">
                    <h4>{editingJewelry.id ? 'Editar Joya' : 'Nueva Joya'}</h4>
                    <div className="form-group">
                      <label>Nombre</label>
                      <input
                        type="text"
                        value={editingJewelry.name || ''}
                        onChange={(e) => setEditingJewelry({...editingJewelry, name: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label>Descripción</label>
                      <textarea
                        value={editingJewelry.description || ''}
                        onChange={(e) => setEditingJewelry({...editingJewelry, description: e.target.value})}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>
                    <div className="form-group">
                      <label>Colección</label>
                      <select
                        value={editingJewelry.collection_id || ''}
                        onChange={(e) => setEditingJewelry({...editingJewelry, collection_id: e.target.value})}
                        className="form-select"
                      >
                        <option value="">Seleccionar colección</option>
                        {collections.map(collection => (
                          <option key={collection.id} value={collection.id}>
                            {collection.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Imagen</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleImageUpload(e, (base64) => setEditingJewelry({...editingJewelry, image_base64: base64}))}
                        className="form-input"
                      />
                      {editingJewelry.image_base64 && (
                        <img src={editingJewelry.image_base64} alt="Preview" className="image-preview" />
                      )}
                    </div>
                    <div className="form-actions">
                      <button onClick={() => saveJewelry(editingJewelry)} className="btn-primary">
                        Guardar
                      </button>
                      <button onClick={() => setEditingJewelry(null)} className="btn-secondary">
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Scroll Reveal Component
const ScrollReveal = ({ children, direction = 'up', delay = 0 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef();

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setIsVisible(true), delay);
        }
      },
      { threshold: 0.1 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay]);

  return (
    <div
      ref={elementRef}
      className={`scroll-reveal ${isVisible ? 'visible' : ''} reveal-${direction}`}
      style={{ '--delay': `${delay}ms` }}
    >
      {children}
    </div>
  );
};

// Parallax Component
const ParallaxSection = ({ children, speed = 0.5, className = '' }) => {
  const [offsetY, setOffsetY] = useState(0);
  const elementRef = useRef();

  useEffect(() => {
    const handleScroll = () => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect();
        const scrolled = window.pageYOffset;
        const rate = scrolled * -speed;
        setOffsetY(rate);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [speed]);

  return (
    <div
      ref={elementRef}
      className={`parallax-section ${className}`}
      style={{ transform: `translateY(${offsetY}px)` }}
    >
      {children}
    </div>
  );
};

// Componente de Redes Sociales
const SocialLinks = ({ config }) => {
  const socialIcons = {
    facebook: '📘',
    instagram: '📷',
    tiktok: '🎵',
    whatsapp: '💬',
    youtube: '📺',
    twitter: '🐦'
  };

  const openSocialLink = (type, url) => {
    if (type === 'whatsapp') {
      window.open(`https://wa.me/${url.replace(/[^0-9]/g, '')}`, '_blank');
    } else {
      window.open(url, '_blank');
    }
  };

  return (
    <div className="social-links">
      {config.social_facebook_enabled && config.social_facebook && (
        <button 
          onClick={() => openSocialLink('facebook', config.social_facebook)}
          className="social-link facebook"
          title="Facebook"
        >
          {socialIcons.facebook}
        </button>
      )}
      {config.social_instagram_enabled && config.social_instagram && (
        <button 
          onClick={() => openSocialLink('instagram', config.social_instagram)}
          className="social-link instagram"
          title="Instagram"
        >
          {socialIcons.instagram}
        </button>
      )}
      {config.social_tiktok_enabled && config.social_tiktok && (
        <button 
          onClick={() => openSocialLink('tiktok', config.social_tiktok)}
          className="social-link tiktok"
          title="TikTok"
        >
          {socialIcons.tiktok}
        </button>
      )}
      {config.social_whatsapp_enabled && config.social_whatsapp && (
        <button 
          onClick={() => openSocialLink('whatsapp', config.social_whatsapp)}
          className="social-link whatsapp"
          title="WhatsApp"
        >
          {socialIcons.whatsapp}
        </button>
      )}
      {config.social_youtube_enabled && config.social_youtube && (
        <button 
          onClick={() => openSocialLink('youtube', config.social_youtube)}
          className="social-link youtube"
          title="YouTube"
        >
          {socialIcons.youtube}
        </button>
      )}
      {config.social_twitter_enabled && config.social_twitter && (
        <button 
          onClick={() => openSocialLink('twitter', config.social_twitter)}
          className="social-link twitter"
          title="Twitter"
        >
          {socialIcons.twitter}
        </button>
      )}
    </div>
  );
};

// Componente principal de la aplicación
const JewelryApp = () => {
  const [siteConfig, setSiteConfig] = useState(null);
  const [collections, setCollections] = useState([]);
  const [jewelryItems, setJewelryItems] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImage, setEditingImage] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHiddenZone, setShowHiddenZone] = useState(false);
  const [hiddenClicks, setHiddenClicks] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [scrollY, setScrollY] = useState(0);
  const [randomButtonPosition, setRandomButtonPosition] = useState('right'); // 'left' or 'right'
  const [selectedJewelryImage, setSelectedJewelryImage] = useState(null); // Para modal de imagen ampliada
  const { isAuthenticated, logout } = useAuth();

  // Color schemes
  const colorSchemes = {
    gold: {
      primary: 'from-amber-600 to-yellow-600',
      secondary: 'from-amber-100 to-yellow-100',
      accent: 'amber-600',
      text: 'amber-900',
      bg: 'amber-50'
    },
    silver: {
      primary: 'from-gray-600 to-slate-600',
      secondary: 'from-gray-100 to-slate-100',
      accent: 'gray-600',
      text: 'gray-900',
      bg: 'gray-50'
    },
    rose: {
      primary: 'from-rose-600 to-pink-600',
      secondary: 'from-rose-100 to-pink-100',
      accent: 'rose-600',
      text: 'rose-900',
      bg: 'rose-50'
    }
  };

  const currentScheme = colorSchemes[siteConfig?.color_scheme || 'gold'];

  // Scroll effects
  useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY;
      setScrollY(scrolled);
      setIsScrolled(scrolled > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hidden zone timer mejorado
  useEffect(() => {
    let timer;
    if (isTimerActive) {
      timer = setTimeout(() => {
        setShowHiddenZone(true);
        setIsTimerActive(false);
      }, 30000);
    }
    return () => clearTimeout(timer);
  }, [isTimerActive]);

  // Reset hidden zone después de mostrar el botón
  useEffect(() => {
    let resetTimer;
    if (showHiddenZone) {
      resetTimer = setTimeout(() => {
        setShowHiddenZone(false);
        setHiddenClicks(0);
        setIsTimerActive(false);
      }, 10000); // El botón desaparece después de 10 segundos
    }
    return () => clearTimeout(resetTimer);
  }, [showHiddenZone]);

  // Load initial data
  useEffect(() => {
    loadSiteConfig();
    loadCollections();
    loadJewelryItems();
    initDemoData();
  }, []);

  const loadSiteConfig = async () => {
    try {
      console.log('Cargando configuración del sitio...');
      const response = await axios.get(`${API}/config`);
      console.log('Configuración cargada:', response.data);
      setSiteConfig(response.data);
    } catch (error) {
      console.error('Error loading site config:', error);
    }
  };

  const loadCollections = async () => {
    try {
      const response = await axios.get(`${API}/collections`);
      setCollections(response.data);
    } catch (error) {
      console.error('Error loading collections:', error);
    }
  };

  const loadJewelryItems = async () => {
    try {
      const response = await axios.get(`${API}/jewelry-items`);
      setJewelryItems(response.data);
    } catch (error) {
      console.error('Error loading jewelry items:', error);
    }
  };

  const initDemoData = async () => {
    try {
      await axios.post(`${API}/init-demo-data`);
    } catch (error) {
      console.error('Error initializing demo data:', error);
    }
  };

  const getItemsByCollection = (collectionId) => {
    return jewelryItems.filter(item => item.collection_id === collectionId);
  };

  // Hidden zone handler mejorado - requiere 5 clics
  const handleHiddenZoneClick = () => {
    const newClickCount = hiddenClicks + 1;
    setHiddenClicks(newClickCount);
    
    if (newClickCount >= 5) {
      setIsTimerActive(true);
      setHiddenClicks(0); // Reset counter
      
      // Generar posición aleatoria para el botón (izquierda o derecha)
      const randomSide = Math.random() < 0.5 ? 'left' : 'right';
      setRandomButtonPosition(randomSide);
      
      // Feedback visual/haptic
      if (navigator.vibrate) {
        navigator.vibrate(200); // Vibración en móviles
      }
      
      // Mostrar notificación temporal
      const notification = document.createElement('div');
      notification.textContent = 'Acceso administrativo activado. Espera 30 segundos...';
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(212, 175, 55, 0.9);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-weight: 600;
        z-index: 9999;
        box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        animation: slideInRight 0.3s ease;
      `;
      
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (notification && notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 3000);
    } else {
      // Feedback sutil para clics restantes
      const remaining = 5 - newClickCount;
      console.log(`${remaining} clics restantes para activar admin`);
    }
  };

  const renderHiddenZone = () => {
    // Generar posiciones aleatorias para los laterales
    const randomHeight = Math.floor(Math.random() * 60) + 20; // Entre 20% y 80% de altura
    const leftPosition = {
      left: '20px',
      top: `${randomHeight}%`,
      transform: 'translateY(-50%)'
    };
    const rightPosition = {
      right: '20px', 
      top: `${randomHeight}%`,
      transform: 'translateY(-50%)'
    };
    
    const buttonPosition = randomButtonPosition === 'left' ? leftPosition : rightPosition;
    
    // Posición fija para el área de clics (siempre esquina inferior derecha)
    const clickZonePosition = 'bottom-4 right-4';

    return (
      <>
        {/* Zona invisible para activar (5 clics) - siempre en esquina inferior derecha */}
        <div
          className={`fixed ${clickZonePosition} w-16 h-16 cursor-pointer z-40`}
          onClick={handleHiddenZoneClick}
          onTouchEnd={handleHiddenZoneClick} // Soporte para móviles
          title="" // Sin tooltip para mantener secreto
          style={{ 
            background: 'transparent',
            border: 'none'
          }}
        />
        
        {/* Botón de admin solo visible después del timer - posición aleatoria */}
        {showHiddenZone && (
          <div 
            className="fixed z-50" 
            style={buttonPosition}
          >
            <button
              onClick={() => setShowLoginModal(true)}
              className="admin-access-btn animate-bounce"
            >
              Admin
            </button>
          </div>
        )}
        
        {/* Indicador visual sutil de progreso (opcional, solo para desarrollo) */}
        {hiddenClicks > 0 && hiddenClicks < 5 && (
          <div 
            className={`fixed ${clickZonePosition} z-45 pointer-events-none`}
            style={{ transform: 'translate(20px, -20px)' }}
          >
            <div className="progress-indicator">
              {[...Array(5)].map((_, i) => (
                <div 
                  key={i} 
                  className={`progress-dot ${i < hiddenClicks ? 'active' : ''}`} 
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Timer visual cuando está activo */}
        {isTimerActive && (
          <div 
            className={`fixed ${clickZonePosition} z-45 pointer-events-none`}
            style={{ transform: 'translate(-30px, -30px)' }}
          >
            <div className="timer-indicator">
              <div className="timer-circle">
                <svg width="24" height="24" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="#d4af37"
                    strokeWidth="2"
                    fill="none"
                    strokeDasharray="62.83"
                    strokeDashoffset="0"
                    className="timer-circle-progress"
                  />
                </svg>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  const openImageEditor = (imageBase64, itemId = null, collectionId = null) => {
    setEditingImage({ base64: imageBase64, itemId, collectionId });
    setShowImageEditor(true);
  };

  const saveEditedImage = (imageBase64, filters) => {
    // La imagen ya se guarda en el backend desde el ImageEditor
    // Aquí solo actualizamos la UI local
    if (editingImage?.itemId) {
      loadJewelryItems();
    } else if (editingImage?.collectionId) {
      loadCollections();
    }
    
    setShowImageEditor(false);
    setEditingImage(null);
  };

  if (!siteConfig) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner-elegant"></div>
        <p>Cargando experiencia elegante...</p>
      </div>
    );
  }

  return (
    <div className={`app-container ${currentScheme.bg}`}>
      {/* Cursor personalizado eliminado */}
      
      {/* Header con logo adaptable y efectos parallax */}
      <header className={`main-header ${isScrolled ? 'scrolled' : ''}`}>
        <div className="header-content">
          {siteConfig.logo_base64 && (
            <div className="logo-container">
              <img
                src={siteConfig.logo_base64}
                alt={siteConfig.site_name}
                className="logo"
                style={{ transform: `scale(${1 - scrollY * 0.0005})` }}
              />
            </div>
          )}
          <div className="site-title">
            <h1 className="site-name">{siteConfig.site_name}</h1>
            <div className="site-divider"></div>
          </div>
        </div>
      </header>

      {/* Hero Section con parallax */}
      <section className="hero-section">
        <ParallaxSection speed={0.3} className="hero-bg">
          <div className="hero-overlay"></div>
        </ParallaxSection>
        <div className="hero-content">
          <ScrollReveal direction="up" delay={300}>
            <h1 className="hero-title">{siteConfig.hero_title || siteConfig.artisan_name}</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={600}>
            <div className="hero-subtitle">
              <span className="subtitle-line"></span>
              <span className="subtitle-text">{siteConfig.site_subtitle || 'Joyería Artesanal de Alto Standing'}</span>
              <span className="subtitle-line"></span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={900}>
            <p className="hero-description">
              {siteConfig.hero_description || siteConfig.artisan_story}
            </p>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={1200}>
            <div className="hero-cta">
              <button 
                className="cta-button"
                onClick={() => document.getElementById('collections').scrollIntoView({ behavior: 'smooth' })}
              >
                Explorar Colecciones
                <span className="cta-arrow">→</span>
              </button>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Collections Section con efectos avanzados */}
      <section id="collections" className="collections-section">
        <div className="section-container">
          <ScrollReveal direction="up" delay={200}>
            <div className="section-header">
              <h2 className="section-title">{siteConfig.collections_title || 'Nuestras Colecciones'}</h2>
              <div className="section-subtitle">{siteConfig.collections_subtitle || 'Cada pieza cuenta una historia única'}</div>
            </div>
          </ScrollReveal>
          
          <div className="collections-showcase">
            {collections.map((collection, index) => (
              <ScrollReveal key={collection.id} direction="up" delay={200 * (index + 1)}>
                <div 
                  className="collection-card-elegant"
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="collection-image-container">
                    <img
                      src={collection.image_base64}
                      alt={collection.name}
                      className="collection-image"
                    />
                    <div className="collection-overlay">
                      <div className="overlay-content">
                        <span className="view-collection">Ver Colección</span>
                        {isAuthenticated && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openImageEditor(collection.image_base64, null, collection.id);
                            }}
                            className="edit-image-btn"
                          >
                            Editar Imagen
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="collection-content">
                    <h3 className="collection-name">{collection.name}</h3>
                    <p className="collection-description">{collection.description}</p>
                    <div className="collection-cta">
                      <span className="cta-text">Explorar</span>
                      <span className="cta-icon">→</span>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Collection Detail Modal Mejorado */}
      {selectedCollection && (
        <div className="modal-backdrop collection-modal-backdrop">
          <div className="collection-modal">
            <div className="modal-header-elegant">
              <div>
                <h2 className="modal-title-elegant">{selectedCollection.name}</h2>
                <p className="modal-subtitle-elegant">{selectedCollection.description}</p>
              </div>
              <button
                onClick={() => setSelectedCollection(null)}
                className="close-btn-elegant"
              >
                ×
              </button>
            </div>
            
            <div className="jewelry-showcase">
              {getItemsByCollection(selectedCollection.id).map((item, index) => (
                <div key={item.id} className="jewelry-card-elegant">
                  <div className="jewelry-image-container">
                    <img
                      src={item.image_base64}
                      alt={item.name}
                      className="jewelry-image"
                    />
                    <div className="jewelry-shine-effect"></div>
                    {isAuthenticated && (
                      <button
                        onClick={() => openImageEditor(item.image_base64, item.id)}
                        className="edit-image-btn-small"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  <div className="jewelry-content">
                    <h4 className="jewelry-name">{item.name}</h4>
                    <p className="jewelry-description">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Footer elegante personalizable */}
      <footer className="footer-elegant">
        <div className="footer-content">
          <div className="footer-grid">
            <ScrollReveal direction="up" delay={200}>
              <div className="footer-section">
                <h3 className="footer-title">{siteConfig.footer_title_1 || 'Sobre Nosotros'}</h3>
                <p className="footer-story">{siteConfig.artisan_story}</p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={400}>
              <div className="footer-section">
                <h3 className="footer-title">{siteConfig.footer_title_2 || 'Contacto'}</h3>
                <div className="contact-info">
                  <p className="contact-item">{siteConfig.artisan_contact}</p>
                  <p className="contact-item">{siteConfig.artisan_phone}</p>
                  <p className="contact-item">{siteConfig.artisan_address}</p>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={600}>
              <div className="footer-section">
                <h3 className="footer-title">{siteConfig.footer_title_3 || 'Síguenos'}</h3>
                <p className="footer-follow">{siteConfig.footer_text_3 || 'Conecta con nosotros en redes sociales'}</p>
                <SocialLinks config={siteConfig} />
              </div>
            </ScrollReveal>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-divider"></div>
            <p className="footer-copyright">
              &copy; 2025 {siteConfig.site_name}. {siteConfig.footer_copyright || 'Todos los derechos reservados.'}
            </p>
          </div>
        </div>
      </footer>

      {/* Hidden Zone */}
      {renderHiddenZone()}

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      
      <AdminPanel
        isOpen={showAdminPanel}
        onClose={() => setShowAdminPanel(false)}
        siteConfig={siteConfig}
        onConfigUpdate={loadSiteConfig}
        collections={collections}
        onCollectionsUpdate={loadCollections}
        jewelryItems={jewelryItems}
        onJewelryUpdate={loadJewelryItems}
      />

      {showImageEditor && (
        <ImageEditor
          imageBase64={editingImage?.base64}
          itemId={editingImage?.itemId}
          collectionId={editingImage?.collectionId}
          onSave={saveEditedImage}
          onClose={() => {
            setShowImageEditor(false);
            setEditingImage(null);
          }}
        />
      )}

      {/* Admin Access Button - SOLO DESPUÉS DE AUTENTICACIÓN */}
      {isAuthenticated && (
        <div className="admin-float-button">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="float-admin-btn"
          >
            {showAdminPanel ? '×' : '⚙'}
          </button>
          
          {showAdminPanel && (
            <div className="admin-quick-menu">
              <button onClick={logout} className="logout-btn">
                Cerrar Sesión
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// App principal con provider
function App() {
  return (
    <AuthProvider>
      <JewelryApp />
    </AuthProvider>
  );
}

export default App;