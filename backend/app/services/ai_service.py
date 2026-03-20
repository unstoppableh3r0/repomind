"""
RepoMind AI Service
Handles all LLM interactions: analysis, architecture explanation, workflow detection, chat
"""

import json
from typing import List, Dict, Optional, AsyncIterator
from openai import AsyncOpenAI
import logging

from app.core.config import settings

logger = logging.getLogger(__name__)

client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
MODEL = settings.OPENAI_MODEL


# ─── System Prompts ────────────────────────────────────────────────────────────

SYSTEM_PROMPT_ANALYST = """You are an expert software architect and code analyst.
You help developers understand complex codebases quickly and accurately.
Always provide structured, actionable insights. Be concise but thorough.
When analyzing code, focus on: purpose, architecture patterns, key flows, and gotchas."""

SYSTEM_PROMPT_CHAT = """You are an AI assistant specialized in helping developers understand codebases.
You have access to relevant code snippets from the repository being analyzed.
Answer questions accurately based on the provided code context.
Always cite specific file paths and function names when relevant.
If you're unsure about something, say so rather than guessing."""


# ─── Analysis Functions ────────────────────────────────────────────────────────

async def generate_project_summary(
    repo_metadata: Dict,
    key_files: List[Dict],
    languages: List[Dict],
    frameworks: List[str],
) -> Dict:
    """Generate a comprehensive project summary."""

    key_files_text = "\n\n".join([
        f"=== {f['name']} ===\n{f.get('content', '')[:1500]}"
        for f in key_files[:10]
    ])

    prompt = f"""Analyze this GitHub repository and provide a comprehensive summary.

Repository: {repo_metadata.get('owner', '')}/{repo_metadata.get('repo_name', '')}
Languages: {', '.join(l['name'] for l in languages[:5])}
Frameworks: {', '.join(frameworks)}
Total Files: {repo_metadata.get('total_files', 0)}

Key files content:
{key_files_text}

Return a JSON object with EXACTLY these fields:
{{
    "project_name": "name of the project",
    "project_type": "type (web app, API, library, CLI tool, etc.)",
    "description": "2-3 sentence description of what this project does",
    "purpose": "the main problem this project solves",
    "main_modules": [
        {{"name": "module name", "description": "what it does", "path": "file/dir path"}}
    ],
    "tech_stack": ["technology list with versions if detectable"],
    "architecture_pattern": "MVC / Microservices / Monolith / Event-Driven / etc.",
    "key_features": ["feature 1", "feature 2", "..."],
    "suggested_starting_points": ["file to read first", "..."],
    "complexity_level": "beginner / intermediate / advanced",
    "onboarding_advice": "practical advice for a new developer joining this project"
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Failed to parse summary JSON: {e}")
        return {"error": "Failed to generate summary", "raw": response.choices[0].message.content}


async def generate_architecture_explanation(
    summary: Dict,
    graph_data: Dict,
    symbols_by_type: Dict,
    key_files: List[Dict],
) -> Dict:
    """Generate architecture explanation with module breakdown."""

    routes = symbols_by_type.get("route", [])[:20]
    models = symbols_by_type.get("model", [])[:20]
    services = symbols_by_type.get("service", [])[:10]

    routes_text = "\n".join([f"- {r['name']} in {r['file_path']}" for r in routes])
    models_text = "\n".join([f"- {m['name']} in {m['file_path']}" for m in models])
    services_text = "\n".join([f"- {s['name']} in {s['file_path']}" for s in services])

    prompt = f"""Based on this codebase analysis, provide a detailed architecture explanation.

Project: {summary.get('project_name', 'Unknown')} - {summary.get('description', '')}
Architecture Pattern: {summary.get('architecture_pattern', 'Unknown')}

API Routes detected:
{routes_text or 'None detected'}

Database Models detected:
{models_text or 'None detected'}

Services detected:
{services_text or 'None detected'}

Dependency graph metrics:
- Nodes: {graph_data.get('metrics', {}).get('node_count', 0)}
- Edges: {graph_data.get('metrics', {}).get('edge_count', 0)}
- Most connected modules: {', '.join(graph_data.get('metrics', {}).get('most_connected', [])[:5])}

Return a JSON object with:
{{
    "architecture_summary": "clear explanation of the overall architecture",
    "layers": [
        {{
            "name": "layer name (e.g., Presentation, Business Logic, Data)",
            "description": "what this layer does",
            "files": ["relevant files"],
            "responsibilities": ["responsibility 1", "responsibility 2"]
        }}
    ],
    "data_flow": "description of how data flows through the system",
    "external_dependencies": ["external service/API/DB it depends on"],
    "patterns_used": ["design patterns detected"],
    "strengths": ["architectural strengths"],
    "potential_improvements": ["areas that could be improved"]
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Failed to parse architecture JSON: {e}")
        return {"error": str(e)}


async def detect_workflows(
    routes: List[Dict],
    symbols_by_type: Dict,
    key_files: List[Dict],
) -> List[Dict]:
    """Detect and explain developer workflows from code."""

    route_summaries = "\n".join([
        f"- {r.get('name', '')} ({r.get('decorators', [])}): {r.get('file_path', '')}"
        for r in routes[:30]
    ])

    function_summaries = "\n".join([
        f"- {s.get('name', '')} in {s.get('file_path', '')}: calls {', '.join(s.get('calls', [])[:5])}"
        for s in symbols_by_type.get("function", [])[:40]
    ])

    prompt = f"""Analyze this codebase and identify the main developer workflows.

API Routes:
{route_summaries or 'No routes detected'}

Key Functions and their calls:
{function_summaries or 'No functions detected'}

Identify 3-6 key workflows like:
- Authentication/Login flow
- Registration/Signup flow
- Main business logic flow
- Data processing pipeline
- API request/response cycle

Return a JSON object with:
{{
    "workflows": [
        {{
            "id": "unique_id",
            "name": "Workflow Name",
            "description": "what this workflow does in plain English",
            "trigger": "what initiates this workflow (user action, API call, etc.)",
            "steps": [
                {{
                    "order": 1,
                    "name": "Step name",
                    "description": "what happens in this step",
                    "file_path": "relevant file path",
                    "function_name": "function name if applicable",
                    "type": "route|service|database|validation|external"
                }}
            ],
            "involved_files": ["list of files involved"],
            "complexity": "simple|medium|complex"
        }}
    ]
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    try:
        result = json.loads(response.choices[0].message.content)
        return result.get("workflows", [])
    except Exception as e:
        logger.error(f"Failed to parse workflows JSON: {e}")
        return []


async def generate_onboarding_docs(
    summary: Dict,
    architecture: Dict,
    workflows: List[Dict],
    repo_metadata: Dict,
) -> Dict:
    """Generate comprehensive developer onboarding documentation."""

    prompt = f"""Generate comprehensive developer onboarding documentation for this project.

Project: {summary.get('project_name', 'Unknown')}
Description: {summary.get('description', '')}
Tech Stack: {', '.join(summary.get('tech_stack', []))}
Architecture: {summary.get('architecture_pattern', '')}
Complexity: {summary.get('complexity_level', 'intermediate')}

Architecture Summary: {architecture.get('architecture_summary', '')}

Workflows: {', '.join(w.get('name', '') for w in workflows[:5])}

Return a JSON object with:
{{
    "onboarding_guide": "markdown-formatted complete onboarding guide (use ## headings, code blocks, etc.)",
    "architecture_overview": "markdown-formatted architecture overview",
    "setup_instructions": "markdown-formatted step-by-step setup instructions",
    "key_concepts": ["important concept to understand"],
    "glossary": {{"term": "definition"}},
    "first_week_tasks": ["task for new developer week 1"],
    "common_gotchas": ["common mistake or pitfall to avoid"]
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": prompt},
        ],
        temperature=0.3,
        response_format={"type": "json_object"},
        max_tokens=4000,
    )

    try:
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        logger.error(f"Failed to parse docs JSON: {e}")
        return {"error": str(e)}


# ─── Chat Function ─────────────────────────────────────────────────────────────

async def chat_with_codebase(
    question: str,
    relevant_chunks: List[Dict],
    chat_history: List[Dict],
    project_summary: Dict,
) -> Dict:
    """
    Answer a question about the codebase using RAG.
    Returns answer + sources + follow-up questions.
    """

    # Format code context from relevant chunks
    context_parts = []
    for i, chunk in enumerate(relevant_chunks[:8]):
        context_parts.append(
            f"--- Source {i+1}: {chunk.get('file_path', 'unknown')} "
            f"(lines {chunk.get('start_line', '?')}-{chunk.get('end_line', '?')}) ---\n"
            f"{chunk.get('content', '')[:800]}"
        )
    context = "\n\n".join(context_parts)

    # Format chat history (last 6 messages)
    history_messages = []
    for msg in chat_history[-6:]:
        history_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    system_prompt = f"""{SYSTEM_PROMPT_CHAT}

Project: {project_summary.get('project_name', 'Unknown')}
Description: {project_summary.get('description', '')}
Tech Stack: {', '.join(project_summary.get('tech_stack', [])[:5])}

Relevant code from the repository:
{context}

Instructions:
- Answer based on the provided code context
- Reference specific file paths when relevant
- If the code doesn't clearly answer the question, say what you found and what's uncertain
- Keep answers focused and developer-friendly"""

    messages = [{"role": "system", "content": system_prompt}]
    messages.extend(history_messages)
    messages.append({"role": "user", "content": question})

    response = await client.chat.completions.create(
        model=MODEL,
        messages=messages,
        temperature=0.3,
        max_tokens=2000,
    )

    answer = response.choices[0].message.content

    # Generate follow-up questions
    follow_up_response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {
                "role": "system",
                "content": "Generate 3 relevant follow-up questions a developer might ask after this Q&A about a codebase. Return JSON: {\"questions\": [\"q1\", \"q2\", \"q3\"]}"
            },
            {
                "role": "user",
                "content": f"Q: {question}\nA: {answer[:500]}"
            }
        ],
        temperature=0.5,
        response_format={"type": "json_object"},
        max_tokens=300,
    )

    try:
        follow_ups = json.loads(follow_up_response.choices[0].message.content).get("questions", [])
    except Exception:
        follow_ups = []

    return {
        "answer": answer,
        "follow_up_questions": follow_ups,
    }


# ─── LLM-Powered File Selection (replaces FAISS) ──────────────────────────────

async def select_relevant_files(
    question: str,
    symbols: List[Dict],
    max_files: int = 8,
) -> List[str]:
    """
    Use GPT to pick the most relevant files for a user question.
    Sends the symbol index (file paths + function/class names) and
    asks the LLM to select which files are most likely to answer the question.
    """
    # Build a compact symbol index: file_path -> [symbol_name (type)]
    file_index: Dict[str, List[str]] = {}
    for sym in symbols:
        fp = sym.get("file_path", "")
        name = sym.get("symbol_name") or sym.get("name", "")
        stype = sym.get("chunk_type") or sym.get("type", "")
        if fp:
            if fp not in file_index:
                file_index[fp] = []
            if name:
                file_index[fp].append(f"{name} ({stype})")

    if not file_index:
        return []

    # Format as compact text
    index_text = "\n".join(
        f"- {fp}: {', '.join(syms[:10])}"
        for fp, syms in sorted(file_index.items())
    )

    # Truncate if too long (stay well within context limits)
    if len(index_text) > 12000:
        index_text = index_text[:12000] + "\n... (truncated)"

    prompt = f"""Given this developer question about a codebase, select the {max_files} most relevant files from the index below.

Question: {question}

File index (file_path: symbols):
{index_text}

Return a JSON object with:
{{
    "files": ["path/to/file1.py", "path/to/file2.ts", ...]
}}

Only include files that are likely relevant to answering the question. Return at most {max_files} files."""

    try:
        response = await client.chat.completions.create(
            model=MODEL,
            messages=[
                {"role": "system", "content": "You are a code search assistant. Given a question and a file index, select the most relevant files. Return only valid JSON."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.1,
            response_format={"type": "json_object"},
            max_tokens=500,
        )
        result = json.loads(response.choices[0].message.content)
        return result.get("files", [])[:max_files]
    except Exception as e:
        logger.error(f"File selection failed: {e}")
        return []


async def explain_code(
    file_path: str,
    code_content: str,
    function_name: Optional[str] = None,
) -> Dict:
    """Explain a specific file or function."""

    target = f"function `{function_name}`" if function_name else f"file `{file_path}`"

    prompt = f"""Explain the following {target} to a developer who is new to this codebase.

File: {file_path}
{f'Function: {function_name}' if function_name else ''}

Code:
```
{code_content[:3000]}
```

Return JSON:
{{
    "purpose": "what this code does in one sentence",
    "detailed_explanation": "paragraph explaining how it works",
    "key_logic": ["key logic point 1", "key logic point 2"],
    "dependencies": ["what it depends on"],
    "side_effects": ["external effects: DB writes, API calls, etc."],
    "inputs": "what it expects as input",
    "outputs": "what it returns/produces",
    "potential_issues": ["things to watch out for"]
}}"""

    response = await client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT_ANALYST},
            {"role": "user", "content": prompt},
        ],
        temperature=0.2,
        response_format={"type": "json_object"},
    )

    try:
        return json.loads(response.choices[0].message.content)
    except Exception as e:
        return {"error": str(e)}
