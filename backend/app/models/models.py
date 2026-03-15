"""
RepoMind Database Models
"""

from sqlalchemy import (
    Column, String, Text, Integer, Float, Boolean, DateTime,
    ForeignKey, JSON, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
import uuid
import enum

from app.core.database import Base


class AnalysisStatus(str, enum.Enum):
    PENDING = "pending"
    CLONING = "cloning"
    ANALYZING = "analyzing"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    FAILED = "failed"


class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    name = Column(String(255))
    avatar_url = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    projects = relationship("Project", back_populates="user", cascade="all, delete")


class Project(Base):
    __tablename__ = "projects"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    name = Column(String(255), nullable=False)
    description = Column(Text)
    github_url = Column(String(500), nullable=False)
    status = Column(SAEnum(AnalysisStatus), default=AnalysisStatus.PENDING)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="projects")
    repository = relationship("Repository", back_populates="project", uselist=False, cascade="all, delete")
    analysis_results = relationship("AnalysisResult", back_populates="project", cascade="all, delete")
    chat_history = relationship("ChatMessage", back_populates="project", cascade="all, delete")


class Repository(Base):
    __tablename__ = "repositories"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), unique=True)
    github_url = Column(String(500), nullable=False)
    owner = Column(String(255))
    repo_name = Column(String(255))
    branch = Column(String(100), default="main")
    commit_hash = Column(String(50))
    local_path = Column(String(500))

    # Detected metadata
    languages = Column(JSON, default=list)   # [{"name": "Python", "percentage": 70}]
    frameworks = Column(JSON, default=list)  # ["FastAPI", "React"]
    total_files = Column(Integer, default=0)
    total_lines = Column(Integer, default=0)
    size_mb = Column(Float, default=0.0)
    folder_structure = Column(JSON, default=dict)

    cloned_at = Column(DateTime(timezone=True))
    project = relationship("Project", back_populates="repository")
    code_chunks = relationship("CodeChunk", back_populates="repository", cascade="all, delete")


class CodeChunk(Base):
    __tablename__ = "code_chunks"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repository_id = Column(UUID(as_uuid=True), ForeignKey("repositories.id"), index=True)
    file_path = Column(String(1000), nullable=False)
    content = Column(Text, nullable=False)
    chunk_index = Column(Integer, default=0)
    language = Column(String(50))
    chunk_type = Column(String(50))  # function, class, module, route, etc.
    symbol_name = Column(String(255))  # function/class name if applicable
    start_line = Column(Integer)
    end_line = Column(Integer)
    embedding_id = Column(String(100))  # FAISS vector ID

    repository = relationship("Repository", back_populates="code_chunks")


class AnalysisResult(Base):
    __tablename__ = "analysis_results"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), index=True)
    result_type = Column(String(50))  # summary, architecture, workflow, dependencies, docs

    # Structured results stored as JSON
    content = Column(JSON, nullable=False)  # The AI-generated content
    raw_data = Column(JSON)  # Raw analysis data before LLM processing

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    project = relationship("Project", back_populates="analysis_results")


class ChatMessage(Base):
    __tablename__ = "chat_messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    project_id = Column(UUID(as_uuid=True), ForeignKey("projects.id"), index=True)
    session_id = Column(String(100), index=True)
    role = Column(String(20), nullable=False)  # user | assistant
    content = Column(Text, nullable=False)
    sources = Column(JSON, default=list)  # Referenced code chunks
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    project = relationship("Project", back_populates="chat_history")
