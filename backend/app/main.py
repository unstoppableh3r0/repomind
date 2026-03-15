"""
RepoMind Backend - FastAPI Application Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from contextlib import asynccontextmanager
import logging

from app.core.config import settings
from app.core.database import engine, Base
from app.api import analyze, chat, structure, architecture, workflows, docs

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    logger.info("Starting RepoMind API...")
    # Create database tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables initialized.")
    yield
    logger.info("Shutting down RepoMind API...")


app = FastAPI(
    title="RepoMind API",
    description="AI-powered developer onboarding platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API routers
app.include_router(analyze.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(chat.router, prefix="/api/v1", tags=["Chat"])
app.include_router(structure.router, prefix="/api/v1", tags=["Structure"])
app.include_router(architecture.router, prefix="/api/v1", tags=["Architecture"])
app.include_router(workflows.router, prefix="/api/v1", tags=["Workflows"])
app.include_router(docs.router, prefix="/api/v1", tags=["Documentation"])


@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}
