from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, Form
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import jwt
import hashlib
import base64
from PIL import Image
import io

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()
SECRET_KEY = "jewelry_secret_key_2025"

# Models
class LoginRequest(BaseModel):
    username: str
    password: str

class JewelryItem(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image_base64: str
    collection_id: str
    position: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class JewelryItemCreate(BaseModel):
    name: str
    description: str
    image_base64: str
    collection_id: str
    position: int = 0

class Collection(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    image_base64: str
    position: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CollectionCreate(BaseModel):
    name: str
    description: str
    image_base64: str
    position: int = 0

class SiteConfig(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    # Información básica del sitio
    site_name: str = "Joyería Artesanal"
    site_subtitle: str = "Joyería Artesanal de Alto Standing"
    hero_title: str = "Maestra Artesana"
    hero_description: str = "Cada pieza cuenta una historia única, creada con pasión y dedicación en nuestro taller artesanal."
    collections_title: str = "Nuestras Colecciones"
    collections_subtitle: str = "Cada pieza cuenta una historia única"
    
    # Información del artesano
    artisan_name: str = "Maestra Artesana"
    artisan_story: str = "Con más de 20 años de experiencia en joyería artesanal, cada pieza es única y está hecha con amor y dedicación."
    artisan_contact: str = "contacto@joyeria.com"
    artisan_phone: str = "+34 000 000 000"
    artisan_address: str = "Calle Artesanos 123, Madrid, España"
    
    # Redes sociales
    social_facebook: str = ""
    social_facebook_enabled: bool = False
    social_instagram: str = ""
    social_instagram_enabled: bool = False
    social_tiktok: str = ""
    social_tiktok_enabled: bool = False
    social_whatsapp: str = ""
    social_whatsapp_enabled: bool = False
    social_youtube: str = ""
    social_youtube_enabled: bool = False
    social_twitter: str = ""
    social_twitter_enabled: bool = False
    
    # Configuración visual
    logo_base64: str = ""
    color_scheme: str = "gold"
    
    # Configuración admin
    admin_username: str = "admin"
    admin_password_hash: str = ""
    hidden_zone_position: str = "bottom-right"
    
    # Textos del footer
    footer_title_1: str = "Sobre Nosotros"
    footer_title_2: str = "Contacto"
    footer_title_3: str = "Síguenos"
    footer_text_3: str = "Conecta con nosotros en redes sociales"
    footer_copyright: str = "Todos los derechos reservados."
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SiteConfigUpdate(BaseModel):
    # Información básica del sitio
    site_name: Optional[str] = None
    site_subtitle: Optional[str] = None
    hero_title: Optional[str] = None
    hero_description: Optional[str] = None
    collections_title: Optional[str] = None
    collections_subtitle: Optional[str] = None
    
    # Información del artesano
    artisan_name: Optional[str] = None
    artisan_story: Optional[str] = None
    artisan_contact: Optional[str] = None
    artisan_phone: Optional[str] = None
    artisan_address: Optional[str] = None
    
    # Redes sociales
    social_facebook: Optional[str] = None
    social_facebook_enabled: Optional[bool] = None
    social_instagram: Optional[str] = None
    social_instagram_enabled: Optional[bool] = None
    social_tiktok: Optional[str] = None
    social_tiktok_enabled: Optional[bool] = None
    social_whatsapp: Optional[str] = None
    social_whatsapp_enabled: Optional[bool] = None
    social_youtube: Optional[str] = None
    social_youtube_enabled: Optional[bool] = None
    social_twitter: Optional[str] = None
    social_twitter_enabled: Optional[bool] = None
    
    # Configuración visual
    logo_base64: Optional[str] = None
    color_scheme: Optional[str] = None
    
    # Configuración admin
    admin_username: Optional[str] = None
    admin_password: Optional[str] = None
    hidden_zone_position: Optional[str] = None
    
    # Textos del footer
    footer_title_1: Optional[str] = None
    footer_title_2: Optional[str] = None
    footer_title_3: Optional[str] = None
    footer_text_3: Optional[str] = None
    footer_copyright: Optional[str] = None

# Helper functions
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize default site config
async def init_default_config():
    existing_config = await db.site_config.find_one()
    if not existing_config:
        default_config = SiteConfig(
            admin_password_hash=hash_password("admin123")
        )
        await db.site_config.insert_one(default_config.dict())

# Authentication endpoints
@api_router.post("/auth/login")
async def login(login_data: LoginRequest):
    try:
        config = await db.site_config.find_one()
        if not config:
            await init_default_config()
            config = await db.site_config.find_one()
        
        if (login_data.username == config["admin_username"] and 
            hash_password(login_data.password) == config["admin_password_hash"]):
            
            token = jwt.encode(
                {"username": login_data.username, "exp": datetime.utcnow() + timedelta(days=1)},
                SECRET_KEY,
                algorithm="HS256"
            )
            return {"token": token, "message": "Login successful"}
        else:
            raise HTTPException(status_code=401, detail="Invalid credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Site configuration endpoints
@api_router.get("/config")
async def get_site_config():
    try:
        config = await db.site_config.find_one()
        if not config:
            await init_default_config()
            config = await db.site_config.find_one()
        
        # Remove sensitive data
        config.pop('admin_password_hash', None)
        config.pop('_id', None)
        return config
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/config")
async def update_site_config(config_update: SiteConfigUpdate, token_data: dict = Depends(verify_token)):
    try:
        update_data = {k: v for k, v in config_update.dict().items() if v is not None}
        
        # Hash password if provided
        if 'admin_password' in update_data:
            update_data['admin_password_hash'] = hash_password(update_data['admin_password'])
            del update_data['admin_password']
        
        result = await db.site_config.update_one({}, {"$set": update_data})
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Config not found")
        
        return {"message": "Configuration updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Collection endpoints
@api_router.get("/collections")
async def get_collections():
    try:
        collections = await db.collections.find().sort("position", 1).to_list(1000)
        for collection in collections:
            collection.pop('_id', None)
        return collections
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/collections")
async def create_collection(collection_data: CollectionCreate, token_data: dict = Depends(verify_token)):
    try:
        collection = Collection(**collection_data.dict())
        await db.collections.insert_one(collection.dict())
        return collection
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/collections/{collection_id}")
async def update_collection(collection_id: str, collection_data: CollectionCreate, token_data: dict = Depends(verify_token)):
    try:
        result = await db.collections.update_one(
            {"id": collection_id},
            {"$set": collection_data.dict()}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Collection not found")
        return {"message": "Collection updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/collections/{collection_id}")
async def delete_collection(collection_id: str, token_data: dict = Depends(verify_token)):
    try:
        # Delete all jewelry items in this collection
        await db.jewelry_items.delete_many({"collection_id": collection_id})
        
        # Delete the collection
        result = await db.collections.delete_one({"id": collection_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Collection not found")
        
        return {"message": "Collection and its items deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Jewelry items endpoints
@api_router.get("/collections/{collection_id}/items")
async def get_jewelry_items(collection_id: str):
    try:
        items = await db.jewelry_items.find({"collection_id": collection_id}).sort("position", 1).to_list(1000)
        for item in items:
            item.pop('_id', None)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/jewelry-items")
async def get_all_jewelry_items():
    try:
        items = await db.jewelry_items.find().sort("position", 1).to_list(1000)
        for item in items:
            item.pop('_id', None)
        return items
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/jewelry-items")
async def create_jewelry_item(item_data: JewelryItemCreate, token_data: dict = Depends(verify_token)):
    try:
        jewelry_item = JewelryItem(**item_data.dict())
        await db.jewelry_items.insert_one(jewelry_item.dict())
        return jewelry_item
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.put("/jewelry-items/{item_id}")
async def update_jewelry_item(item_id: str, item_data: JewelryItemCreate, token_data: dict = Depends(verify_token)):
    try:
        result = await db.jewelry_items.update_one(
            {"id": item_id},
            {"$set": item_data.dict()}
        )
        if result.modified_count == 0:
            raise HTTPException(status_code=404, detail="Jewelry item not found")
        return {"message": "Jewelry item updated successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/jewelry-items/{item_id}")
async def delete_jewelry_item(item_id: str, token_data: dict = Depends(verify_token)):
    try:
        result = await db.jewelry_items.delete_one({"id": item_id})
        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Jewelry item not found")
        return {"message": "Jewelry item deleted successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Initialize demo data
@api_router.post("/init-demo-data")
async def init_demo_data():
    try:
        # Check if demo data already exists
        existing_collections = await db.collections.count_documents({})
        if existing_collections > 0:
            return {"message": "Demo data already exists"}
        
        # Sample collections with sample jewelry data
        collections_data = [
            {
                "name": "Anillos Elegantes",
                "description": "Colección exclusiva de anillos artesanales con diseños únicos y materiales de la más alta calidad.",
                "image_base64": "data:image/jpeg;base64,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",
                "position": 0
            },
            {
                "name": "Collares Exclusivos", 
                "description": "Piezas únicas de collares con gemas seleccionadas y diseños contemporáneos que resaltan la elegancia natural.",
                "image_base64": "data:image/jpeg;base64,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",
                "position": 1
            },
            {
                "name": "Pulseras Artesanales",
                "description": "Creaciones únicas de pulseras hechas a mano con técnicas tradicionales y materiales nobles.",  
                "image_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCADIAMgDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD6pooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAP//Z",
                "position": 2
            }
        ]

        # Create collections
        for collection_data in collections_data:
            collection = Collection(**collection_data)
            await db.collections.insert_one(collection.dict())

        # Sample jewelry items for each collection
        jewelry_items = [
            # Anillos Elegantes
            {"name": "Anillo de Compromiso Vintage", "description": "Elegante anillo de oro blanco con diamante central", "image_base64": "https://images.pexels.com/photos/32799156/pexels-photo-32799156.jpeg", "collection_id": collections_data[0]["id"], "position": 0},
            {"name": "Alianza Clásica", "description": "Alianza tradicional de oro amarillo pulido", "image_base64": "https://images.pexels.com/photos/32778172/pexels-photo-32778172.jpeg", "collection_id": collections_data[0]["id"], "position": 1},
            {"name": "Anillo de Eternidad", "description": "Diseño contemporáneo con múltiples diamantes", "image_base64": "https://images.unsplash.com/photo-1743594789385-323b38491cdc", "collection_id": collections_data[0]["id"], "position": 2},
            {"name": "Sortija de Cocktail", "description": "Anillo llamativo con gema central de color", "image_base64": "https://images.unsplash.com/photo-1643236095049-a120dc5e8384", "collection_id": collections_data[0]["id"], "position": 3},
            {"name": "Anillo Minimalista", "description": "Diseño sencillo y elegante para uso diario", "image_base64": "https://images.pexels.com/photos/32805134/pexels-photo-32805134.jpeg", "collection_id": collections_data[0]["id"], "position": 4},
            
            # Collares Exclusivos
            {"name": "Collar de Diamantes", "description": "Collar de lujo con diamantes engarzados", "image_base64": "https://images.unsplash.com/photo-1630534591724-dba93846b629", "collection_id": collections_data[1]["id"], "position": 0},
            {"name": "Gargantilla de Perlas", "description": "Collar corto con perlas naturales cultivadas", "image_base64": "https://images.unsplash.com/photo-1561060511-78b14b799fe1", "collection_id": collections_data[1]["id"], "position": 1},
            {"name": "Collar de Cadena Vintage", "description": "Cadena clásica de oro con colgante único", "image_base64": "https://images.pexels.com/photos/11185100/pexels-photo-11185100.jpeg", "collection_id": collections_data[1]["id"], "position": 2},
            {"name": "Collar Statement", "description": "Pieza llamativa para ocasiones especiales", "image_base64": "https://images.pexels.com/photos/9649263/pexels-photo-9649263.jpeg", "collection_id": collections_data[1]["id"], "position": 3},
            {"name": "Collar de Gemas", "description": "Diseño colorido con piedras preciosas múltiples", "image_base64": "https://images.unsplash.com/photo-1634295889011-439a70d7799b", "collection_id": collections_data[1]["id"], "position": 4},
            
            # Pulseras Artesanales
            {"name": "Pulsera de Cuentas Artesanales", "description": "Pulsera hecha a mano con cuentas únicas", "image_base64": "https://images.pexels.com/photos/32799171/pexels-photo-32799171.jpeg", "collection_id": collections_data[2]["id"], "position": 0},
            {"name": "Brazalete de Plata", "description": "Brazalete sólido con grabados tradicionales", "image_base64": "https://images.pexels.com/photos/20535490/pexels-photo-20535490.jpeg", "collection_id": collections_data[2]["id"], "position": 1},
            {"name": "Pulsera de Cadena Delicada", "description": "Cadena fina con charms personalizados", "image_base64": "https://images.pexels.com/photos/7679447/pexels-photo-7679447.jpeg", "collection_id": collections_data[2]["id"], "position": 2},
            {"name": "Pulsera de Cuero y Metal", "description": "Diseño moderno combinando materiales", "image_base64": "https://images.unsplash.com/photo-1721103418981-0ee59b80592e", "collection_id": collections_data[2]["id"], "position": 3},
            {"name": "Pulsera de Eslabones", "description": "Eslabones entrelazados en oro rosa", "image_base64": "https://images.unsplash.com/photo-1721103427881-efdc0c7d011f", "collection_id": collections_data[2]["id"], "position": 4}
        ]

        # Create jewelry items
        for item_data in jewelry_items:
            jewelry_item = JewelryItem(**item_data)
            await db.jewelry_items.insert_one(jewelry_item.dict())

        return {"message": "Demo data initialized successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize default config on startup
@app.on_event("startup")
async def startup_event():
    await init_default_config()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()