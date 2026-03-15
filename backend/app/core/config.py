"""
RepoMind Configuration - Environment-based settings
"""

from pydantic_settings import BaseSettings
from typing import List
import os


class Settings(BaseSettings):
    # App
    APP_NAME: str = "RepoMind"
    DEBUG: bool = False
    SECRET_KEY: str = "change-this-secret-key-in-production"

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:password@localhost:5432/repomind"

    # Redis (for job queuing)
    REDIS_URL: str = "redis://localhost:6379"

    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4o"
    OPENAI_EMBEDDING_MODEL: str = "text-embedding-3-small"

    # GitHub (optional - for private repos)
    GITHUB_TOKEN: str = ""

    # CORS
    ALLOWED_ORIGINS: List[str] = [
        "http://localhost:3000",
        "https://repomind.vercel.app",
    ]

    # File storage
    REPOS_DIR: str = "/tmp/repomind_repos"
    FAISS_INDEX_DIR: str = "/tmp/repomind_faiss"

    # Analysis limits
    MAX_REPO_SIZE_MB: int = 500
    MAX_FILE_SIZE_KB: int = 500
    MAX_FILES_PER_REPO: int = 5000

    # Chunking settings
    CHUNK_SIZE: int = 1000
    CHUNK_OVERLAP: int = 200

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()

# Ensure directories exist
os.makedirs(settings.REPOS_DIR, exist_ok=True)
os.makedirs(settings.FAISS_INDEX_DIR, exist_ok=True)
