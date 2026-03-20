import asyncio
import uuid
import sys
import os

# Add the current directory to sys.path to allow importing from 'app'
sys.path.append(os.path.join(os.getcwd()))

from app.services.analysis_orchestrator import run_analysis_pipeline
from app.models.models import Project, AnalysisStatus
from app.core.database import AsyncSessionLocal
from sqlalchemy import insert
import contextlib

async def test():
    project_id = str(uuid.uuid4())
    repo_url = "https://github.com/tiangolo/typer"
    db = AsyncSessionLocal()
    try:
        # Create project record
        await db.execute(insert(Project).values(
            id=uuid.UUID(project_id), 
            name="Test Repo", 
            github_url=repo_url,
            status=AnalysisStatus.PENDING
        ))
        await db.commit()
    finally:
        await db.close()

    print(f"Starting analysis for {project_id}")
    try:
        await run_analysis_pipeline(
            project_id=project_id,
            github_url=repo_url,
            branch="main",
            github_token=None
        )
        print("Analysis finished")
    except Exception as e:
        print(f"Analysis failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test())
