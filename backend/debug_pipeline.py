import asyncio
import uuid
from app.services.analysis_orchestrator import run_analysis_pipeline
from app.core.database import AsyncSessionLocal, engine, Base
from app.models.models import Project, AnalysisStatus

async def main():
    # 1. Create a test project
    async with AsyncSessionLocal() as db:
        project_id = str(uuid.uuid4())
        project = Project(
            id=uuid.UUID(project_id),
            name="debug-project",
            github_url="https://github.com/tiangolo/typer",
            status=AnalysisStatus.PENDING
        )
        db.add(project)
        await db.commit()
        print(f"Created debug project: {project_id}")

    # 2. Run analysis manually
    try:
        print("Starting analysis pipeline...")
        await run_analysis_pipeline(
            project_id=project_id,
            github_url="https://github.com/tiangolo/typer",
            branch="main",
            github_token=None
        )
        print("Analysis pipeline finished (check status in DB)")
    except Exception as e:
        print(f"CRITICAL ERROR: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main())
