# Configuration Settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Defaults to local SQLite, overridden in production/development by environment variables
    database_url: str = "sqlite+aiosqlite:///./algolens.db"

    class Config:
        env_file = ".env"

settings = Settings()
