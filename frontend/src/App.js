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

// Componente Editor de Imágenes AVANZADO con Glassmorphism
const ImageEditor = ({ imageBase64, onSave, onClose, itemId, collectionId }) => {
  const [editedImage, setEditedImage] = useState(imageBase64);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);
  const [hue, setHue] = useState(0); // Nuevo: tono de color
  const [whiteBalance, setWhiteBalance] = useState(6500); // Nuevo: balance de blancos (temperatura)
  const [cropType, setCropType] = useState('square'); // square, vertical, horizontal, free
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('crop'); // crop, colors, effects

  const cropAspectRatios = {
    square: 1,
    vertical: 3/4,
    horizontal: 4/3,
    free: null // Para recorte libre
  };

  const applyFilters = () => {
    // Calcular temperatura de color basada en balance de blancos
    let tempRed = 1, tempGreen = 1, tempBlue = 1;
    
    if (whiteBalance < 6500) {
      // Temperatura cálida (más roja)
      const factor = (6500 - whiteBalance) / 2000;
      tempRed = 1 + factor * 0.3;
      tempBlue = Math.max(0.7, 1 - factor * 0.2);
    } else if (whiteBalance > 6500) {
      // Temperatura fría (más azul)
      const factor = (whiteBalance - 6500) / 2000;
      tempBlue = 1 + factor * 0.3;
      tempRed = Math.max(0.8, 1 - factor * 0.1);
    }

    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`,
      // Aplicar balance de blancos usando CSS mix-blend-mode simulado con overlays
      position: 'relative'
    };
  };

  const getTemperatureOverlay = () => {
    if (whiteBalance === 6500) return null;
    
    let overlayColor, opacity;
    if (whiteBalance < 6500) {
      // Cálido - overlay naranja/rojo
      const intensity = (6500 - whiteBalance) / 2000;
      overlayColor = `rgba(255, 147, 41, ${intensity * 0.15})`;
    } else {
      // Frío - overlay azul
      const intensity = (whiteBalance - 6500) / 2000;
      overlayColor = `rgba(41, 147, 255, ${intensity * 0.15})`;
    }
    
    return overlayColor;
  };

  const applyCropAndFilters = (img, cropType) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    let cropWidth, cropHeight, cropX, cropY;

    if (cropType === 'free') {
      // Para recorte libre, usar toda la imagen
      cropWidth = img.width;
      cropHeight = img.height;
      cropX = cropY = 0;
    } else {
      const aspectRatio = cropAspectRatios[cropType];
      
      if (aspectRatio === 1) {
        // Square crop
        const size = Math.min(img.width, img.height);
        cropWidth = cropHeight = size;
        cropX = (img.width - size) / 2;
        cropY = (img.height - size) / 2;
      } else if (aspectRatio < 1) {
        // Vertical rectangle
        cropHeight = img.height;
        cropWidth = cropHeight * aspectRatio;
        cropX = (img.width - cropWidth) / 2;
        cropY = 0;
      } else {
        // Horizontal rectangle
        cropWidth = img.width;
        cropHeight = cropWidth / aspectRatio;
        cropX = 0;
        cropY = (img.height - cropHeight) / 2;
      }
    }

    canvas.width = cropWidth;
    canvas.height = cropHeight;
    
    // Apply filters
    ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%) hue-rotate(${hue}deg)`;
    
    // Draw the cropped image
    ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);
    
    // Apply white balance overlay if needed
    const overlayColor = getTemperatureOverlay();
    if (overlayColor) {
      ctx.globalCompositeOperation = 'overlay';
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, cropWidth, cropHeight);
    }
    
    return canvas.toDataURL('image/jpeg', 0.9);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const img = new Image();
      
      img.onload = async () => {
        const processedImage = applyCropAndFilters(img, cropType);
        
        const token = localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
        
        if (itemId === 'logo') {
          await axios.put(`${API}/config`, { 
            logo_base64: processedImage 
          }, { headers });
        } else {
          await axios.post(`${API}/save-edited-image`, {
            item_id: itemId,
            collection_id: collectionId,
            image_base64: processedImage
          }, { headers });
        }
        
        onSave(processedImage, { brightness, contrast, saturation, hue, whiteBalance, cropType });
        
        alert('Imagen guardada exitosamente');
        onClose();
      };
      
      img.src = editedImage;
    } catch (error) {
      console.error('Error saving image:', error);
      alert(`Error al guardar la imagen: ${error.response?.data?.detail || error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const resetFilters = () => {
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setHue(0);
    setWhiteBalance(6500);
    setCropType('square');
  };

  return (
    <div className="modal-backdrop image-editor-backdrop">
      <div className="modal-content image-editor-modal">
        <div className="editor-header">
          <h2 className="editor-title">🎨 Editor de Imagen Avanzado</h2>
          <button onClick={onClose} className="close-btn-editor">×</button>
        </div>
        
        <div className="image-editor-content">
          {/* Preview Section */}
          <div className="image-preview-section">
            <div className={`image-preview-container crop-${cropType}`}>
              <div style={{ position: 'relative' }}>
                <img
                  src={editedImage}
                  alt="Preview"
                  style={applyFilters()}
                  className="image-preview-large"
                />
                {getTemperatureOverlay() && (
                  <div 
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundColor: getTemperatureOverlay(),
                      pointerEvents: 'none',
                      borderRadius: '8px'
                    }}
                  />
                )}
              </div>
              <div className="crop-overlay"></div>
            </div>
          </div>
          
          {/* Controls Section */}
          <div className="controls-section">
            {/* Tabs Navigation */}
            <div className="editor-tabs">
              <button
                className={`editor-tab ${activeTab === 'crop' ? 'active' : ''}`}
                onClick={() => setActiveTab('crop')}
              >
                ✂️ Recorte
              </button>
              <button
                className={`editor-tab ${activeTab === 'colors' ? 'active' : ''}`}
                onClick={() => setActiveTab('colors')}
              >
                🎨 Colores
              </button>
              <button
                className={`editor-tab ${activeTab === 'effects' ? 'active' : ''}`}
                onClick={() => setActiveTab('effects')}
              >
                ✨ Efectos
              </button>
            </div>

            {/* Crop Controls */}
            {activeTab === 'crop' && (
              <div className="control-section">
                <h4 className="control-title">Formato de Recorte</h4>
                <div className="crop-buttons">
                  <button
                    className={`btn-crop ${cropType === 'square' ? 'active' : ''}`}
                    onClick={() => setCropType('square')}
                  >
                    📐 Cuadrado (1:1)
                  </button>
                  <button
                    className={`btn-crop ${cropType === 'vertical' ? 'active' : ''}`}
                    onClick={() => setCropType('vertical')}
                  >
                    📱 Vertical (3:4)
                  </button>
                  <button
                    className={`btn-crop ${cropType === 'horizontal' ? 'active' : ''}`}
                    onClick={() => setCropType('horizontal')}
                  >
                    🖥️ Horizontal (4:3)
                  </button>
                  <button
                    className={`btn-crop ${cropType === 'free' ? 'active' : ''}`}
                    onClick={() => setCropType('free')}
                  >
                    🔓 Libre
                  </button>
                </div>
              </div>
            )}

            {/* Color Controls */}
            {activeTab === 'colors' && (
              <div className="control-section">
                <h4 className="control-title">Ajustes de Color</h4>
                
                <div className="control-group">
                  <label className="control-label">💡 Brillo: {brightness}%</label>
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
                  <label className="control-label">⚡ Contraste: {contrast}%</label>
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
                  <label className="control-label">🌈 Saturación: {saturation}%</label>
                  <input
                    type="range"
                    min="0"
                    max="200"
                    value={saturation}
                    onChange={(e) => setSaturation(e.target.value)}
                    className="range-slider"
                  />
                </div>

                <div className="control-group">
                  <label className="control-label">🎨 Tono: {hue}°</label>
                  <input
                    type="range"
                    min="0"
                    max="360"
                    value={hue}
                    onChange={(e) => setHue(e.target.value)}
                    className="range-slider hue-slider"
                  />
                </div>
              </div>
            )}

            {/* Effects Controls */}
            {activeTab === 'effects' && (
              <div className="control-section">
                <h4 className="control-title">Balance de Blancos</h4>
                
                <div className="control-group">
                  <label className="control-label">
                    🌡️ Temperatura: {whiteBalance}K 
                    {whiteBalance < 6000 ? ' (Cálido)' : 
                     whiteBalance > 7000 ? ' (Frío)' : ' (Neutro)'}
                  </label>
                  <input
                    type="range"
                    min="3000"
                    max="9000"
                    step="100"
                    value={whiteBalance}
                    onChange={(e) => setWhiteBalance(e.target.value)}
                    className="range-slider temperature-slider"
                  />
                </div>

                <div className="temperature-presets">
                  <button
                    className="preset-btn warm"
                    onClick={() => setWhiteBalance(3000)}
                  >
                    🔥 Muy Cálido
                  </button>
                  <button
                    className="preset-btn neutral"
                    onClick={() => setWhiteBalance(6500)}
                  >
                    ⚪ Neutro
                  </button>
                  <button
                    className="preset-btn cool"
                    onClick={() => setWhiteBalance(9000)}
                  >
                    ❄️ Muy Frío
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="editor-actions">
          <button
            onClick={resetFilters}
            className="btn-secondary"
            disabled={isSaving}
          >
            🔄 Restablecer Todo
          </button>
          <button
            onClick={handleSave}
            className={`btn-primary ${isSaving ? 'loading' : ''}`}
            disabled={isSaving}
          >
            {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
            disabled={isSaving}
          >
            ❌ Cancelar
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
  
  // Estados para editor de imágenes
  const [showImageEditor, setShowImageEditor] = useState(false);
  const [editingImage, setEditingImage] = useState(null);

  // Función para abrir el editor de imágenes
  const openImageEditor = (imageBase64, itemId, collectionId = null) => {
    setEditingImage({ imageBase64, itemId, collectionId });
    setShowImageEditor(true);
  };

  // Función para guardar imagen editada
  const saveEditedImage = (imageBase64, filters) => {
    if (editingImage?.itemId === 'logo') {
      setEditConfig(prev => ({ ...prev, logo_base64: imageBase64 }));
    } else if (editingImage?.itemId === 'hero') {
      setEditConfig(prev => ({ ...prev, hero_image_base64: imageBase64 }));
    } else if (editingImage?.collectionId) {
      // Actualizar imagen de colección
      onCollectionsUpdate();
    } else if (editingImage?.itemId) {
      // Actualizar imagen de joya
      onJewelryUpdate();
    }
    
    setShowImageEditor(false);
    setEditingImage(null);
  };

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
      // Obtener el token del localStorage
      const token = localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      
      const response = await axios.put(`${API}/config`, editConfig, { headers });
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
    <div className="admin-panel">
      <div className="panel-content">
        {/* Header mejorado */}
        <div className="panel-header">
          <h1 className="panel-title">
            <span className="panel-icon">⚙️</span>
            Panel de Administración
          </h1>
          <button onClick={onClose} className="close-btn" title="Cerrar panel">
            ✕
          </button>
        </div>
        
        {/* Navegación de pestañas estilo Bootstrap */}
        <div className="panel-tabs">
          <button 
            className={`tab-button ${activeTab === 'general' ? 'active' : ''}`}
            onClick={() => setActiveTab('general')}
          >
            <span className="tab-icon">🏠</span>
            General
          </button>
          <button 
            className={`tab-button ${activeTab === 'textos' ? 'active' : ''}`}
            onClick={() => setActiveTab('textos')}
          >
            <span className="tab-icon">📝</span>
            Textos
          </button>
          <button 
            className={`tab-button ${activeTab === 'redes' ? 'active' : ''}`}
            onClick={() => setActiveTab('redes')}
          >
            <span className="tab-icon">🌐</span>
            Redes Sociales
          </button>
          <button 
            className={`tab-button ${activeTab === 'collections' ? 'active' : ''}`}
            onClick={() => setActiveTab('collections')}
          >
            <span className="tab-icon">💎</span>
            Colecciones
          </button>
          <button 
            className={`tab-button ${activeTab === 'jewelry' ? 'active' : ''}`}
            onClick={() => setActiveTab('jewelry')}
          >
            <span className="tab-icon">💍</span>
            Joyas
          </button>
        </div>

        {/* Contenido del panel */}
        <div className="panel-body">
          {/* Pestaña General */}
          {activeTab === 'general' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Configuración General</h2>
                <div className="section-actions">
                  <button onClick={saveConfig} className={`btn-success ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </div>
              
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Nombre del Sitio</label>
                  <input
                    type="text"
                    value={editConfig.site_name || ''}
                    onChange={(e) => setEditConfig({...editConfig, site_name: e.target.value})}
                    className="form-input"
                    placeholder="Ej: AO Jewellery"
                  />
                </div>
                
                <div className="form-group">
                  <label className="form-label">Subtítulo del Sitio</label>
                  <input
                    type="text"
                    value={editConfig.site_subtitle || ''}
                    onChange={(e) => setEditConfig({...editConfig, site_subtitle: e.target.value})}
                    className="form-input"
                    placeholder="Ej: Joyería Artesanal de Lujo"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Nombre del Artesano</label>
                  <input
                    type="text"
                    value={editConfig.artisan_name || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_name: e.target.value})}
                    className="form-input"
                    placeholder="Tu nombre"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Contacto del Artesano</label>
                  <input
                    type="text"
                    value={editConfig.artisan_contact || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_contact: e.target.value})}
                    className="form-input"
                    placeholder="Teléfono, email o dirección"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Historia del Artesano</label>
                  <textarea
                    value={editConfig.artisan_story || ''}
                    onChange={(e) => setEditConfig({...editConfig, artisan_story: e.target.value})}
                    className="form-textarea"
                    placeholder="Cuenta tu historia, experiencia y pasión por la joyería..."
                    rows="4"
                  />
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Logo del Sitio</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleImageUpload(e, (base64) => setEditConfig({...editConfig, logo_base64: base64}))}
                    className="form-input"
                  />
                  {editConfig.logo_base64 && (
                    <div className="image-preview">
                      <img src={editConfig.logo_base64} alt="Logo preview" className="preview-img" />
                      <button
                        type="button"
                        onClick={() => openImageEditor(editConfig.logo_base64, 'logo')}
                        className="edit-image-btn"
                        title="Editar Logo"
                      >
                        🎨 Editar Imagen
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pestaña Textos */}
          {activeTab === 'textos' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Textos del Sitio</h2>
                <div className="section-actions">
                  <button onClick={saveConfig} className={`btn-success ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </div>

              <div className="form-sections">
                <div className="form-section">
                  <h3 className="form-section-title">Sección Hero</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Título Principal</label>
                      <input
                        type="text"
                        value={editConfig.hero_title || ''}
                        onChange={(e) => setEditConfig({...editConfig, hero_title: e.target.value})}
                        className="form-input"
                        placeholder="Título de la sección hero"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Descripción</label>
                      <textarea
                        value={editConfig.hero_description || ''}
                        onChange={(e) => setEditConfig({...editConfig, hero_description: e.target.value})}
                        className="form-textarea"
                        placeholder="Descripción de la sección hero"
                        rows="3"
                      />
                    </div>
                  </div>
                  
                  {/* Campo para imagen/video del Hero */}
                  <div className="form-group full-width">
                    <label className="form-label">Imagen de Fondo del Hero</label>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      onChange={(e) => handleImageUpload(e, (base64) => setEditConfig({...editConfig, hero_image_base64: base64}))}
                      className="form-input"
                    />
                    {editConfig.hero_image_base64 && (
                      <div className="image-preview">
                        <img src={editConfig.hero_image_base64} alt="Hero background preview" className="preview-img" />
                        <button
                          type="button"
                          onClick={() => openImageEditor(editConfig.hero_image_base64, 'hero')}
                          className="edit-image-btn"
                          title="Editar Imagen del Hero"
                        >
                          🎨 Editar Imagen
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">Sección Colecciones</h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Título de Colecciones</label>
                      <input
                        type="text"
                        value={editConfig.collections_title || ''}
                        onChange={(e) => setEditConfig({...editConfig, collections_title: e.target.value})}
                        className="form-input"
                        placeholder="Ej: Nuestras Colecciones"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Subtítulo de Colecciones</label>
                      <input
                        type="text"
                        value={editConfig.collections_subtitle || ''}
                        onChange={(e) => setEditConfig({...editConfig, collections_subtitle: e.target.value})}
                        className="form-input"
                        placeholder="Subtítulo descriptivo"
                      />
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h3 className="form-section-title">Footer</h3>
                  <div className="form-grid">
                    <div className="form-group">
                      <label className="form-label">Título Footer 1</label>
                      <input
                        type="text"
                        value={editConfig.footer_title_1 || ''}
                        onChange={(e) => setEditConfig({...editConfig, footer_title_1: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título Footer 2</label>
                      <input
                        type="text"
                        value={editConfig.footer_title_2 || ''}
                        onChange={(e) => setEditConfig({...editConfig, footer_title_2: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Título Footer 3</label>
                      <input
                        type="text"
                        value={editConfig.footer_title_3 || ''}
                        onChange={(e) => setEditConfig({...editConfig, footer_title_3: e.target.value})}
                        className="form-input"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Texto Footer 3</label>
                      <textarea
                        value={editConfig.footer_text_3 || ''}
                        onChange={(e) => setEditConfig({...editConfig, footer_text_3: e.target.value})}
                        className="form-textarea"
                        rows="3"
                      />
                    </div>
                    <div className="form-group full-width">
                      <label className="form-label">Copyright</label>
                      <input
                        type="text"
                        value={editConfig.footer_copyright || ''}
                        onChange={(e) => setEditConfig({...editConfig, footer_copyright: e.target.value})}
                        className="form-input"
                        placeholder="© 2025 Tu Empresa"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pestaña Redes Sociales */}
          {activeTab === 'redes' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Redes Sociales</h2>
                <div className="section-actions">
                  <button onClick={saveConfig} className={`btn-success ${isSaving ? 'loading' : ''}`} disabled={isSaving}>
                    {isSaving ? 'Guardando...' : '💾 Guardar Cambios'}
                  </button>
                </div>
              </div>

              <div className="social-grid">
                {[
                  { key: 'facebook', icon: '📘', name: 'Facebook' },
                  { key: 'instagram', icon: '📷', name: 'Instagram' },
                  { key: 'tiktok', icon: '🎵', name: 'TikTok' },
                  { key: 'whatsapp', icon: '💬', name: 'WhatsApp' },
                  { key: 'youtube', icon: '📺', name: 'YouTube' },
                  { key: 'twitter', icon: '🐦', name: 'Twitter/X' }
                ].map(social => (
                  <div key={social.key} className="social-item">
                    <div className="social-header">
                      <span className="social-icon">{social.icon}</span>
                      <h4 className="social-name">{social.name}</h4>
                      <div className="form-check">
                        <input
                          type="checkbox"
                          id={`${social.key}_enabled`}
                          checked={editConfig[`social_${social.key}_enabled`] || false}
                          onChange={(e) => setEditConfig({...editConfig, [`social_${social.key}_enabled`]: e.target.checked})}
                          className="form-check-input"
                        />
                        <label htmlFor={`${social.key}_enabled`} className="form-check-label">Activar</label>
                      </div>
                    </div>
                    <div className="form-group">
                      <input
                        type="url"
                        value={editConfig[`social_${social.key}`] || ''}
                        onChange={(e) => setEditConfig({...editConfig, [`social_${social.key}`]: e.target.value})}
                        className="form-input"
                        placeholder={`URL de ${social.name}`}
                        disabled={!editConfig[`social_${social.key}_enabled`]}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pestaña Colecciones */}
          {activeTab === 'collections' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Gestión de Colecciones</h2>
                <div className="section-actions">
                  <button onClick={() => setEditingCollection({ name: '', description: '', image_base64: '', position: collections.length })} className="btn-primary">
                    ➕ Nueva Colección
                  </button>
                </div>
              </div>

              <div className="items-grid">
                {collections.map(collection => (
                  <div key={collection.id} className="item-card">
                    <div className="item-image">
                      {collection.image_base64 ? (
                        <img src={collection.image_base64} alt={collection.name} />
                      ) : (
                        <div className="placeholder-image">📷</div>
                      )}
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{collection.name}</h4>
                      <p className="item-description">{collection.description}</p>
                      <div className="item-actions">
                        {collection.image_base64 && (
                          <button 
                            onClick={() => openImageEditor(collection.image_base64, collection.id, 'collection')}
                            className="btn-info btn-sm"
                            title="Editar Imagen de Colección"
                          >
                            🎨 Editar Imagen
                          </button>
                        )}
                        <button onClick={() => setEditingCollection(collection)} className="btn-secondary btn-sm">
                          ✏️ Editar
                        </button>
                        <button onClick={() => deleteCollection(collection.id)} className="btn-danger btn-sm">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal de edición de colección */}
              {editingCollection && (
                <div className="modal-overlay">
                  <div className="modal-dialog">
                    <div className="modal-header">
                      <h3>{editingCollection.id ? 'Editar Colección' : 'Nueva Colección'}</h3>
                      <button onClick={() => setEditingCollection(null)} className="btn-close">✕</button>
                    </div>
                    <div className="modal-body">
                      <div className="form-group">
                        <label className="form-label">Nombre</label>
                        <input
                          type="text"
                          value={editingCollection.name}
                          onChange={(e) => setEditingCollection({...editingCollection, name: e.target.value})}
                          className="form-input"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea
                          value={editingCollection.description}
                          onChange={(e) => setEditingCollection({...editingCollection, description: e.target.value})}
                          className="form-textarea"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Imagen</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, (base64) => setEditingCollection({...editingCollection, image_base64: base64}))}
                          className="form-input"
                        />
                        {editingCollection.image_base64 && (
                          <div className="image-preview">
                            <img src={editingCollection.image_base64} alt="Preview" className="preview-img" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button onClick={() => setEditingCollection(null)} className="btn-secondary">
                        Cancelar
                      </button>
                      <button onClick={() => saveCollection(editingCollection)} className="btn-success">
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pestaña Joyas */}
          {activeTab === 'jewelry' && (
            <div className="tab-content">
              <div className="section-header">
                <h2 className="section-title">Gestión de Joyas</h2>
                <div className="section-actions">
                  <button onClick={() => setEditingJewelry({ name: '', description: '', image_base64: '', collection_id: '', position: jewelryItems.length })} className="btn-primary">
                    ➕ Nueva Joya
                  </button>
                </div>
              </div>

              <div className="items-grid">
                {jewelryItems.map(jewelry => (
                  <div key={jewelry.id} className="item-card">
                    <div className="item-image">
                      {jewelry.image_base64 ? (
                        <img src={jewelry.image_base64} alt={jewelry.name} />
                      ) : (
                        <div className="placeholder-image">💍</div>
                      )}
                    </div>
                    <div className="item-content">
                      <h4 className="item-title">{jewelry.name}</h4>
                      <p className="item-description">{jewelry.description}</p>
                      <div className="item-meta">
                        <span className="item-collection">
                          {collections.find(c => c.id === jewelry.collection_id)?.name || 'Sin colección'}
                        </span>
                      </div>
                      <div className="item-actions">
                        {jewelry.image_base64 && (
                          <button 
                            onClick={() => openImageEditor(jewelry.image_base64, jewelry.id)}
                            className="btn-info btn-sm"
                            title="Editar Imagen de Joya"
                          >
                            🎨 Editar Imagen
                          </button>
                        )}
                        <button onClick={() => setEditingJewelry(jewelry)} className="btn-secondary btn-sm">
                          ✏️ Editar
                        </button>
                        <button onClick={() => deleteJewelry(jewelry.id)} className="btn-danger btn-sm">
                          🗑️ Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal de edición de joya */}
              {editingJewelry && (
                <div className="modal-overlay">
                  <div className="modal-dialog">
                    <div className="modal-header">
                      <h3>{editingJewelry.id ? 'Editar Joya' : 'Nueva Joya'}</h3>
                      <button onClick={() => setEditingJewelry(null)} className="btn-close">✕</button>
                    </div>
                    <div className="modal-body">
                      <div className="form-row">
                        <div className="form-group">
                          <label className="form-label">Nombre</label>
                          <input
                            type="text"
                            value={editingJewelry.name}
                            onChange={(e) => setEditingJewelry({...editingJewelry, name: e.target.value})}
                            className="form-input"
                          />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Colección</label>
                          <select
                            value={editingJewelry.collection_id}
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
                      </div>
                      <div className="form-group">
                        <label className="form-label">Descripción</label>
                        <textarea
                          value={editingJewelry.description}
                          onChange={(e) => setEditingJewelry({...editingJewelry, description: e.target.value})}
                          className="form-textarea"
                          rows="3"
                        />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Imagen</label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, (base64) => setEditingJewelry({...editingJewelry, image_base64: base64}))}
                          className="form-input"
                        />
                        {editingJewelry.image_base64 && (
                          <div className="image-preview">
                            <img src={editingJewelry.image_base64} alt="Preview" className="preview-img" />
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button onClick={() => setEditingJewelry(null)} className="btn-secondary">
                        Cancelar
                      </button>
                      <button onClick={() => saveJewelry(editingJewelry)} className="btn-success">
                        Guardar
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
    if (editingImage?.itemId === 'logo') {
      // Actualizar logo en la configuración
      setSiteConfig(prev => ({ ...prev, logo_base64: imageBase64 }));
      loadSiteConfig(); // Recargar configuración desde el backend
    } else if (editingImage?.itemId === 'hero') {
      // Actualizar imagen del hero en la configuración
      setSiteConfig(prev => ({ ...prev, hero_image_base64: imageBase64 }));
      loadSiteConfig(); // Recargar configuración desde el backend
    } else if (editingImage?.itemId) {
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
                onClick={() => isAuthenticated && openImageEditor(siteConfig.logo_base64, 'logo')}
                style={{ cursor: isAuthenticated ? 'pointer' : 'default' }}
              />
              {isAuthenticated && (
                <button
                  onClick={() => openImageEditor(siteConfig.logo_base64, 'logo')}
                  className="edit-logo-btn"
                  title="Editar logo"
                >
                  ✏️
                </button>
              )}
            </div>
          )}
          <div className="site-title">
            <h1 className="site-name">{siteConfig.site_name}</h1>
            <div className="site-divider"></div>
          </div>
        </div>
      </header>

      {/* Hero Section con parallax */}
      <section 
        className="hero-section"
        style={siteConfig.hero_image_base64 ? {
          backgroundImage: `linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.4)), url(${siteConfig.hero_image_base64})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        } : {}}
      >
        <ParallaxSection speed={0.3} className="hero-bg">
          <div className="hero-overlay"></div>
        </ParallaxSection>
        <div className="hero-content">
          {isAuthenticated && siteConfig.hero_image_base64 && (
            <button
              onClick={() => openImageEditor(siteConfig.hero_image_base64, 'hero')}
              className="edit-hero-btn"
              title="Editar imagen del Hero"
            >
              🎨 Editar Fondo
            </button>
          )}
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

      {/* Contenido que se superpone con efecto parallax */}
      <div className="content-overlay">
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
                      onClick={() => setSelectedJewelryImage({
                        src: item.image_base64,
                        name: item.name,
                        description: item.description
                      })}
                      style={{ cursor: 'pointer' }}
                    />
                    <div className="jewelry-shine-effect"></div>
                    {isAuthenticated && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          openImageEditor(item.image_base64, item.id);
                        }}
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
      </div> {/* Cierre del content-overlay para parallax */}

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

      {/* Modal de imagen ampliada */}
      {selectedJewelryImage && (
        <div 
          className="modal-backdrop image-modal-backdrop"
          onClick={() => setSelectedJewelryImage(null)}
        >
          <div className="image-modal-content" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setSelectedJewelryImage(null)}
              className="close-btn-image-modal"
            >
              ×
            </button>
            <div className="image-modal-wrapper">
              <img
                src={selectedJewelryImage.src}
                alt={selectedJewelryImage.name}
                className="image-modal-img"
              />
              <div className="image-modal-info">
                <h3 className="image-modal-title">{selectedJewelryImage.name}</h3>
                <p className="image-modal-description">{selectedJewelryImage.description}</p>
              </div>
            </div>
          </div>
        </div>
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
      
      {/* Editor de Imágenes integrado en AdminPanel */}
      {showImageEditor && (
        <ImageEditor
          imageBase64={editingImage?.imageBase64}
          onSave={saveEditedImage}
          onClose={() => {setShowImageEditor(false); setEditingImage(null);}}
          itemId={editingImage?.itemId}
          collectionId={editingImage?.collectionId}
        />
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