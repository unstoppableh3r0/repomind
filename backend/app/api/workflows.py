"""RepoMind - Workflows API"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AnalysisResult

router = APIRouter()

@router.get("/workflows/{project_id}")
async def get_workflows(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == uuid.UUID(project_id),
            AnalysisResult.result_type == "workflows",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Workflow analysis not found.")
    return {"project_id": project_id, **record.content}
