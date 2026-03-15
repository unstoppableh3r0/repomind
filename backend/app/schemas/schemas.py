"""
RepoMind API Schemas - Pydantic models for request/response validation
"""

from pydantic import BaseModel, HttpUrl, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum


class AnalysisStatus(str, Enum):
    PENDING = "pending"
    CLONING = "cloning"
    ANALYZING = "analyzing"
    EMBEDDING = "embedding"
    COMPLETE = "complete"
    FAILED = "failed"


# ─── Repository Analysis ───────────────────────────────────────────────────────

class AnalyzeRepoRequest(BaseModel):
    github_url: str = Field(..., description="GitHub repository URL")
    branch: Optional[str] = Field("main", description="Branch to analyze")
    github_token: Optional[str] = Field(None, description="Token for private repos")

    class Config:
        json_schema_extra = {
            "example": {
                "github_url": "https://github.com/fastapi/fastapi",
                "branch": "main"
            }
        }


class AnalyzeRepoResponse(BaseModel):
    project_id: str
    status: AnalysisStatus
    message: str
    estimated_time_seconds: Optional[int] = None


class AnalysisStatusResponse(BaseModel):
    project_id: str
    status: AnalysisStatus
    progress_percent: int
    current_step: str
    error_message: Optional[str] = None


# ─── Repository Structure ──────────────────────────────────────────────────────

class FileNode(BaseModel):
    name: str
    path: str
    type: str  # file | directory
    language: Optional[str] = None
    size_bytes: Optional[int] = None
    children: Optional[List["FileNode"]] = None

FileNode.model_rebuild()


class LanguageInfo(BaseModel):
    name: str
    percentage: float
    file_count: int
    line_count: int


class RepoStructureResponse(BaseModel):
    project_id: str
    owner: str
    repo_name: str
    branch: str
    total_files: int
    total_lines: int
    size_mb: float
    languages: List[LanguageInfo]
    frameworks: List[str]
    folder_tree: FileNode


# ─── Architecture ──────────────────────────────────────────────────────────────

class GraphNode(BaseModel):
    id: str
    label: str
    type: str  # module | service | database | api | external
    file_path: Optional[str] = None
    description: Optional[str] = None
    metadata: Dict[str, Any] = {}


class GraphEdge(BaseModel):
    id: str
    source: str
    target: str
    label: Optional[str] = None
    type: str  # import | call | extends | implements


class ArchitectureResponse(BaseModel):
    project_id: str
    summary: str
    nodes: List[GraphNode]
    edges: List[GraphEdge]
    modules: List[Dict[str, Any]]
    tech_stack: List[str]
    patterns_detected: List[str]  # MVC, microservices, etc.


# ─── Workflows ─────────────────────────────────────────────────────────────────

class WorkflowStep(BaseModel):
    order: int
    name: str
    description: str
    file_path: Optional[str] = None
    function_name: Optional[str] = None
    type: str  # route | service | db | external


class Workflow(BaseModel):
    id: str
    name: str
    description: str
    entry_point: str
    steps: List[WorkflowStep]
    diagram_nodes: List[GraphNode]
    diagram_edges: List[GraphEdge]


class WorkflowsResponse(BaseModel):
    project_id: str
    workflows: List[Workflow]


# ─── Chat ──────────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    project_id: str
    message: str
    session_id: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "project_id": "123e4567-e89b-12d3-a456-426614174000",
                "message": "How does authentication work in this codebase?",
                "session_id": "session_abc123"
            }
        }


class CodeSource(BaseModel):
    file_path: str
    snippet: str
    start_line: int
    end_line: int
    relevance_score: float


class ChatResponse(BaseModel):
    message_id: str
    session_id: str
    answer: str
    sources: List[CodeSource]
    follow_up_questions: List[str]


# ─── Documentation ─────────────────────────────────────────────────────────────

class DocumentationResponse(BaseModel):
    project_id: str
    onboarding_guide: str
    architecture_overview: str
    setup_instructions: str
    modules_documentation: List[Dict[str, str]]
    api_documentation: Optional[str] = None
    generated_at: datetime


# ─── Function Explainer ────────────────────────────────────────────────────────

class ExplainRequest(BaseModel):
    project_id: str
    file_path: str
    function_name: Optional[str] = None
    line_number: Optional[int] = None


class ExplainResponse(BaseModel):
    file_path: str
    function_name: Optional[str]
    purpose: str
    what_it_does: str
    dependencies: List[str]
    called_by: List[str]
    code_snippet: str
