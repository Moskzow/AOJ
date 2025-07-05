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

// Cursor personalizado mejorado
const CustomCursor = () => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cursorRef = useRef();

  useEffect(() => {
    const updatePosition = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      setIsVisible(true);
    };

    const handleMouseEnter = (e) => {
      if (e.target.matches('button, a, .clickable, .collection-card-elegant, .jewelry-card-elegant, .cta-button')) {
        setIsHovering(true);
      }
    };
    
    const handleMouseLeave = (e) => {
      if (e.target.matches('button, a, .clickable, .collection-card-elegant, .jewelry-card-elegant, .cta-button')) {
        setIsHovering(false);
      }
    };

    const handleMouseDown = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = 'translate(-50%, -50%) scale(0.8)';
      }
    };

    const handleMouseUp = () => {
      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate(-50%, -50%) scale(${isHovering ? '2' : '1'})`;
      }
    };

    window.addEventListener('mousemove', updatePosition);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mouseenter', handleMouseEnter, true);
    document.addEventListener('mouseleave', handleMouseLeave, true);

    return () => {
      window.removeEventListener('mousemove', updatePosition);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mouseenter', handleMouseEnter, true);
      document.removeEventListener('mouseleave', handleMouseLeave, true);
    };
  }, [isHovering]);

  return (
    <div 
      ref={cursorRef}
      className={`custom-cursor ${isHovering ? 'hovering' : ''} ${isVisible ? 'visible' : ''}`}
      style={{ 
        left: position.x, 
        top: position.y,
        transform: `translate(-50%, -50%) scale(${isHovering ? '2' : '1'})`
      }}
    />
  );
};

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

// Panel de Administración Completo
const AdminPanel = ({ isOpen, onClose, siteConfig, onConfigUpdate, collections, onCollectionsUpdate, jewelryItems, onJewelryUpdate }) => {
  const [activeTab, setActiveTab] = useState('config');
  const [editConfig, setEditConfig] = useState(siteConfig || {});
  const [editingCollection, setEditingCollection] = useState(null);
  const [editingJewelry, setEditingJewelry] = useState(null);
  const [newCollection, setNewCollection] = useState({ name: '', description: '', image_base64: '', position: 0 });
  const [newJewelry, setNewJewelry] = useState({ name: '', description: '', image_base64: '', collection_id: '', position: 0 });

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
    try {
      await axios.put(`${API}/config`, editConfig);
      onConfigUpdate();
      alert('Configuración guardada exitosamente');
    } catch (error) {
      alert('Error al guardar configuración');
    }
  };

  const saveCollection = async (collection) => {
    try {
      if (collection.id) {
        await axios.put(`${API}/collections/${collection.id}`, collection);
      } else {
        await axios.post(`${API}/collections`, collection);
      }
      onCollectionsUpdate();
      setEditingCollection(null);
      setNewCollection({ name: '', description: '', image_base64: '', position: 0 });
      alert('Colección guardada exitosamente');
    } catch (error) {
      alert('Error al guardar colección');
    }
  };

  const deleteCollection = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta colección y todas sus joyas?')) {
      try {
        await axios.delete(`${API}/collections/${id}`);
        onCollectionsUpdate();
        onJewelryUpdate();
        alert('Colección eliminada exitosamente');
      } catch (error) {
        alert('Error al eliminar colección');
      }
    }
  };

  const saveJewelry = async (jewelry) => {
    try {
      if (jewelry.id) {
        await axios.put(`${API}/jewelry-items/${jewelry.id}`, jewelry);
      } else {
        await axios.post(`${API}/jewelry-items`, jewelry);
      }
      onJewelryUpdate();
      setEditingJewelry(null);
      setNewJewelry({ name: '', description: '', image_base64: '', collection_id: '', position: 0 });
      alert('Joya guardada exitosamente');
    } catch (error) {
      alert('Error al guardar joya');
    }
  };

  const deleteJewelry = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta joya?')) {
      try {
        await axios.delete(`${API}/jewelry-items/${id}`);
        onJewelryUpdate();
        alert('Joya eliminada exitosamente');
      } catch (error) {
        alert('Error al eliminar joya');
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
            className={`tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            Configuración
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
          {activeTab === 'config' && (
            <div className="config-panel">
              <h3>Configuración del Sitio</h3>
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
              <button onClick={saveConfig} className="btn-primary">
                Guardar Configuración
              </button>
            </div>
          )}

          {activeTab === 'collections' && (
            <div className="collections-panel">
              <div className="panel-header">
                <h3>Gestión de Colecciones</h3>
                <button 
                  onClick={() => setEditingCollection(newCollection)}
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
                  onClick={() => setEditingJewelry(newJewelry)}
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

// Componente principal de la aplicación
const JewelryApp = () => {
  const [siteConfig, setSiteConfig] = useState(null);
  const [collections, setCollections] = useState([]);
  const [jewelryItems, setJewelryItems] = useState([]);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showHiddenZone, setShowHiddenZone] = useState(false);
  const [hiddenClicks, setHiddenClicks] = useState(0);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [scrollY, setScrollY] = useState(0);
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
      const response = await axios.get(`${API}/config`);
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
    const position = siteConfig?.hidden_zone_position || 'bottom-right';
    const positionClasses = {
      'top-left': 'top-4 left-4',
      'top-right': 'top-4 right-4',
      'bottom-left': 'bottom-4 left-4',
      'bottom-right': 'bottom-4 right-4'
    };

    return (
      <div
        className={`fixed ${positionClasses[position]} w-8 h-8 cursor-pointer z-40 admin-zone`}
        onClick={handleHiddenZoneClick}
        title="Zona de administración"
      >
        {showHiddenZone && (
          <button
            onClick={() => setShowLoginModal(true)}
            className="admin-access-btn"
          >
            Admin
          </button>
        )}
      </div>
    );
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
      <CustomCursor />
      
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
            <h1 className="hero-title">{siteConfig.artisan_name}</h1>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={600}>
            <div className="hero-subtitle">
              <span className="subtitle-line"></span>
              <span className="subtitle-text">Joyería Artesanal de Alto Standing</span>
              <span className="subtitle-line"></span>
            </div>
          </ScrollReveal>
          <ScrollReveal direction="up" delay={900}>
            <p className="hero-description">
              {siteConfig.artisan_story}
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
              <h2 className="section-title">Nuestras Colecciones</h2>
              <div className="section-subtitle">Cada pieza cuenta una historia única</div>
            </div>
          </ScrollReveal>
          
          <div className="collections-showcase">
            {collections.map((collection, index) => (
              <ScrollReveal key={collection.id} direction="up" delay={200 * (index + 1)}>
                <div 
                  className="collection-card-elegant clickable"
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

      {/* Footer elegante */}
      <footer className="footer-elegant">
        <div className="footer-content">
          <div className="footer-grid">
            <ScrollReveal direction="up" delay={200}>
              <div className="footer-section">
                <h3 className="footer-title">{siteConfig.artisan_name}</h3>
                <p className="footer-story">{siteConfig.artisan_story}</p>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={400}>
              <div className="footer-section">
                <h3 className="footer-title">Contacto</h3>
                <div className="contact-info">
                  <p className="contact-item">{siteConfig.artisan_contact}</p>
                  <p className="contact-item">{siteConfig.artisan_phone}</p>
                  <p className="contact-item">{siteConfig.artisan_address}</p>
                </div>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={600}>
              <div className="footer-section">
                <h3 className="footer-title">Síguenos</h3>
                <p className="footer-follow">Joyería artesanal de la más alta calidad, creada con pasión y dedicación.</p>
              </div>
            </ScrollReveal>
          </div>
          
          <div className="footer-bottom">
            <div className="footer-divider"></div>
            <p className="footer-copyright">
              &copy; 2025 {siteConfig.site_name}. Todos los derechos reservados.
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

      {/* Admin Access Button */}
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