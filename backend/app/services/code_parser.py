"""
RepoMind Code Parser
Extracts: functions, classes, imports, routes, API endpoints, DB models
Supports: Python (AST), JavaScript/TypeScript (regex-based)
"""

import ast
import re
import os
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import logging

logger = logging.getLogger(__name__)


class CodeSymbol:
    """Represents a code symbol (function, class, route, etc.)"""
    def __init__(
        self,
        name: str,
        symbol_type: str,
        file_path: str,
        start_line: int,
        end_line: int,
        content: str,
        docstring: Optional[str] = None,
        imports: Optional[List[str]] = None,
        calls: Optional[List[str]] = None,
        decorators: Optional[List[str]] = None,
    ):
        self.name = name
        self.symbol_type = symbol_type  # function | class | route | model | service
        self.file_path = file_path
        self.start_line = start_line
        self.end_line = end_line
        self.content = content
        self.docstring = docstring
        self.imports = imports or []
        self.calls = calls or []
        self.decorators = decorators or []

    def to_dict(self) -> Dict:
        return {
            "name": self.name,
            "type": self.symbol_type,
            "file_path": self.file_path,
            "start_line": self.start_line,
            "end_line": self.end_line,
            "content": self.content,
            "docstring": self.docstring,
            "imports": self.imports,
            "calls": self.calls,
            "decorators": self.decorators,
        }


# ─── Python AST Parser ────────────────────────────────────────────────────────

class PythonParser:
    """Parses Python files using AST."""

    def parse_file(self, content: str, file_path: str) -> Dict:
        """Parse a Python file and extract all symbols."""
        try:
            tree = ast.parse(content)
        except SyntaxError as e:
            logger.warning(f"Syntax error in {file_path}: {e}")
            return {"symbols": [], "imports": [], "error": str(e)}

        lines = content.splitlines()
        symbols = []
        imports = []

        for node in ast.walk(tree):
            # Extract imports
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                imports.append(self._extract_import(node))

        # Extract top-level and class-level definitions
        for node in ast.iter_child_nodes(tree):
            if isinstance(node, ast.FunctionDef) or isinstance(node, ast.AsyncFunctionDef):
                symbols.append(self._parse_function(node, lines, file_path, []))
            elif isinstance(node, ast.ClassDef):
                class_symbol = self._parse_class(node, lines, file_path)
                symbols.append(class_symbol)
                # Also extract methods
                for item in ast.iter_child_nodes(node):
                    if isinstance(item, (ast.FunctionDef, ast.AsyncFunctionDef)):
                        symbols.append(self._parse_function(item, lines, file_path, node.decorator_list))

        return {"symbols": [s.to_dict() for s in symbols], "imports": imports}

    def _extract_import(self, node) -> str:
        if isinstance(node, ast.Import):
            return ", ".join(alias.name for alias in node.names)
        elif isinstance(node, ast.ImportFrom):
            module = node.module or ""
            names = ", ".join(alias.name for alias in node.names)
            return f"from {module} import {names}"
        return ""

    def _parse_function(self, node, lines: List[str], file_path: str, parent_decorators) -> CodeSymbol:
        # Extract decorators
        decorators = [self._decorator_name(d) for d in node.decorator_list]

        # Determine symbol type from decorators
        symbol_type = "function"
        for dec in decorators:
            if any(route in dec for route in ["get", "post", "put", "delete", "patch", "route"]):
                symbol_type = "route"
                break

        # Extract docstring
        docstring = ast.get_docstring(node)

        # Extract function calls
        calls = []
        for child in ast.walk(node):
            if isinstance(child, ast.Call):
                if isinstance(child.func, ast.Attribute):
                    calls.append(f"{self._attr_name(child.func)}")
                elif isinstance(child.func, ast.Name):
                    calls.append(child.func.id)

        # Extract content
        start = node.lineno - 1
        end = node.end_lineno if hasattr(node, "end_lineno") else start + 10
        content = "\n".join(lines[start:min(end, len(lines))])

        return CodeSymbol(
            name=node.name,
            symbol_type=symbol_type,
            file_path=file_path,
            start_line=node.lineno,
            end_line=end,
            content=content[:2000],
            docstring=docstring,
            calls=list(set(calls))[:20],
            decorators=decorators,
        )

    def _parse_class(self, node, lines: List[str], file_path: str) -> CodeSymbol:
        decorators = [self._decorator_name(d) for d in node.decorator_list]

        # Determine if it's a DB model
        bases = []
        for base in node.bases:
            if isinstance(base, ast.Name):
                bases.append(base.id)
            elif isinstance(base, ast.Attribute):
                bases.append(self._attr_name(base))

        symbol_type = "class"
        model_keywords = {"Model", "Base", "Document", "Schema", "BaseModel", "DeclarativeBase"}
        if any(b in model_keywords for b in bases):
            symbol_type = "model"

        docstring = ast.get_docstring(node)
        start = node.lineno - 1
        end = node.end_lineno if hasattr(node, "end_lineno") else start + 20
        content = "\n".join(lines[start:min(end, len(lines))])

        return CodeSymbol(
            name=node.name,
            symbol_type=symbol_type,
            file_path=file_path,
            start_line=node.lineno,
            end_line=end,
            content=content[:2000],
            docstring=docstring,
            decorators=decorators,
        )

    def _decorator_name(self, node) -> str:
        if isinstance(node, ast.Name):
            return node.id
        elif isinstance(node, ast.Attribute):
            return self._attr_name(node)
        elif isinstance(node, ast.Call):
            return self._decorator_name(node.func)
        return ""

    def _attr_name(self, node) -> str:
        if isinstance(node, ast.Attribute):
            return f"{self._attr_name(node.value)}.{node.attr}"
        elif isinstance(node, ast.Name):
            return node.id
        return ""


# ─── JavaScript/TypeScript Parser ─────────────────────────────────────────────

class JavaScriptParser:
    """Regex-based parser for JS/TS files."""

    # Route patterns (Express, Next.js, etc.)
    ROUTE_PATTERNS = [
        r"(app|router)\.(get|post|put|delete|patch)\s*\(\s*['\"]([^'\"]+)['\"]",
        r"export\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH)\s*\(",
        r"router\.(get|post|put|delete)\s*\(\s*['\"]([^'\"]+)['\"]",
    ]

    # Function patterns
    FUNCTION_PATTERNS = [
        r"(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*\(",
        r"(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\(",
        r"(?:export\s+)?const\s+(\w+)\s*=\s*(?:async\s+)?\w+\s*=>",
    ]

    # Class patterns
    CLASS_PATTERNS = [
        r"(?:export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?",
    ]

    # Import patterns
    IMPORT_PATTERNS = [
        r"import\s+(?:[\w\s{},*]+)\s+from\s+['\"]([^'\"]+)['\"]",
        r"const\s+\w+\s*=\s*require\s*\(['\"]([^'\"]+)['\"]\)",
    ]

    def parse_file(self, content: str, file_path: str) -> Dict:
        """Parse a JS/TS file with regex."""
        lines = content.splitlines()
        symbols = []
        imports = []

        # Extract imports
        for pattern in self.IMPORT_PATTERNS:
            for match in re.finditer(pattern, content):
                imports.append(match.group(1))

        # Extract routes
        for pattern in self.ROUTE_PATTERNS:
            for match in re.finditer(pattern, content, re.MULTILINE):
                line_num = content[:match.start()].count("\n") + 1
                method = match.group(2) if len(match.groups()) > 1 else match.group(1)
                path = match.group(3) if len(match.groups()) > 2 else "/"

                symbols.append({
                    "name": f"{method.upper()} {path}",
                    "type": "route",
                    "file_path": file_path,
                    "start_line": line_num,
                    "end_line": line_num + 10,
                    "content": lines[max(0, line_num - 1):line_num + 10],
                    "decorators": [],
                    "imports": imports,
                    "calls": [],
                })

        # Extract functions
        for pattern in self.FUNCTION_PATTERNS:
            for match in re.finditer(pattern, content, re.MULTILINE):
                func_name = match.group(1)
                if func_name in ("if", "for", "while", "switch", "catch"):
                    continue
                line_num = content[:match.start()].count("\n") + 1
                snippet = "\n".join(lines[max(0, line_num - 1):line_num + 15])

                symbols.append({
                    "name": func_name,
                    "type": "function",
                    "file_path": file_path,
                    "start_line": line_num,
                    "end_line": line_num + 15,
                    "content": snippet[:1500],
                    "decorators": [],
                    "imports": [],
                    "calls": [],
                })

        # Extract classes
        for pattern in self.CLASS_PATTERNS:
            for match in re.finditer(pattern, content, re.MULTILINE):
                class_name = match.group(1)
                line_num = content[:match.start()].count("\n") + 1
                snippet = "\n".join(lines[max(0, line_num - 1):line_num + 30])

                symbols.append({
                    "name": class_name,
                    "type": "class",
                    "file_path": file_path,
                    "start_line": line_num,
                    "end_line": line_num + 30,
                    "content": snippet[:2000],
                    "decorators": [],
                    "imports": imports,
                    "calls": [],
                })

        return {"symbols": symbols, "imports": list(set(imports))}


# ─── Universal Code Parser ────────────────────────────────────────────────────

class CodeParser:
    """Routes parsing to the appropriate language-specific parser."""

    def __init__(self):
        self.python_parser = PythonParser()
        self.js_parser = JavaScriptParser()

    def parse_file(self, content: str, file_path: str, language: str) -> Dict:
        """Parse a file based on its language."""
        try:
            if language in ("Python",):
                return self.python_parser.parse_file(content, file_path)
            elif language in ("JavaScript", "TypeScript", "JavaScript (React)", "TypeScript (React)"):
                return self.js_parser.parse_file(content, file_path)
            else:
                # Generic extraction for other languages
                return self._generic_parse(content, file_path)
        except Exception as e:
            logger.error(f"Error parsing {file_path}: {e}")
            return {"symbols": [], "imports": [], "error": str(e)}

    def _generic_parse(self, content: str, file_path: str) -> Dict:
        """Minimal parsing for unsupported languages."""
        return {
            "symbols": [{
                "name": Path(file_path).stem,
                "type": "module",
                "file_path": file_path,
                "start_line": 1,
                "end_line": len(content.splitlines()),
                "content": content[:2000],
                "decorators": [],
                "imports": [],
                "calls": [],
            }],
            "imports": [],
        }
