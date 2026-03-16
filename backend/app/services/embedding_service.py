"""
RepoMind Embedding Pipeline
Chunks code → Generates embeddings → Stores in FAISS vector database
"""

import os
import json
import pickle
import asyncio
from typing import List, Dict, Tuple, Optional
from pathlib import Path
import logging

import numpy as np
from openai import AsyncOpenAI
import faiss

from app.core.config import settings

logger = logging.getLogger(__name__)


class CodeChunker:
    """Splits code files into semantically meaningful chunks."""

    def __init__(self, chunk_size: int = 1000, overlap: int = 200):
        self.chunk_size = chunk_size
        self.overlap = overlap

    def chunk_symbols(self, symbols: List[Dict], file_path: str) -> List[Dict]:
        """Create chunks from parsed symbols (preferred method)."""
        chunks = []
        for symbol in symbols:
            content = symbol.get("content", "")
            if not content or len(content.strip()) < 20:
                continue

            chunks.append({
                "content": self._format_chunk(symbol, file_path),
                "file_path": file_path,
                "symbol_name": symbol.get("name", ""),
                "symbol_type": symbol.get("type", "unknown"),
                "start_line": symbol.get("start_line", 0),
                "end_line": symbol.get("end_line", 0),
                "chunk_type": "symbol",
            })

        return chunks

    def chunk_file(self, content: str, file_path: str, language: str) -> List[Dict]:
        """Fallback: chunk a file by text with overlap."""
        if not content.strip():
            return []

        lines = content.splitlines()
        chunks = []
        chunk_index = 0
        start = 0

        while start < len(lines):
            end = min(start + self.chunk_size // 50, len(lines))  # ~50 chars/line avg
            chunk_content = "\n".join(lines[start:end])

            if chunk_content.strip():
                chunks.append({
                    "content": f"# File: {file_path}\n# Language: {language}\n\n{chunk_content}",
                    "file_path": file_path,
                    "symbol_name": None,
                    "symbol_type": "file_chunk",
                    "start_line": start + 1,
                    "end_line": end,
                    "chunk_type": "file",
                    "chunk_index": chunk_index,
                })
                chunk_index += 1

            # Move forward with overlap
            overlap_lines = self.overlap // 50
            start = end - overlap_lines
            if start >= len(lines):
                break

        return chunks

    def _format_chunk(self, symbol: Dict, file_path: str) -> str:
        """Format a symbol into a rich text chunk for embedding."""
        parts = [
            f"File: {file_path}",
            f"Type: {symbol.get('type', 'unknown')}",
            f"Name: {symbol.get('name', 'unknown')}",
        ]

        if symbol.get("docstring"):
            parts.append(f"Description: {symbol['docstring']}")

        if symbol.get("decorators"):
            parts.append(f"Decorators: {', '.join(symbol['decorators'])}")

        parts.append(f"\nCode:\n{symbol.get('content', '')}")

        return "\n".join(parts)


class EmbeddingService:
    """Generates and stores embeddings for code chunks."""

    def __init__(self, project_id: str):
        self.project_id = project_id
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.index_path = os.path.join(settings.FAISS_INDEX_DIR, project_id)
        self.index: Optional[faiss.IndexFlatIP] = None
        self.metadata: List[Dict] = []

        os.makedirs(self.index_path, exist_ok=True)

    async def embed_chunks(self, chunks: List[Dict], batch_size: int = 100) -> List[Dict]:
        """
        Generate embeddings for all chunks and store in FAISS.
        Returns chunks with their embedding IDs.
        """
        if not chunks:
            return []

        logger.info(f"Embedding {len(chunks)} chunks for project {self.project_id}")

        all_embeddings = []
        embedded_chunks = []

        # Process in batches to respect API limits
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            texts = [c["content"][:8000] for c in batch]  # API limit

            try:
                response = await self.client.embeddings.create(
                    model=settings.OPENAI_EMBEDDING_MODEL,
                    input=texts,
                )
                batch_embeddings = [item.embedding for item in response.data]
                all_embeddings.extend(batch_embeddings)
                embedded_chunks.extend(batch)
                logger.info(f"Embedded batch {i // batch_size + 1}/{(len(chunks) // batch_size) + 1}")
                
                # Small breather for the CPU/Network
                await asyncio.sleep(0.05)

            except Exception as e:
                logger.error(f"Embedding error for batch {i}: {e}")
                # Add placeholder embeddings to maintain index alignment
                placeholder = [0.0] * 1536
                all_embeddings.extend([placeholder] * len(batch))
                embedded_chunks.extend(batch)

        # Build FAISS index
        if all_embeddings:
            dimension = len(all_embeddings[0])
            vectors = np.array(all_embeddings, dtype=np.float32)

            # Normalize for cosine similarity
            faiss.normalize_L2(vectors)

            self.index = faiss.IndexFlatIP(dimension)
            self.index.add(vectors)
            self.metadata = embedded_chunks

            # Persist to disk
            self._save_index()
            logger.info(f"Saved FAISS index with {self.index.ntotal} vectors")

        # Return chunks with embedding IDs
        for i, chunk in enumerate(embedded_chunks):
            chunk["embedding_id"] = str(i)

        return embedded_chunks

    async def search(self, query: str, top_k: int = 10) -> List[Dict]:
        """
        Search for relevant code chunks using semantic similarity.
        Returns ranked list of chunks with scores.
        """
        # Load index if not in memory
        if self.index is None:
            self._load_index()

        if self.index is None or self.index.ntotal == 0:
            logger.warning(f"No FAISS index for project {self.project_id}")
            return []

        try:
            # Embed the query
            response = await self.client.embeddings.create(
                model=settings.OPENAI_EMBEDDING_MODEL,
                input=[query],
            )
            query_vector = np.array([response.data[0].embedding], dtype=np.float32)
            faiss.normalize_L2(query_vector)

            # Search
            scores, indices = self.index.search(query_vector, min(top_k, self.index.ntotal))

            results = []
            for score, idx in zip(scores[0], indices[0]):
                if idx < len(self.metadata) and idx >= 0:
                    chunk = self.metadata[idx].copy()
                    chunk["relevance_score"] = float(score)
                    results.append(chunk)

            return results

        except Exception as e:
            logger.error(f"Search error: {e}")
            return []

    def _save_index(self):
        """Persist FAISS index and metadata to disk."""
        try:
            faiss.write_index(self.index, os.path.join(self.index_path, "index.faiss"))
            with open(os.path.join(self.index_path, "metadata.json"), "w") as f:
                json.dump(self.metadata, f)
            logger.info(f"Index saved to {self.index_path}")
        except Exception as e:
            logger.error(f"Failed to save index: {e}")

    def _load_index(self):
        """Load FAISS index and metadata from disk."""
        index_file = os.path.join(self.index_path, "index.faiss")
        meta_file = os.path.join(self.index_path, "metadata.json")

        try:
            if os.path.exists(index_file) and os.path.exists(meta_file):
                self.index = faiss.read_index(index_file)
                with open(meta_file, "r") as f:
                    self.metadata = json.load(f)
                logger.info(f"Loaded FAISS index with {self.index.ntotal} vectors")
        except Exception as e:
            logger.error(f"Failed to load index: {e}")
