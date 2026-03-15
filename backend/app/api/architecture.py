"""RepoMind - Architecture API"""
import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.models.models import AnalysisResult

router = APIRouter()

@router.get("/architecture/{project_id}")
async def get_architecture(project_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == uuid.UUID(project_id),
            AnalysisResult.result_type == "architecture",
        )
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Architecture analysis not found.")
    
    summary_result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == uuid.UUID(project_id),
            AnalysisResult.result_type == "summary",
        )
    )
    summary_record = summary_result.scalar_one_or_none()
    summary = summary_record.content if summary_record else {}

    return {"project_id": project_id, "summary": summary, **record.content}
