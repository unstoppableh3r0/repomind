"""RepoMind - Documentation API"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AnalysisResult
from app.schemas.schemas import ExplainRequest
from app.services import ai_service
from app.services.repo_analyzer import RepositoryAnalyzer
from app.models.models import Repository
from app.core.config import settings

router = APIRouter()

@router.get("/docs/{project_id}")
async def get_documentation(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == uuid.UUID(project_id),
            AnalysisResult.result_type == "documentation",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Documentation not found.")
    return {"project_id": project_id, **record.content}


@router.post("/explain")
async def explain_code(request: ExplainRequest, db: AsyncSession = Depends(get_db)):
    """Explain a specific file or function."""
    repo_result = await db.execute(
        select(Repository).where(Repository.project_id == uuid.UUID(request.project_id))
    )
    repo = repo_result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found.")

    analyzer = RepositoryAnalyzer(settings.REPOS_DIR)
    content = analyzer.read_file(repo.local_path, request.file_path)
    if not content:
        raise HTTPException(status_code=404, detail="File not found.")

    explanation = await ai_service.explain_code(
        file_path=request.file_path,
        code_content=content,
        function_name=request.function_name,
    )
    return {"file_path": request.file_path, "function_name": request.function_name, **explanation}
