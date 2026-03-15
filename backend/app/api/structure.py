"""
RepoMind - Repository Structure API
"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import Repository, AnalysisResult
router = APIRouter()

@router.get("/repo-structure/{project_id}")
async def get_repo_structure(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Repository).where(Repository.project_id == uuid.UUID(project_id)))
    repo = result.scalar_one_or_none()
    if not repo:
        raise HTTPException(status_code=404, detail="Repository not found. Run analysis first.")
    return {
        "project_id": project_id,
        "owner": repo.owner,
        "repo_name": repo.repo_name,
        "branch": repo.branch,
        "commit_hash": repo.commit_hash,
        "total_files": repo.total_files,
        "total_lines": repo.total_lines,
        "size_mb": repo.size_mb,
        "languages": repo.languages or [],
        "frameworks": repo.frameworks or [],
        "folder_tree": repo.folder_structure or {},
    }
