"""
RepoMind Analysis Orchestrator
Coordinates the full analysis pipeline:
Clone → Scan → Parse → Graph → Embed → AI Analysis
"""

import asyncio
import uuid
from typing import Dict, Optional
from datetime import datetime
import logging

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.models import Project, Repository, CodeChunk, AnalysisResult, AnalysisStatus
from app.services.repo_analyzer import RepositoryAnalyzer
from app.services.code_parser import CodeParser
from app.services.graph_builder import DependencyGraph
from app.services.embedding_service import EmbeddingService, CodeChunker
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
    db: AsyncSession,
) -> None:
    """
    Full async analysis pipeline. Runs as a background task.
    Updates progress in the progress tracker.
    """

    def update_progress(step: str, percent: int):
        analysis_progress[project_id] = {
            "status": "analyzing",
            "current_step": step,
            "progress_percent": percent,
        }

    try:
        # ── Step 1: Clone Repository ───────────────────────────────────────────
        update_progress("Cloning repository...", 5)
        await _update_project_status(db, project_id, AnalysisStatus.CLONING)

        analyzer = RepositoryAnalyzer(settings.REPOS_DIR, settings.MAX_FILE_SIZE_KB)
        local_path = await analyzer.clone_repository(
            github_url, project_id, branch, github_token
        )
        commit_hash = analyzer.get_commit_hash(local_path)

        # Parse owner/repo from URL
        url_parts = github_url.rstrip("/").split("/")
        owner = url_parts[-2] if len(url_parts) >= 2 else "unknown"
        repo_name = url_parts[-1].replace(".git", "") if url_parts else "unknown"

        # ── Step 2: Scan Directory ────────────────────────────────────────────
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

        # ── Step 3: Parse Code ─────────────────────────────────────────────────
        update_progress("Parsing code files...", 30)

        code_parser = CodeParser()
        parsed_files = []
        all_symbols = []
        symbols_by_type: Dict[str, list] = {}

        # Parse most important files (limit for performance)
        source_files = [
            f for f in scan_result["files"]
            if f["language"] in ("Python", "JavaScript", "TypeScript",
                                  "TypeScript (React)", "JavaScript (React)")
            and f["size_bytes"] < 100_000
        ][:200]

        for file_info in source_files:
            content = analyzer.read_file(local_path, file_info["path"])
            if not content:
                continue

            parsed = code_parser.parse_file(
                content, file_info["path"], file_info["language"]
            )
            parsed["file_path"] = file_info["path"]
            parsed_files.append(parsed)

            for symbol in parsed.get("symbols", []):
                all_symbols.append(symbol)
                stype = symbol.get("type", "unknown")
                if stype not in symbols_by_type:
                    symbols_by_type[stype] = []
                symbols_by_type[stype].append(symbol)

        # ── Step 4: Build Dependency Graph ────────────────────────────────────
        update_progress("Building dependency graph...", 45)

        graph_builder = DependencyGraph()
        graph_data = graph_builder.build_from_analysis(parsed_files)

        # ── Step 5: Generate Embeddings ───────────────────────────────────────
        update_progress("Generating embeddings...", 55)
        await _update_project_status(db, project_id, AnalysisStatus.EMBEDDING)

        chunker = CodeChunker(settings.CHUNK_SIZE, settings.CHUNK_OVERLAP)
        embedding_service = EmbeddingService(project_id)

        all_chunks = []
        for parsed in parsed_files:
            file_path = parsed.get("file_path", "")
            symbols = parsed.get("symbols", [])

            if symbols:
                chunks = chunker.chunk_symbols(symbols, file_path)
            else:
                # Fallback to file chunking
                file_info = next(
                    (f for f in scan_result["files"] if f["path"] == file_path), None
                )
                if file_info:
                    content = analyzer.read_file(local_path, file_path)
                    if content:
                        chunks = chunker.chunk_file(
                            content, file_path, file_info.get("language", "Unknown")
                        )
                    else:
                        chunks = []
                else:
                    chunks = []

            all_chunks.extend(chunks)

        # Embed all chunks
        embedded_chunks = await embedding_service.embed_chunks(all_chunks)

        # Save code chunks to DB
        for chunk in embedded_chunks[:5000]:  # Limit DB inserts
            db.add(CodeChunk(
                repository_id=repo.id,
                file_path=chunk.get("file_path", ""),
                content=chunk.get("content", "")[:5000],
                chunk_index=int(chunk.get("chunk_index", 0)),
                language=None,
                chunk_type=chunk.get("chunk_type", "file"),
                symbol_name=chunk.get("symbol_name"),
                start_line=chunk.get("start_line", 0),
                end_line=chunk.get("end_line", 0),
                embedding_id=chunk.get("embedding_id"),
            ))

        # ── Step 6: AI Analysis ────────────────────────────────────────────────
        update_progress("Generating AI analysis...", 70)

        # Generate project summary
        summary = await ai_service.generate_project_summary(
            repo_metadata={"owner": owner, "repo_name": repo_name,
                           "total_files": scan_result["total_files"]},
            key_files=key_files,
            languages=scan_result["languages"],
            frameworks=scan_result["frameworks"],
        )

        # Save summary
        db.add(AnalysisResult(
            project_id=uuid.UUID(project_id),
            result_type="summary",
            content=summary,
            raw_data={"languages": scan_result["languages"], "frameworks": scan_result["frameworks"]},
        ))

        update_progress("Analyzing architecture...", 80)

        # Generate architecture explanation
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

        update_progress("Detecting workflows...", 88)

        # Detect workflows
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

        update_progress("Generating documentation...", 94)

        # Generate onboarding docs
        docs = await ai_service.generate_onboarding_docs(
            summary=summary,
            architecture=architecture,
            workflows=workflows,
            repo_metadata={"owner": owner, "repo_name": repo_name},
        )

        db.add(AnalysisResult(
            project_id=uuid.UUID(project_id),
            result_type="documentation",
            content=docs,
        ))

        # ── Step 7: Complete ──────────────────────────────────────────────────
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
        await db.rollback()
        await _update_project_status(db, project_id, AnalysisStatus.FAILED)
        analysis_progress[project_id] = {
            "status": AnalysisStatus.FAILED,
            "current_step": f"Error: {str(e)[:200]}",
            "progress_percent": 0,
            "error": str(e),
        }


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
