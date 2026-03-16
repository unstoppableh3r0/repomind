from app.core.config import settings
import os

print(f"DEBUG: {settings.DEBUG}")
print(f"DATABASE_URL: {settings.DATABASE_URL}")
print(f"OPENAI_API_KEY: {settings.OPENAI_API_KEY[:10]}...{settings.OPENAI_API_KEY[-5:] if settings.OPENAI_API_KEY else 'EMPTY'}")
print(f"REPOS_DIR: {settings.REPOS_DIR}")
print(f"FAISS_INDEX_DIR: {settings.FAISS_INDEX_DIR}")
