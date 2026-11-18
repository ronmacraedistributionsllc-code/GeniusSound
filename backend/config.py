import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    # App settings
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    APP_NAME: str = os.getenv("APP_NAME", "Genius Sound")
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://localhost:5432/geniussound")
    
    # ComfyUI
    COMFYUI_URL: str = os.getenv("COMFYUI_URL", "http://localhost:8188")
    COMFYUI_API_KEY: str = os.getenv("COMFYUI_API_KEY", "")
    
    # Upload settings
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "/tmp/geniussound/uploads")
    MAX_UPLOAD_SIZE: int = 50 * 1024 * 1024  # 50MB
    
    # CORS
    ALLOWED_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:8000",
        "https://geniussound.com"
    ]
    
    def __init__(self):
        # Create upload directory if it doesn't exist
        os.makedirs(self.UPLOAD_DIR, exist_ok=True)


settings = Settings()
