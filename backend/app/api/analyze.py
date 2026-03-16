"""
RepoMind - Repository Analysis API Endpoints
"""

import uuid
import asyncio
from typing import Optional
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Project, AnalysisStatus
from app.schemas.schemas import AnalyzeRepoRequest, AnalyzeRepoResponse, AnalysisStatusResponse
from app.services.analysis_orchestrator import run_analysis_pipeline, analysis_progress

router = APIRouter()


def validate_github_url(url: str) -> bool:
    """Basic GitHub URL validation."""
    return url.startswith("https://github.com/") and len(url.split("/")) >= 5


@router.post("/analyze-repo", response_model=AnalyzeRepoResponse)
async def analyze_repository(
    request: AnalyzeRepoRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """
    Start repository analysis. Returns immediately with a project_id.
    Poll /analyze-repo/{project_id}/status for progress.
    """
    if not validate_github_url(request.github_url):
        raise HTTPException(
            status_code=400,
            detail="Invalid GitHub URL. Must be https://github.com/owner/repo"
        )

    # Create project record
    project = Project(
        id=uuid.uuid4(),
        name=request.github_url.split("/")[-1].replace(".git", ""),
        github_url=request.github_url,
        status=AnalysisStatus.PENDING,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)

    project_id = str(project.id)

    # Initialize progress
    analysis_progress[project_id] = {
        "status": "pending",
        "current_step": "Queued for analysis...",
        "progress_percent": 0,
    }

    # Start background analysis
    background_tasks.add_task(
        run_analysis_pipeline,
        project_id=project_id,
        github_url=request.github_url,
        branch=request.branch or "main",
        github_token=request.github_token,
    )

    return AnalyzeRepoResponse(
        project_id=project_id,
        status=AnalysisStatus.PENDING,
        message="Analysis started. Poll the status endpoint for progress.",
        estimated_time_seconds=120,
    )


@router.get("/analyze-repo/{project_id}/status", response_model=AnalysisStatusResponse)
async def get_analysis_status(
    project_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Get the current analysis status and progress."""
    # Check in-memory progress first
    progress = analysis_progress.get(project_id)

    if progress:
        return AnalysisStatusResponse(
            project_id=project_id,
            status=progress.get("status", "pending"),
            progress_percent=progress.get("progress_percent", 0),
            current_step=progress.get("current_step", ""),
            error_message=progress.get("error"),
        )

    # Fall back to database
    result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    return AnalysisStatusResponse(
        project_id=project_id,
        status=project.status,
        progress_percent=100 if project.status == AnalysisStatus.COMPLETE else 0,
        current_step=project.status.value,
    )


@router.get("/projects")
async def list_projects(db: AsyncSession = Depends(get_db)):
    """List all analyzed projects."""
    result = await db.execute(
        select(Project).order_by(Project.created_at.desc()).limit(50)
    )
    projects = result.scalars().all()

    return {
        "projects": [
            {
                "id": str(p.id),
                "name": p.name,
                "github_url": p.github_url,
                "status": p.status.value,
                "created_at": p.created_at.isoformat() if p.created_at else None,
            }
            for p in projects
        ]
    }


@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, db: AsyncSession = Depends(get_db)):
    """Delete a project and all its data."""
    result = await db.execute(select(Project).where(Project.id == uuid.UUID(project_id)))
    project = result.scalar_one_or_none()

    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    await db.delete(project)
    await db.commit()

    # Clean up progress tracker
    analysis_progress.pop(project_id, None)

    return {"message": "Project deleted successfully"}
