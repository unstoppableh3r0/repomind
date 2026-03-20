"""
RepoMind Analysis Orchestrator
Coordinates the full analysis pipeline:
Clone → Scan → Parse → Graph → AI Analysis
(No embedding — chat uses on-demand LLM-powered file selection)
"""

import asyncio
import uuid
from typing import Dict, List, Optional
from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.core.database import AsyncSessionLocal
from app.models.models import Project, Repository, CodeChunk, AnalysisResult, AnalysisStatus
from app.services.repo_analyzer import RepositoryAnalyzer
from app.services.code_parser import CodeParser
from app.services.graph_builder import DependencyGraph
from app.services import ai_service
from app.core.config import settings

logger = logging.getLogger(__name__)

# In-memory progress tracker (use Redis in production)
analysis_progress: Dict[str, Dict] = {}


async def run_analysis_pipeline(
    project_id: str,
    github_url: str,
    branch: str,
    github_token: Optional[str],
) -> None:
    """
    Full async analysis pipeline. Runs as a background task.

    Phase 1: Clone + Scan
    Phase 2: Parse files + Build graph + Save symbols to DB
    Phase 3: AI Analysis (summary, architecture, workflows, docs)
    """

    def update_progress(step: str, percent: int):
        analysis_progress[project_id] = {
            "status": "analyzing",
            "current_step": step,
            "progress_percent": percent,
        }

    db = AsyncSessionLocal()
    try:
        # ── Phase 1: Clone + Scan ──────────────────────────────────────────────
        update_progress("Cloning repository...", 5)
        await _update_project_status(db, project_id, AnalysisStatus.CLONING)

        analyzer = RepositoryAnalyzer(settings.REPOS_DIR, settings.MAX_FILE_SIZE_KB)
        local_path = await analyzer.clone_repository(
            github_url, project_id, branch, github_token
        )
        commit_hash = analyzer.get_commit_hash(local_path)

        url_parts = github_url.rstrip("/").split("/")
        owner = url_parts[-2] if len(url_parts) >= 2 else "unknown"
        repo_name = url_parts[-1].replace(".git", "") if url_parts else "unknown"

        update_progress("Scanning repository structure...", 15)
        await _update_project_status(db, project_id, AnalysisStatus.ANALYZING)

        scan_result = analyzer.scan_directory(local_path)
        key_files = analyzer.get_key_files(local_path, scan_result["files"])

        # Save repository metadata
        repo = Repository(
            project_id=uuid.UUID(project_id),
            github_url=github_url,
            owner=owner,
            repo_name=repo_name,
            branch=branch,
            commit_hash=commit_hash,
            local_path=local_path,
            languages=scan_result["languages"],
            frameworks=scan_result["frameworks"],
            total_files=scan_result["total_files"],
            total_lines=scan_result["total_lines"],
            size_mb=scan_result["size_mb"],
            folder_structure=scan_result["folder_tree"],
            cloned_at=datetime.utcnow(),
        )
        db.add(repo)
        await db.flush()

        # ── Phase 2: Parse + Graph + Save Symbols ──────────────────────────────
        update_progress("Parsing codebase & building graph...", 30)

        code_parser = CodeParser()
        graph_builder = DependencyGraph()
        symbols_by_type: Dict[str, list] = {}

        source_files = [
            f for f in scan_result["files"]
            if f["language"] in ("Python", "JavaScript", "TypeScript",
                                  "TypeScript (React)", "JavaScript (React)")
            and f["size_bytes"] < 100_000
        ][:200]

        logger.info(f"Phase 2: Parsing {len(source_files)} files")

        chunk_count = 0

        for i, file_info in enumerate(source_files):
            await asyncio.sleep(0.01)

            file_path = file_info["path"]
            content = analyzer.read_file(local_path, file_path)
            if not content:
                continue

            # Parse
            parsed = code_parser.parse_file(
                content, file_path, file_info["language"]
            )
            parsed["file_path"] = file_path

            # Add to graph
            graph_builder.add_parsed_file(parsed)

            # Collect symbols for AI analysis (capped at 50 per type)
            for symbol in parsed.get("symbols", []):
                stype = symbol.get("type", "unknown")
                if stype not in symbols_by_type:
                    symbols_by_type[stype] = []
                if len(symbols_by_type[stype]) < 50:
                    symbols_by_type[stype].append(symbol)

            # Save symbols to CodeChunk table (lightweight, no API calls)
            for symbol in parsed.get("symbols", []):
                symbol_content = symbol.get("content", "")
                if isinstance(symbol_content, list):
                    symbol_content = "\n".join(symbol_content)
                if not isinstance(symbol_content, str):
                    symbol_content = str(symbol_content)
                if not symbol_content or len(symbol_content.strip()) < 20:
                    continue

                db.add(CodeChunk(
                    repository_id=repo.id,
                    file_path=file_path,
                    content=symbol_content[:5000],
                    chunk_index=chunk_count,
                    language=file_info.get("language"),
                    chunk_type=symbol.get("type", "unknown"),
                    symbol_name=symbol.get("name", ""),
                    start_line=symbol.get("start_line", 0),
                    end_line=symbol.get("end_line", 0),
                    embedding_id=None,
                ))
                chunk_count += 1

            # Flush periodically to keep session light
            if i % 30 == 0 and i > 0:
                await db.flush()
                update_progress(
                    f"Parsing files ({i}/{len(source_files)})...",
                    30 + int((i / len(source_files)) * 25)
                )

        await db.flush()
        logger.info(f"Saved {chunk_count} code symbols to DB")

        # Finalize graph
        graph_data = graph_builder.get_visualization_data()
        logger.info(f"Graph: {graph_data.get('metrics', {}).get('node_count', 0)} nodes, "
                     f"{graph_data.get('metrics', {}).get('edge_count', 0)} edges")

        # ── Phase 3: AI Analysis + Save ────────────────────────────────────────
        update_progress("Generating AI analysis...", 60)

        # Summary
        try:
            summary = await ai_service.generate_project_summary(
                repo_metadata={"owner": owner, "repo_name": repo_name,
                               "total_files": scan_result["total_files"]},
                key_files=key_files,
                languages=scan_result["languages"],
                frameworks=scan_result["frameworks"],
            )
            db.add(AnalysisResult(
                project_id=uuid.UUID(project_id),
                result_type="summary",
                content=summary,
                raw_data={"languages": scan_result["languages"], "frameworks": scan_result["frameworks"]},
            ))
            await db.flush()
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            summary = {"project_name": repo_name, "description": "Analysis partially failed."}

        update_progress("Analyzing architecture...", 72)

        # Architecture (includes graph)
        try:
            architecture = await ai_service.generate_architecture_explanation(
                summary=summary,
                graph_data=graph_data,
                symbols_by_type=symbols_by_type,
                key_files=key_files,
            )
            db.add(AnalysisResult(
                project_id=uuid.UUID(project_id),
                result_type="architecture",
                content={**architecture, "graph": graph_data},
            ))
            await db.flush()
        except Exception as e:
            logger.error(f"Architecture analysis failed: {e}")
            db.add(AnalysisResult(
                project_id=uuid.UUID(project_id),
                result_type="architecture",
                content={"graph": graph_data},
            ))
            await db.flush()
            architecture = {}

        update_progress("Detecting workflows...", 82)

        # Workflows
        try:
            workflows = await ai_service.detect_workflows(
                routes=symbols_by_type.get("route", []),
                symbols_by_type=symbols_by_type,
                key_files=key_files,
            )
            db.add(AnalysisResult(
                project_id=uuid.UUID(project_id),
                result_type="workflows",
                content={"workflows": workflows},
            ))
            await db.flush()
        except Exception as e:
            logger.error(f"Workflow detection failed: {e}")

        update_progress("Generating documentation...", 90)

        # Docs
        try:
            docs = await ai_service.generate_onboarding_docs(
                summary=summary,
                architecture=architecture,
                workflows=workflows if 'workflows' in dir() else [],
                repo_metadata={"owner": owner, "repo_name": repo_name},
            )
            db.add(AnalysisResult(
                project_id=uuid.UUID(project_id),
                result_type="documentation",
                content=docs,
            ))
        except Exception as e:
            logger.error(f"Documentation generation failed: {e}")

        # ── Complete ───────────────────────────────────────────────────────────
        await db.commit()
        await _update_project_status(db, project_id, AnalysisStatus.COMPLETE)

        analysis_progress[project_id] = {
            "status": AnalysisStatus.COMPLETE,
            "current_step": "Analysis complete!",
            "progress_percent": 100,
        }
        logger.info(f"✅ Analysis complete for project {project_id}")

    except Exception as e:
        logger.error(f"❌ Analysis failed for project {project_id}: {e}", exc_info=True)
        with open("analysis_error.log", "a") as f:
            f.write(f"Project {project_id} failed: {str(e)}\n")
            import traceback
            f.write(traceback.format_exc() + "\n")
        await db.rollback()
        await _update_project_status(db, project_id, AnalysisStatus.FAILED)
        analysis_progress[project_id] = {
            "status": AnalysisStatus.FAILED,
            "current_step": f"Error: {str(e)[:200]}",
            "progress_percent": 0,
            "error": str(e),
        }
    finally:
        await db.close()


async def _update_project_status(db: AsyncSession, project_id: str, status: AnalysisStatus):
    """Update project status in the database."""
    try:
        await db.execute(
            update(Project)
            .where(Project.id == uuid.UUID(project_id))
            .values(status=status)
        )
        await db.commit()
    except Exception as e:
        logger.error(f"Failed to update project status: {e}")
