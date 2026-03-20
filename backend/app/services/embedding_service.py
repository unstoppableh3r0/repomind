"""
RepoMind Code Chunker
Splits code files into manageable chunks for storage and search.
(EmbeddingService has been removed — chat uses LLM-powered file selection instead)
"""

from typing import List, Dict
from pathlib import Path
import logging

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
            if content is None:
                content = ""

            if isinstance(content, list):
                content = "\n".join(content)

            if not isinstance(content, str):
                content = str(content)

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

    MAX_CHUNKS_PER_FILE = 50

    def chunk_file(self, content: str, file_path: str, language: str) -> List[Dict]:
        """Fallback: chunk a file by text with overlap."""
        if not content.strip():
            return []

        lines = content.splitlines()
        chunks = []
        chunk_index = 0
        start = 0
        last_start = -1

        while start < len(lines) and chunk_index < self.MAX_CHUNKS_PER_FILE:
            lines_per_chunk = max(1, self.chunk_size // 60)
            end = min(start + lines_per_chunk, len(lines))
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

            overlap_lines = max(1, self.overlap // 60) if self.overlap > 0 else 0
            start = end - overlap_lines

            if start <= last_start and end < len(lines):
                start = end

            last_start = start
            if start >= len(lines):
                break

        return chunks

    def _format_chunk(self, symbol: Dict, file_path: str) -> str:
        """Format a symbol into a rich text chunk."""
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
