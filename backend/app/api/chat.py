"""
RepoMind Chat API - Codebase Q&A with LLM-Powered Code Search
(Replaces FAISS vector search with on-demand LLM file selection)
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.models.models import Project, Repository, AnalysisResult, ChatMessage, CodeChunk
from app.schemas.schemas import ChatRequest, ChatResponse, CodeSource
from app.services.repo_analyzer import RepositoryAnalyzer
from app.services import ai_service
from app.core.config import settings

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat_with_codebase(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Ask a question about the codebase using LLM-powered code search."""
    # Verify project exists
    result = await db.execute(
        select(Project).where(Project.id == uuid.UUID(request.project_id))
    )
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Get project summary for context
    summary_result = await db.execute(
        select(AnalysisResult).where(
            AnalysisResult.project_id == uuid.UUID(request.project_id),
            AnalysisResult.result_type == "summary",
        )
    )
    summary_record = summary_result.scalar_one_or_none()
    project_summary = summary_record.content if summary_record else {}

    # Get chat history for this session
    session_id = request.session_id or str(uuid.uuid4())
    history_result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.project_id == uuid.UUID(request.project_id),
            ChatMessage.session_id == session_id,
        )
        .order_by(ChatMessage.created_at.asc())
        .limit(10)
    )
    history = history_result.scalars().all()
    chat_history = [{"role": m.role, "content": m.content} for m in history]

    # ── LLM-Powered Code Search (replaces FAISS) ──────────────────────────────

    # Step 1: Get the symbol index from CodeChunk table
    repo_result = await db.execute(
        select(Repository).where(Repository.project_id == uuid.UUID(request.project_id))
    )
    repo = repo_result.scalar_one_or_none()

    chunks_result = await db.execute(
        select(CodeChunk).where(
            CodeChunk.repository_id == repo.id
        ).limit(500)  # Cap symbol index size
    )
    all_chunks = chunks_result.scalars().all()

    # Build symbol list for LLM file selection
    symbol_list = [
        {
            "file_path": c.file_path,
            "symbol_name": c.symbol_name,
            "chunk_type": c.chunk_type,
        }
        for c in all_chunks
    ]

    # Step 2: Ask LLM to pick relevant files
    relevant_file_paths = await ai_service.select_relevant_files(
        question=request.message,
        symbols=symbol_list,
        max_files=8,
    )

    # Step 3: Read selected files from disk and build context
    relevant_chunks = []
    if repo and repo.local_path:
        analyzer = RepositoryAnalyzer(settings.REPOS_DIR)
        for file_path in relevant_file_paths:
            content = analyzer.read_file(repo.local_path, file_path)
            if content:
                relevant_chunks.append({
                    "file_path": file_path,
                    "content": content[:3000],  # Cap per file
                    "start_line": 1,
                    "end_line": min(len(content.splitlines()), 100),
                    "relevance_score": 0.9,
                })

    # If LLM file selection returned nothing, fall back to chunks from DB
    if not relevant_chunks and all_chunks:
        for chunk in all_chunks[:8]:
            relevant_chunks.append({
                "file_path": chunk.file_path,
                "content": chunk.content[:2000],
                "start_line": chunk.start_line or 0,
                "end_line": chunk.end_line or 0,
                "relevance_score": 0.5,
            })

    # Step 4: Generate AI answer with code context
    ai_result = await ai_service.chat_with_codebase(
        question=request.message,
        relevant_chunks=relevant_chunks,
        chat_history=chat_history,
        project_summary=project_summary,
    )

    # Save messages to DB
    message_id = str(uuid.uuid4())
    sources_data = [
        {
            "file_path": c.get("file_path", ""),
            "snippet": c.get("content", "")[:200],
        }
        for c in relevant_chunks[:5]
    ]

    db.add(ChatMessage(
        project_id=uuid.UUID(request.project_id),
        session_id=session_id,
        role="user",
        content=request.message,
    ))
    db.add(ChatMessage(
        id=uuid.UUID(message_id),
        project_id=uuid.UUID(request.project_id),
        session_id=session_id,
        role="assistant",
        content=ai_result["answer"],
        sources=sources_data,
    ))
    await db.commit()

    # Format sources for response
    sources = [
        CodeSource(
            file_path=c.get("file_path", ""),
            snippet=c.get("content", "")[:300],
            start_line=c.get("start_line", 0),
            end_line=c.get("end_line", 0),
            relevance_score=c.get("relevance_score", 0.0),
        )
        for c in relevant_chunks[:5]
    ]

    return ChatResponse(
        message_id=message_id,
        session_id=session_id,
        answer=ai_result["answer"],
        sources=sources,
        follow_up_questions=ai_result.get("follow_up_questions", []),
    )


@router.get("/chat/{project_id}/history")
async def get_chat_history(
    project_id: str,
    session_id: str = None,
    db: AsyncSession = Depends(get_db),
):
    """Get chat history for a project."""
    query = select(ChatMessage).where(
        ChatMessage.project_id == uuid.UUID(project_id)
    )
    if session_id:
        query = query.where(ChatMessage.session_id == session_id)

    query = query.order_by(ChatMessage.created_at.asc()).limit(100)
    result = await db.execute(query)
    messages = result.scalars().all()

    return {
        "messages": [
            {
                "id": str(m.id),
                "role": m.role,
                "content": m.content,
                "sources": m.sources or [],
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]
    }
