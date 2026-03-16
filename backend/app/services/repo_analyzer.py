"""
RepoMind Repository Analyzer
Handles: git cloning, directory scanning, language detection, framework detection
"""

import os
import shutil
import asyncio
import subprocess
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from collections import defaultdict
import logging

logger = logging.getLogger(__name__)

# ─── Language Detection ────────────────────────────────────────────────────────

LANGUAGE_EXTENSIONS: Dict[str, str] = {
    ".py": "Python",
    ".js": "JavaScript",
    ".ts": "TypeScript",
    ".jsx": "JavaScript (React)",
    ".tsx": "TypeScript (React)",
    ".java": "Java",
    ".go": "Go",
    ".rs": "Rust",
    ".rb": "Ruby",
    ".php": "PHP",
    ".cpp": "C++",
    ".c": "C",
    ".cs": "C#",
    ".swift": "Swift",
    ".kt": "Kotlin",
    ".scala": "Scala",
    ".vue": "Vue",
    ".svelte": "Svelte",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".sh": "Shell",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".json": "JSON",
    ".toml": "TOML",
    ".md": "Markdown",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".pytest_cache",
    "venv", ".venv", "env", ".env", "dist", "build",
    ".next", ".nuxt", "coverage", ".coverage", "htmlcov",
    "vendor", "bower_components", ".idea", ".vscode",
    "migrations", ".mypy_cache", "eggs", ".eggs",
}

SKIP_FILES = {
    ".gitignore", ".gitattributes", "package-lock.json",
    "yarn.lock", "poetry.lock", "Pipfile.lock", ".DS_Store",
}

FRAMEWORK_INDICATORS: Dict[str, List[str]] = {
    "FastAPI": ["fastapi", "from fastapi import"],
    "Django": ["django", "from django"],
    "Flask": ["flask", "from flask import"],
    "Express": ["express", "require('express')"],
    "Next.js": ["next/", "from next/", "\"next\":"],
    "React": ["react", "from 'react'", "import React"],
    "Vue": ["vue", "createApp", "<template>"],
    "Angular": ["@angular/core", "NgModule"],
    "Spring Boot": ["@SpringBootApplication", "spring-boot"],
    "Rails": ["rails", "ActiveRecord"],
    "SQLAlchemy": ["sqlalchemy", "from sqlalchemy"],
    "Prisma": ["prisma", "@prisma/client"],
    "TypeORM": ["typeorm", "TypeORM"],
    "Mongoose": ["mongoose", "Schema("],
    "Redis": ["redis", "aioredis"],
    "Celery": ["celery", "from celery"],
    "Docker": ["dockerfile", "docker-compose"],
    "Kubernetes": ["apiVersion:", "kind: Deployment"],
    "GraphQL": ["graphql", "gql", "type Query"],
    "gRPC": ["grpc", "protobuf", ".proto"],
    "Terraform": ["resource \"", "terraform {"],
}


class RepositoryAnalyzer:
    """Clones and performs static analysis on a GitHub repository."""

    def __init__(self, repos_dir: str, max_file_size_kb: int = 500):
        self.repos_dir = repos_dir
        self.max_file_size_bytes = max_file_size_kb * 1024

    # ─── Git Operations ────────────────────────────────────────────────────────

    async def clone_repository(
        self,
        github_url: str,
        project_id: str,
        branch: str = "main",
        github_token: Optional[str] = None,
    ) -> str:
        """Clone a repository to local storage. Returns local path."""
        local_path = os.path.join(self.repos_dir, project_id)

        # Clean up any existing clone
        if os.path.exists(local_path):
            shutil.rmtree(local_path)

        # Inject token for private repos
        if github_token:
            url_parts = github_url.replace("https://", "")
            clone_url = f"https://{github_token}@{url_parts}"
        else:
            clone_url = github_url

        logger.info(f"Cloning {github_url} → {local_path}")

        try:
            # Helper function for synchronous git call
            def run_git_clone(url: str, path: str, branch_name: str = None):
                args = ["git", "clone", "--depth=1"]
                if branch_name:
                    args.extend(["--branch", branch_name])
                args.extend([url, path])
                return subprocess.run(
                    args,
                    capture_output=True,
                    text=True,
                    timeout=300
                )

            # Use to_thread for Windows compatibility (avoids NotImplementedError)
            result = await asyncio.to_thread(run_git_clone, clone_url, local_path, branch)

            if result.returncode != 0:
                logger.warning(f"Git clone with branch {branch} failed, trying default branch...")
                # Try default branch if specified branch fails
                result2 = await asyncio.to_thread(run_git_clone, clone_url, local_path)
                
                if result2.returncode != 0:
                    error_msg = result2.stderr or result.stderr
                    raise RuntimeError(f"Git clone failed: {error_msg}")

            logger.info(f"Successfully cloned to {local_path}")
            return local_path

        except asyncio.TimeoutError:
            raise RuntimeError("Git clone timed out (>5 min)")

    def get_commit_hash(self, local_path: str) -> str:
        """Get the latest commit hash."""
        try:
            result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=local_path, capture_output=True, text=True
            )
            return result.stdout.strip()[:8]
        except Exception:
            return "unknown"

    # ─── Directory Scanning ────────────────────────────────────────────────────

    def scan_directory(self, local_path: str) -> Dict:
        """
        Scan the repo directory and return:
        - file list with metadata
        - folder tree structure
        - language statistics
        - detected frameworks
        """
        files = []
        language_stats: Dict[str, Dict] = defaultdict(lambda: {"files": 0, "lines": 0})
        all_content_sample = []  # For framework detection

        for root, dirs, filenames in os.walk(local_path):
            # Skip unwanted directories in-place (modifies dirs to prevent recursion)
            dirs[:] = [d for d in dirs if d not in SKIP_DIRS and not d.startswith(".")]

            for filename in filenames:
                if filename in SKIP_FILES:
                    continue

                filepath = os.path.join(root, filename)
                relative_path = os.path.relpath(filepath, local_path)
                ext = Path(filename).suffix.lower()

                try:
                    size = os.path.getsize(filepath)
                    if size > self.max_file_size_bytes:
                        continue  # Skip very large files

                    language = LANGUAGE_EXTENSIONS.get(ext, "Other")
                    line_count = 0

                    # Count lines and sample content for framework detection
                    if language not in ("Other",) and size < 100_000:
                        try:
                            with open(filepath, "r", encoding="utf-8", errors="ignore") as f:
                                content = f.read()
                                line_count = content.count("\n")
                                if len(all_content_sample) < 100:
                                    all_content_sample.append(content[:2000])
                        except Exception:
                            pass

                    language_stats[language]["files"] += 1
                    language_stats[language]["lines"] += line_count

                    files.append({
                        "path": relative_path,
                        "name": filename,
                        "extension": ext,
                        "language": language,
                        "size_bytes": size,
                        "line_count": line_count,
                    })

                except (OSError, PermissionError):
                    continue

        total_lines = sum(s["lines"] for s in language_stats.values())
        total_files = len(files)

        # Compute language percentages
        languages = []
        for lang, stats in sorted(language_stats.items(), key=lambda x: x[1]["lines"], reverse=True):
            if lang == "Other":
                continue
            pct = (stats["lines"] / total_lines * 100) if total_lines > 0 else 0
            languages.append({
                "name": lang,
                "percentage": round(pct, 1),
                "file_count": stats["files"],
                "line_count": stats["lines"],
            })

        return {
            "files": files,
            "languages": languages[:10],  # Top 10 languages
            "total_files": total_files,
            "total_lines": total_lines,
            "size_mb": round(sum(f["size_bytes"] for f in files) / 1_048_576, 2),
            "frameworks": self._detect_frameworks(all_content_sample, files),
            "folder_tree": self._build_folder_tree(files, local_path),
        }

    def _detect_frameworks(self, content_samples: List[str], files: List[Dict]) -> List[str]:
        """Detect frameworks and libraries from content samples and file names."""
        detected = set()
        combined = "\n".join(content_samples).lower()

        # Check file-based indicators
        file_names = {f["name"].lower() for f in files}
        if "dockerfile" in file_names:
            detected.add("Docker")
        if "docker-compose.yml" in file_names or "docker-compose.yaml" in file_names:
            detected.add("Docker Compose")
        if any("terraform" in f for f in file_names):
            detected.add("Terraform")

        # Check content-based indicators
        for framework, indicators in FRAMEWORK_INDICATORS.items():
            if any(ind.lower() in combined for ind in indicators):
                detected.add(framework)

        return sorted(detected)

    def _build_folder_tree(self, files: List[Dict], local_path: str) -> Dict:
        """Build a nested folder tree structure."""
        root = {"name": os.path.basename(local_path), "type": "directory", "path": "", "children": {}}

        for file in files:
            parts = Path(file["path"]).parts
            current = root

            for part in parts[:-1]:
                if part not in current["children"]:
                    current["children"][part] = {
                        "name": part,
                        "type": "directory",
                        "path": str(Path(current["path"]) / part),
                        "children": {},
                    }
                current = current["children"][part]

            # Add the file
            filename = parts[-1]
            current["children"][filename] = {
                "name": filename,
                "type": "file",
                "path": file["path"],
                "language": file["language"],
                "size_bytes": file["size_bytes"],
            }

        return self._flatten_tree(root)

    def _flatten_tree(self, node: Dict) -> Dict:
        """Convert children dict to sorted list."""
        if "children" in node and isinstance(node["children"], dict):
            children = list(node["children"].values())
            # Directories first, then files, both alphabetically
            children.sort(key=lambda x: (x["type"] == "file", x["name"].lower()))
            node["children"] = [self._flatten_tree(child) for child in children]
        return node

    # ─── Code File Reading ─────────────────────────────────────────────────────

    def read_file(self, local_path: str, relative_path: str) -> Optional[str]:
        """Read a file's content safely."""
        full_path = os.path.join(local_path, relative_path)
        try:
            with open(full_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception:
            return None

    def get_key_files(self, local_path: str, files: List[Dict]) -> List[Dict]:
        """
        Identify the most important files for analysis:
        entry points, config files, main modules.
        """
        priority_names = {
            "main.py", "app.py", "server.py", "index.js", "index.ts",
            "app.js", "app.ts", "manage.py", "wsgi.py", "asgi.py",
            "package.json", "pyproject.toml", "requirements.txt",
            "Makefile", "docker-compose.yml", "README.md", "setup.py",
            "config.py", "settings.py", "urls.py", "routes.py",
            "models.py", "schema.py", "database.py",
        }

        key_files = []
        for f in files:
            if f["name"].lower() in {p.lower() for p in priority_names}:
                content = self.read_file(local_path, f["path"])
                if content:
                    key_files.append({**f, "content": content[:3000]})  # First 3k chars

        return key_files[:20]  # Limit to 20 key files
