import React, { useState, useEffect, createContext, useContext } from 'react';
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

// Componente de Login
const LoginModal = ({ isOpen, onClose }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await login(username, password);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Panel de Administración</h2>
        {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-amber-500"
              required
            />
          </div>
          <div className="flex gap-4">
            <button
              type="submit"
              className="flex-1 bg-amber-600 text-white py-2 px-4 rounded hover:bg-amber-700 transition-colors"
            >
              Acceder
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Componente Editor de Imágenes
const ImageEditor = ({ imageBase64, onSave, onClose }) => {
  const [editedImage, setEditedImage] = useState(imageBase64);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturation, setSaturation] = useState(100);

  const applyFilters = () => {
    return {
      filter: `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4">Editor de Imagen</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <img
              src={editedImage}
              alt="Preview"
              style={applyFilters()}
              className="w-full h-64 object-cover rounded border"
            />
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Brillo: {brightness}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Contraste: {contrast}%</label>
              <input
                type="range"
                min="50"
                max="150"
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
                className="w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Saturación: {saturation}%</label>
              <input
                type="range"
                min="0"
                max="200"
                value={saturation}
                onChange={(e) => setSaturation(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>
        
        <div className="flex gap-4 mt-6">
          <button
            onClick={() => onSave(editedImage, { brightness, contrast, saturation })}
            className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
          >
            Guardar Cambios
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
          >
            Cancelar
          </button>
        </div>
      </div>
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

  // Scroll effect for logo
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Hidden zone timer
  useEffect(() => {
    let timer;
    if (showHiddenZone) {
      timer = setTimeout(() => {
        setShowHiddenZone(false);
      }, 30000);
    }
    return () => clearTimeout(timer);
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

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setEditingImage({ base64, callback });
        setShowImageEditor(true);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveEditedImage = (imageBase64, filters) => {
    if (editingImage && editingImage.callback) {
      editingImage.callback(imageBase64);
    }
    setShowImageEditor(false);
    setEditingImage(null);
  };

  const getItemsByCollection = (collectionId) => {
    return jewelryItems.filter(item => item.collection_id === collectionId);
  };

  // Hidden zone handler
  const handleHiddenZoneClick = () => {
    setShowHiddenZone(true);
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
        className={`fixed ${positionClasses[position]} w-8 h-8 cursor-pointer z-40`}
        onClick={handleHiddenZoneClick}
        title="Zona de administración"
      >
        {showHiddenZone && (
          <button
            onClick={() => setShowLoginModal(true)}
            className={`bg-gradient-to-r ${currentScheme.primary} text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all text-sm`}
          >
            Admin
          </button>
        )}
      </div>
    );
  };

  if (!siteConfig) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-600"></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-${currentScheme.bg}`}>
      {/* Header con logo adaptable */}
      <header className={`fixed top-0 left-0 right-0 z-30 transition-all duration-300 ${
        isScrolled ? 'bg-white shadow-lg py-2' : 'bg-transparent py-4'
      }`}>
        <div className="container mx-auto px-4 flex items-center justify-center">
          {siteConfig.logo_base64 && (
            <img
              src={siteConfig.logo_base64}
              alt={siteConfig.site_name}
              className={`transition-all duration-300 ${
                isScrolled ? 'h-12' : 'h-20'
              } object-contain`}
            />
          )}
          <h1 className={`text-${currentScheme.text} font-bold transition-all duration-300 ${
            isScrolled ? 'text-2xl ml-4' : 'text-4xl ml-6'
          }`}>
            {siteConfig.site_name}
          </h1>
        </div>
      </header>

      {/* Hero Section */}
      <section className={`pt-32 pb-16 bg-gradient-to-r ${currentScheme.primary} text-white`}>
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            {siteConfig.artisan_name}
          </h1>
          <p className="text-xl md:text-2xl mb-8 max-w-3xl mx-auto">
            Joyería Artesanal de Alto Standing
          </p>
          <p className="text-lg max-w-2xl mx-auto leading-relaxed">
            {siteConfig.artisan_story}
          </p>
        </div>
      </section>

      {/* Collections Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h2 className={`text-4xl font-bold text-center mb-12 text-${currentScheme.text}`}>
            Nuestras Colecciones
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow cursor-pointer"
                onClick={() => setSelectedCollection(collection)}
              >
                <div className="h-64 overflow-hidden">
                  <img
                    src={collection.image_base64}
                    alt={collection.name}
                    className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                  />
                </div>
                <div className="p-6">
                  <h3 className={`text-2xl font-bold mb-3 text-${currentScheme.text}`}>
                    {collection.name}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {collection.description}
                  </p>
                  <button className={`mt-4 bg-gradient-to-r ${currentScheme.primary} text-white px-6 py-2 rounded-lg hover:shadow-md transition-all`}>
                    Ver Colección
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Collection Detail Modal */}
      {selectedCollection && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <div className="flex justify-between items-center">
                <h2 className={`text-3xl font-bold text-${currentScheme.text}`}>
                  {selectedCollection.name}
                </h2>
                <button
                  onClick={() => setSelectedCollection(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <p className="text-gray-600 mt-2">{selectedCollection.description}</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {getItemsByCollection(selectedCollection.id).map((item) => (
                  <div key={item.id} className="bg-gray-50 rounded-lg overflow-hidden shadow-md">
                    <div className="h-48 overflow-hidden">
                      <img
                        src={item.image_base64}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-4">
                      <h4 className={`font-bold text-lg mb-2 text-${currentScheme.text}`}>
                        {item.name}
                      </h4>
                      <p className="text-gray-600 text-sm">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`bg-gradient-to-r ${currentScheme.primary} text-white py-12`}>
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-2xl font-bold mb-4">{siteConfig.artisan_name}</h3>
              <p className="text-lg leading-relaxed">{siteConfig.artisan_story}</p>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Contacto</h3>
              <div className="space-y-2">
                <p>{siteConfig.artisan_contact}</p>
                <p>{siteConfig.artisan_phone}</p>
                <p>{siteConfig.artisan_address}</p>
              </div>
            </div>
            
            <div>
              <h3 className="text-xl font-bold mb-4">Síguenos</h3>
              <p>Joyería artesanal de la más alta calidad, creada con pasión y dedicación.</p>
            </div>
          </div>
          
          <div className="border-t border-white border-opacity-20 mt-8 pt-8 text-center">
            <p>&copy; 2025 {siteConfig.site_name}. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

      {/* Hidden Zone */}
      {renderHiddenZone()}

      {/* Modals */}
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      
      {showImageEditor && (
        <ImageEditor
          imageBase64={editingImage?.base64}
          onSave={saveEditedImage}
          onClose={() => {
            setShowImageEditor(false);
            setEditingImage(null);
          }}
        />
      )}

      {/* Admin Panel - Simplified for demo */}
      {isAuthenticated && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className={`bg-gradient-to-r ${currentScheme.primary} text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all`}
          >
            {showAdminPanel ? 'Cerrar Panel' : 'Panel Admin'}
          </button>
          
          {showAdminPanel && (
            <div className="mt-2 bg-white rounded-lg shadow-xl p-4 w-64">
              <h3 className="font-bold mb-3">Panel de Administración</h3>
              <div className="space-y-2">
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
                  Editar Configuración
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
                  Gestionar Colecciones
                </button>
                <button className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded">
                  Agregar Joyas
                </button>
                <button
                  onClick={logout}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-red-600"
                >
                  Cerrar Sesión
                </button>
              </div>
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