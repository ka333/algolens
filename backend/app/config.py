# Configuration Settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Defaults to local PostgreSQL, overridden in production by Render environment variables
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/algolens"

    class Config:
        env_file = ".env"

settings = Settings()
